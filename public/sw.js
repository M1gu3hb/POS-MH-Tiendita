/* eslint-disable no-restricted-globals */
// Service Worker — POS MH Tiendita (modo offline básico).
// - Precachea el shell ('/', '/venta', '/login') en la instalación.
// - Cache First para assets estáticos del bundle (/_next/static y archivos JS/CSS/img).
// - Network First con fallback a cache para navegaciones/páginas.
// - NO intercepta Supabase ni /api/* (la persistencia offline la maneja IndexedDB).
// - Se actualiza solo: skipWaiting + clients.claim y limpieza de caches viejos.

const CACHE_VERSION = 'pos-mh-offline-v1';
const CORE_ASSETS = ['/', '/venta', '/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isSupabaseRequest(url) {
  return (
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('.supabase.in') ||
    url.pathname.startsWith('/rest/v1') ||
    url.pathname.startsWith('/auth/v1') ||
    url.pathname.startsWith('/realtime/v1') ||
    url.pathname.startsWith('/storage/v1')
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|webp|gif|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // POST/PUT/DELETE van directo a la red

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // No interceptar otros orígenes, Supabase, ni las API routes internas.
  if (url.origin !== self.location.origin || isSupabaseRequest(url) || url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache First para assets estáticos.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        });
      }),
    );
    return;
  }

  // Network First con fallback a cache para navegaciones / HTML.
  const acceptsHtml = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (acceptsHtml) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/venta'))),
    );
  }
});
