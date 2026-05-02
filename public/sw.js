// BikeCare Tracker — Service Worker
// Handles Web Push (real OS notifications even when app is closed)
const APP_URL = self.location.origin;

// ─── Push Event: Triggered by server via web-push library ───────────────────
self.addEventListener('push', function (event) {
  console.log('[SW] Push received');

  let title = '🏍️ BikeCare Reminder';
  let body = 'You have a new update from BikeCare.';
  let icon = '/icon.png';
  let badge = '/icon.png';
  let url = APP_URL + '/dashboard';

  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) body = data.body;
      if (data.icon) icon = data.icon;
      if (data.url) url = data.url;
    } catch (_) {
      body = event.data.text() || body;
    }
  }

  // showNotification() → REAL OS notification in system notification center
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      image: icon,
      vibrate: [200, 100, 200],
      tag: 'bikecare-' + Date.now(), // Unique tag so each notification stacks
      requireInteraction: false,     // Auto-dismiss after OS timeout
      silent: false,                 // Play notification sound
      data: { url },
    })
  );
});

// ─── Notification Click: Opens the app ───────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || APP_URL + '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app tab is already open, focus it
      for (const client of windowClients) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── Activate: Take control immediately ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});
