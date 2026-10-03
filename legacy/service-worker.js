const CACHE_NAME = 'kvault-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Supabase API → network only (auth + data must be fresh)
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  // External CDN (fonts, icons lib) → network first, cache fallback
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell → cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(c =>
      c || fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return r;
      })
    )
  );
});

// ─── Notification Click Handler ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE_VIEW', view: 'habits' });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./?view=habits');
      }
    })
  );
});

// ─── Push Event Handler ───
self.addEventListener('push', (event) => {
  let data = { title: 'Knowledge Vault Habit Reminder', body: 'Time to check in on your daily habits!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  const options = {
    body: data.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: './?view=habits', ...data }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

