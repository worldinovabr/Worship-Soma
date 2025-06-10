const CACHE_NAME = 'worshipapp-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/Worship-Soma/',
  '/Worship-Soma/index.html',
  '/Worship-Soma/manifest.json',
  '/Worship-Soma/icon-512.png'
  // Adicione outros arquivos importantes do seu app aqui
];

// Instala e faz cache dos arquivos essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Ativa e remove caches antigos se necessário
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Intercepta requisições e serve do cache se possível
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
