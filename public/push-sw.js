// Push notification handlers — imported into the Workbox-generated /sw.js
// via vite-plugin-pwa's workbox.importScripts option.

const APP_ICON = "/__l5e/assets-v1/24cf1f1b-163f-4107-8c1f-5aed79ea28fc/logo-256.png";
const APP_BADGE = "/__l5e/assets-v1/65fc9e55-fcde-461a-9b03-ff8617170886/logo-64.png";

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
  event.waitUntil((async () => {
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
  })());
});
