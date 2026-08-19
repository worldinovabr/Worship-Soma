/*
 * Service Worker do Firebase Cloud Messaging.
 *
 * Evita notificações duplicadas e controla o clique.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function getScopedAssetUrl(assetPath) {
  const normalizedAssetPath = assetPath.startsWith('/')
    ? assetPath.slice(1)
    : assetPath;

  return new URL(normalizedAssetPath, self.registration.scope).href;
}

function getNotificationUrl(data = {}) {
  const fcmMessage = data.FCM_MSG || {};
  const fcmData = fcmMessage.data || {};

  const rawUrl =
    data.url ||
    data.click_action ||
    data.link ||
    fcmData.url ||
    fcmData.click_action ||
    fcmData.link ||
    fcmMessage.fcmOptions?.link ||
    fcmMessage.notification?.click_action ||
    self.registration.scope;

  try {
    return new URL(rawUrl, self.registration.scope).href;
  } catch (error) {
    return self.registration.scope;
  }
}

/*
 * Precisa ficar antes dos importScripts do Firebase para que o Firebase
 * não substitua o comportamento do clique.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (typeof event.stopImmediatePropagation === 'function') {
    event.stopImmediatePropagation();
  }

  const url = getNotificationUrl(event.notification.data || {});

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of clientList) {
      try {
        if ('navigate' in client) {
          await client.navigate(url);
        }
      } catch (error) {
        // Se não conseguir navegar, ainda tentará abrir a janela existente.
      }

      client.postMessage({
        type: 'WORSHIP_NOTIFICATION_CLICK',
        url,
      });

      if ('focus' in client) {
        return client.focus();
      }
    }

    return clients.openWindow(url);
  })());
});

importScripts(
  'https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js'
);

importScripts(
  'https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js'
);

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

function getBadgeCount() {
  return caches.open('worship-badge').then((cache) => (
    cache.match('/badge-count').then((response) => (
      response
        ? response.text().then((text) => Number(text) || 0)
        : 0
    ))
  ));
}

function saveBadgeCount(count) {
  return caches.open('worship-badge').then((cache) => (
    cache.put(
      '/badge-count',
      new Response(String(Math.max(0, count)))
    )
  ));
}

function updateAppBadge(count) {
  return saveBadgeCount(count)
    .then(() => {
      if (
        !('setAppBadge' in navigator) ||
        !('clearAppBadge' in navigator)
      ) {
        return undefined;
      }

      if (count > 0) {
        return navigator.setAppBadge(count);
      }

      return navigator.clearAppBadge();
    })
    .catch(() => undefined);
}

function incrementAppBadge() {
  return getBadgeCount().then((count) => updateAppBadge(count + 1));
}

messaging.onBackgroundMessage((payload) => {
  const badgePromise = incrementAppBadge();

  /*
   * Quando existe payload.notification, o Firebase já mostra a
   * notificação automaticamente. Não devemos chamar showNotification()
   * novamente, pois isso gera a notificação duplicada.
   */
  if (payload.notification) {
    return badgePromise;
  }

  /*
   * Mensagem somente com data:
   * neste caso o Service Worker precisa mostrar a notificação.
   */
  const data = payload.data || {};
  const title = data.title || 'WorshipApp';
  const body = data.body || '';
  const url = getNotificationUrl(data);

  const options = {
    body,
    icon: data.icon || getScopedAssetUrl('/icon-512.png'),
    badge: data.badge || getScopedAssetUrl('/favicon-32.png'),
    tag: data.tag || 'worship-notification',
    renotify: true,
    data: {
      ...data,
      url,
    },
  };

  return Promise.all([
    badgePromise,
    self.registration.showNotification(title, options),
  ]);
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_BADGE_COUNT') {
    event.waitUntil(
      updateAppBadge(Number(event.data.count) || 0)
    );
  }
});