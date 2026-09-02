const APP_ICON = "/__l5e/assets-v1/24cf1f1b-163f-4107-8c1f-5aed79ea28fc/logo-256.png";
const APP_BADGE = "/__l5e/assets-v1/65fc9e55-fcde-461a-9b03-ff8617170886/logo-64.png";
const VAPID_PUBLIC_KEY = "BHFzPpiSJBKk1OYCSIoxgwsjbBuGUsftLmhFcmvcAyl4EBtYK7DKp2QdLBuMS-4I8Z0-oqxYB66nPWs01hzZnIs";
const REGISTER_PUSH_URL = "https://ewquysvcjuqdkfieeuxd.supabase.co/functions/v1/register-push";

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Liên Minh Liên Doanh", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Liên Minh Liên Doanh";
  const options = {
    body: data.body || "",
    icon: APP_ICON,
    badge: APP_BADGE,
    data: { url: data.url || "/" },
    tag: data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            await client.focus();
            if ("navigate" in client) await client.navigate(targetUrl);
            return;
          }
        } catch {}
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })(),
  );
});

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

self.addEventListener("pushsubscriptionchange", (event) => {
  const oldEndpoint = event.oldSubscription && event.oldSubscription.endpoint;

  event.waitUntil(
    (async () => {
      try {
        let sub = event.newSubscription;
        if (!sub) {
          sub = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        const json = sub.toJSON();
        const p256dh = json.keys && json.keys.p256dh;
        const auth = json.keys && json.keys.auth;
        if (!json.endpoint || !p256dh || !auth) return;

        await fetch(REGISTER_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            p256dh,
            auth,
            oldEndpoint: oldEndpoint || undefined,
          }),
        });
      } catch {}
    })(),
  );
});
