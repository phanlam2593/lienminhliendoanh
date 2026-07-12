/**
 * Guarded PWA service worker registration + Web Push subscription.
 * Never registers in dev, iframe, or Lovable preview hosts.
 * Supports ?sw=off kill switch.
 */
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SW_URL = "/sw.js";
const VAPID_PUBLIC_KEY = "BHFzPpiSJBKk1OYCSIoxgwsjbBuGUsftLmhFcmvcAyl4EBtYK7DKp2QdLBuMS-4I8Z0-oqxYB66nPWs01hzZnIs";
const PUSH_ASK_KEY = "lmld:push-asked";

// ===== Trạng thái cập nhật PWA (chấm đỏ/xanh) =====
// "current" = đã ở bản mới nhất · "available" = có bản mới đã tải xong, sẵn sàng áp dụng.
export type UpdateStatus = "checking" | "current" | "available";
let updateStatus: UpdateStatus = "checking";
let swRegistration: ServiceWorkerRegistration | null = null;
const UPDATE_STATUS_EVENT = "lmld:update-status";

function setUpdateStatus(status: UpdateStatus) {
  updateStatus = status;
  window.dispatchEvent(new CustomEvent(UPDATE_STATUS_EVENT, { detail: status }));
}

export function getUpdateStatus(): UpdateStatus {
  return updateStatus;
}

export function onUpdateStatusChange(cb: (status: UpdateStatus) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent).detail as UpdateStatus);
  window.addEventListener(UPDATE_STATUS_EVENT, handler);
  return () => window.removeEventListener(UPDATE_STATUS_EVENT, handler);
}

// Người dùng bấm chấm đỏ → báo cho SW đang "waiting" kích hoạt ngay.
// Việc reload trang thật sự diễn ra ở sự kiện "controllerchange" bên dưới (chỉ 1 lần).
export function applyUpdate() {
  if (!swRegistration?.waiting) return;
  swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
}

function isPreviewHost(hostname: string): boolean {
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  const previewSuffixes = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  return previewSuffixes.some((s) => hostname === s || hostname.endsWith("." + s));
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

async function setupPush(registration: ServiceWorkerRegistration): Promise<{ ok: boolean; message?: string }> {
  try {
    if (!("PushManager" in window) || !("Notification" in window))
      return { ok: false, message: "Trình duyệt không hỗ trợ push" };
    if (Notification.permission !== "granted") return { ok: false, message: "Chưa cấp quyền thông báo" };

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return { ok: false, message: "Chưa đăng nhập" };

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    const json = sub.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!json.endpoint || !p256dh || !auth) return { ok: false, message: "Subscription thiếu p256dh/auth" };

    const { error: fnError } = await supabase.functions.invoke("register-push", {
      body: { endpoint: json.endpoint, p256dh, auth },
    });
    if (fnError) return { ok: false, message: fnError.message || String(fnError) };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

// Cờ chặn — khi popup Welcome đang mở, KHÔNG được xin quyền push / hiện banner cài app.
// Được set bởi WelcomeOnboarding. Khi đóng popup sẽ dispatch event "lmld:welcome-done".
export const WELCOME_ACTIVE_KEY = "lmld:welcome-active";
export function setWelcomeActive(active: boolean) {
  try {
    if (active) localStorage.setItem(WELCOME_ACTIVE_KEY, "1");
    else {
      localStorage.removeItem(WELCOME_ACTIVE_KEY);
      window.dispatchEvent(new Event("lmld:welcome-done"));
    }
  } catch {}
}

function isWelcomeActive() {
  try {
    return localStorage.getItem(WELCOME_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}
function whenWelcomeDone(): Promise<void> {
  if (!isWelcomeActive()) return Promise.resolve();
  return new Promise((resolve) => {
    const h = () => {
      window.removeEventListener("lmld:welcome-done", h);
      resolve();
    };
    window.addEventListener("lmld:welcome-done", h);
  });
}

// Tự động xin quyền push 1 lần duy nhất sau khi có phiên đăng nhập hợp lệ.
// Không gọi ngay lúc load trang — chỉ chạy sau tương tác đầu tiên của người dùng
// (bắt buộc trên iOS Safari, vốn yêu cầu 1 cú tap thật mới cho phép hiện popup quyền).
function scheduleAutoAsk() {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (localStorage.getItem(PUSH_ASK_KEY)) return; // đã từng hỏi rồi, không hỏi lại
  if (Notification.permission !== "default") return; // đã granted hoặc denied rồi thì thôi

  const ask = async () => {
    if (localStorage.getItem(PUSH_ASK_KEY)) return;
    await whenWelcomeDone(); // chờ welcome popup đóng xong mới hỏi
    if (localStorage.getItem(PUSH_ASK_KEY)) return;
    localStorage.setItem(PUSH_ASK_KEY, "1");
    await requestPushPermission();
  };

  window.addEventListener("pointerdown", ask, { once: true });
}

export function registerPwa() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  const url = new URL(window.location.href);
  const killed = url.searchParams.get("sw") === "off";
  const isDev = !import.meta.env.PROD;
  const preview = isPreviewHost(window.location.hostname);

  if (isDev || inIframe || preview || killed) {
    void unregisterMatching();
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, { updateViaCache: "none" });

      // === Tự động cập nhật bản mới ===
      // 1) Chủ động kiểm tra bản mới: ngay khi mở app, mỗi khi quay lại app, và mỗi 15 phút
      const checkUpdate = () => registration.update().catch(() => {});
      checkUpdate();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkUpdate();
      });
      setInterval(checkUpdate, 15 * 60 * 1000);

      // 2) Khi SW mới nắm quyền (skipWaiting đã bật sẵn) → tự reload 1 lần để chạy code mới
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });

      // Wait until active, then attempt push subscribe (idempotent).
      const ready = await navigator.serviceWorker.ready;
      await setupPush(ready ?? registration);

      // Re-attempt on auth changes so new sign-ins can subscribe too.
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const reg = await navigator.serviceWorker.ready;
          await setupPush(reg);
          scheduleAutoAsk();
        }
      });
    } catch {}
  });
}
// ===== Install prompt (Add to Home Screen) =====
const INSTALL_DISMISS_KEY = "lmld:install-dismissed-at";
let deferredInstallPrompt: any = null;

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}

function shouldShowInstallBanner(): boolean {
  if (isStandalone()) return false;
  const dismissedAt = localStorage.getItem(INSTALL_DISMISS_KEY);
  if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return false;
  return true;
}

export function initInstallPrompt(onShow: (canPromptNative: boolean) => void) {
  if (typeof window === "undefined") return;
  if (!shouldShowInstallBanner()) return;

  const guardedShow = async (canPrompt: boolean) => {
    await whenWelcomeDone();
    if (!shouldShowInstallBanner()) return;
    onShow(canPrompt);
  };

  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    void guardedShow(true);
  });

  // iOS doesn't fire beforeinstallprompt — show banner anyway after a short delay
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !isStandalone()) {
    setTimeout(() => void guardedShow(false), 2000);
  }
}

export async function triggerInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return outcome === "accepted";
}

export function dismissInstallBanner() {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
  } catch {}
}

export async function requestPushPermission(): Promise<"granted" | "denied" | "unsupported"> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm === "granted") {
    const reg = await navigator.serviceWorker.ready;
    const result = await setupPush(reg);
    if (!result.ok) {
      toast.error("Lỗi bật thông báo đẩy: " + result.message);
    } else {
      toast.success("Đã đăng ký nhận thông báo đẩy thành công");
    }
  }
  return perm === "granted" ? "granted" : "denied";
}

// Gọi khi người dùng kéo xuống để refresh — luôn reload để chắc chắn lấy bản mới nhất.
export async function forceRefreshCheck(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    window.location.reload();
    return;
  }
  try {
    // Ép tải hẳn file sw.js mới, bỏ qua cache trình duyệt, để chắc chắn so sánh đúng bản mới nhất
    await fetch("/sw.js", { cache: "no-store" });
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.update();
  } catch {}
  window.location.reload();
}
