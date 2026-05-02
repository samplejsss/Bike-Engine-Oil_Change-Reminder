self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: '2'
        },
        actions: [
          {action: 'explore', title: 'Open App', icon: '/icon.png'},
          {action: 'close', title: 'Close', icon: '/icon.png'},
        ]
      };
      event.waitUntil(
        self.registration.showNotification(data.title || 'BikeCare Update', options)
      );
    } catch(e) {
      // Not JSON, just show text
      event.waitUntil(
        self.registration.showNotification('BikeCare Update', { body: event.data.text(), icon: '/icon.png' })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then( windowClients => {
        // Check if there is already a window/tab open with the target URL
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          // If so, just focus it.
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, then open the target URL in a new window/tab.
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
