const CACHE = 'veloxspace-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  if (e.request.url.includes('/api/')) return;
  if (e.request.url.includes('supabase.co')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
