// Service worker del Cotizador SUINELECTRIC: permite abrir la app sin internet.
const CACHE = 'cotizador-v1';
const APP = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(APP);
    await Promise.all(LIBS.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Catálogo de GitHub y nube de Google: siempre los maneja la app, sin caché aquí
  if (url.hostname.includes('githubusercontent') || url.hostname.includes('script.google')) return;

  // La app: primero internet (para recibir actualizaciones), si no hay, la copia guardada
  if (req.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Librerías, fuentes y logo: primero la copia guardada
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
