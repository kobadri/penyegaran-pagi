/* Service worker Penyegaran Pagi - edisi segar ZAI.
   Strategi: "jaringan dulu" - setiap kali online, halaman & data SELALU
   diambil yang terbaru; cache hanya dipakai saat offline.
   Nama cache dinaikkan ke pp-zai-v2 supaya versi lama otomatis dibuang. */
var PP_CACHE = 'pp-zai-v2';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (daftar) {
      return Promise.all(
        daftar.filter(function (k) { return k !== PP_CACHE; })
              .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.ok) {
        var salin = res.clone();
        caches.open(PP_CACHE).then(function (c) { c.put(e.request, salin); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (r) {
        return r || Response.error();
      });
    })
  );
});
