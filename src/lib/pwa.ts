/**
 * Guarded PWA service worker registration.
 * Never registers in dev, iframe, or Lovable preview hosts.
 * Supports ?sw=off kill switch.
 */
const SW_URL = "/sw.js";

function isPreviewHost(hostname: string): boolean {
  if (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--")
  ) return true;
  const previewSuffixes = [
    "lovableproject.com",
    "lovableproject-dev.com",
    "beta.lovable.dev",
  ];
  return previewSuffixes.some(
    (s) => hostname === s || hostname.endsWith("." + s),
  );
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

export function registerPwa() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const url = new URL(window.location.href);
  const killed = url.searchParams.get("sw") === "off";
  const isDev = !import.meta.env.PROD;
  const preview = isPreviewHost(window.location.hostname);

  if (isDev || inIframe || preview || killed) {
    void unregisterMatching();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch(() => {});
  });
}
