// VeloxSpace Service Worker - minimal, no fetch interception
const CACHE = 'veloxspace-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
  // Clear old caches
  caches.keys().then(keys => keys.forEach(k => k !== CACHE && caches.delete(k)));
});

// Do NOT intercept fetches - let browser handle everything normally
// This prevents the sw.js TypeError that was blocking API calls
