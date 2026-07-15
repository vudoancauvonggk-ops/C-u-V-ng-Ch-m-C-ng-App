// Service Worker for handling Web Push Notifications
self.addEventListener('push', function(event) {
  let payload = { title: 'Cầu Vồng Chấm Công', message: 'Bạn có thông báo mới!' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'Cầu Vồng Chấm Công', message: event.data.text() };
    }
  }

  const options = {
    body: payload.message,
    icon: '/logo_cauvong.jpg',
    badge: '/logo_cauvong.jpg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
