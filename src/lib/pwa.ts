/**
 * Guarded PWA service worker registration + Web Push subscription.
 * Never registers in dev, iframe, or Lovable preview hosts.
 * Supports ?sw=off kill switch.
 */
import { supabase } from "@/integrations/supabase/client";

const SW_URL = "/sw.js";
const VAPID_PUBLIC_KEY = "BHFzPpiSJBKk1OYCSIoxgwsjbBuGUsftLmhFcmvcAyl4EBtYK7DKp2QdLBuMS-4I8Z0-oqxYB66nPWs01hzZnIs";
const PUSH_ASK_KEY = "lmld:push-asked";

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

async function setupPush(registration: ServiceWorkerRegistration) {
  try {
    if (!("PushManager" in window) || !("Notification" in window)) return;

    // Only ask once. Respect the user's prior decision.
    if (Notification.permission === "denied") return;
    if (Notification.permission === "default") {
      if (localStorage.getItem(PUSH_ASK_KEY)) return;
      localStorage.setItem(PUSH_ASK_KEY, "1");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

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
    if (!json.endpoint || !p256dh || !auth) return;

    await supabase
      .from("push_subscriptions")
      .upsert({ user_id: user.id, endpoint: json.endpoint, p256dh, auth }, { onConflict: "endpoint" });
  } catch (e) {
    // Silent — push is best-effort
    console.warn("[push] setup failed", e);
  }
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
      const registration = await navigator.serviceWorker.register(SW_URL);
      // Wait until active, then attempt push subscribe (idempotent).
      const ready = await navigator.serviceWorker.ready;
      await setupPush(ready ?? registration);

      // Re-attempt on auth changes so new sign-ins can subscribe too.
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const reg = await navigator.serviceWorker.ready;
          await setupPush(reg);
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

  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    onShow(true);
  });

  // iOS doesn't fire beforeinstallprompt — show banner anyway after a short delay
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !isStandalone()) {
    setTimeout(() => onShow(false), 2000);
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
  localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
}
