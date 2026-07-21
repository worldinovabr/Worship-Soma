importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDdF-FLm64uCpdZ0UFHrV50cdgkO9RTi1E',
  authDomain: 'worship-8e304.firebaseapp.com',
  databaseURL: 'https://worship-8e304-default-rtdb.firebaseio.com',
  projectId: 'worship-8e304',
  storageBucket: 'worship-8e304.firebasestorage.app',
  messagingSenderId: '219441831339',
  appId: '1:219441831339:web:e36d2d036a426e48c286ee',
  measurementId: 'G-D8WPC573FR',
});

const messaging = firebase.messaging();

function getScopedAssetUrl(assetPath) {
  const normalizedAssetPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return new URL(normalizedAssetPath, self.registration.scope).href;
}

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'WorshipApp';
  const options = {
    body: payload.notification?.body,
    icon: getScopedAssetUrl('/icon-512.png'),
    badge: getScopedAssetUrl('/favicon-32.png'),
    tag: payload.data?.tag || 'worship-notification',
    renotify: true,
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (error) {
    payload = {
      title: 'WorshipApp',
      body: event.data.text(),
    };
  }

  if (!payload.title && !payload.body) return;

  const title = payload.title || 'WorshipApp';
  const options = {
    body: payload.body,
    icon: payload.icon || getScopedAssetUrl('/icon-512.png'),
    badge: payload.badge || getScopedAssetUrl('/favicon-32.png'),
    tag: payload.tag || 'worship-notification',
    renotify: true,
    data: {
      url: payload.url || self.registration.scope,
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      return clients.openWindow(url);
    })
  );
});
