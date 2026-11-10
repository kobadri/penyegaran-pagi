/* Service worker Penyegaran Pagi.
   Cache inti aplikasi dipisahkan dari cache materi dua pekan.
   Materi lama hanya dihapus dari Cache Storage perangkat, bukan dari GitHub. */
"use strict";

var PP_SHELL_CACHE = "pp-shell-v4";
var PP_CONTENT_CACHE = "pp-content-v4";
var PP_SCOPE = self.registration.scope;

function urlAbsolut(path) { return new URL(path, PP_SCOPE).href; }
function urlMateri(url) {
    return url.origin === self.location.origin &&
        url.href.indexOf(PP_SCOPE) === 0 &&
        (url.pathname.indexOf("/data/teks/") !== -1 ||
         url.pathname.indexOf("/data/berita_mingguan/") !== -1);
}

self.addEventListener("install", function (event) {
    event.waitUntil((async function () {
        var cache = await caches.open(PP_SHELL_CACHE);
        var shell = ["./", "index.html", "app.js", "pp-konfigurasi.js", "manifest.json",
            "assets/favicon.png", "assets/apple-touch-icon.png", "assets/icon-192.png",
            "assets/icon-512.png", "assets/icon-192-maskable.png", "assets/icon-512-maskable.png",
            "assets/css/reader.css"];
        for (var i = 0; i < shell.length; i++) {
            try {
                var u = urlAbsolut(shell[i]);
                var response = await fetch(u);
                if (response && response.ok) await cache.put(u, response);
            } catch (e) {}
        }
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", function (event) {
    event.waitUntil((async function () {
        var keys = await caches.keys();
        var shellCache = await caches.open(PP_SHELL_CACHE);

        /* Salin hanya berkas inti aplikasi dari cache lama. Materi lama
           tetap berada di cache asal sampai dua pekan baru berhasil diunduh. */
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (key === PP_SHELL_CACHE || key === PP_CONTENT_CACHE ||
                !(key.indexOf("pp-zai-") === 0 || key.indexOf("pp-shell-") === 0 ||
                  key.indexOf("pp-content-") === 0)) continue;
            var oldCache = await caches.open(key);
            var requests = await oldCache.keys();
            for (var j = 0; j < requests.length; j++) {
                var oldUrl = new URL(requests[j].url);
                if (urlMateri(oldUrl)) continue;
                var oldResponse = await oldCache.match(requests[j]);
                if (oldResponse && !await shellCache.match(requests[j])) {
                    await shellCache.put(requests[j], oldResponse);
                }
            }
        }
        await self.clients.claim();
    })());
});

function responsRentang(response, headerRange) {
    return response.arrayBuffer().then(function (buffer) {
        var size = buffer.byteLength;
        var match = /^bytes=(\d*)-(\d*)$/i.exec(headerRange || "");
        if (!match || !size) return response;
        var start = match[1] ? parseInt(match[1], 10) : null;
        var end = match[2] ? parseInt(match[2], 10) : null;
        if (start === null) {
            var suffix = end || 0;
            if (!suffix) return new Response(null, {status:416, headers:{"Content-Range":"bytes */" + size}});
            start = Math.max(size - suffix, 0);
            end = size - 1;
        } else {
            end = end === null ? size - 1 : Math.min(end, size - 1);
        }
        if (start >= size || start > end) {
            return new Response(null, {status:416, headers:{"Content-Range":"bytes */" + size}});
        }
        var headers = new Headers(response.headers);
        headers.set("Content-Range", "bytes " + start + "-" + end + "/" + size);
        headers.set("Content-Length", String(end - start + 1));
        headers.set("Accept-Ranges", "bytes");
        return new Response(buffer.slice(start, end + 1), {
            status:206, statusText:"Partial Content", headers:headers
        });
    });
}

self.addEventListener("fetch", function (event) {
    var request = event.request;
    if (request.method !== "GET") return;
    var url = new URL(request.url);
    if (url.origin !== self.location.origin || url.href.indexOf(PP_SCOPE) !== 0) return;

    if (urlMateri(url)) {
        event.respondWith((async function () {
            var cache = await caches.open(PP_CONTENT_CACHE);
            var lookup = new Request(url.href);
            var saved = await cache.match(lookup);
            /* Cache lama tetap menjadi jaring pengaman sampai sinkronisasi baru sukses. */
            if (!saved) {
                var oldKeys = await caches.keys();
                for (var i = 0; i < oldKeys.length && !saved; i++) {
                    if (oldKeys[i] === PP_SHELL_CACHE || oldKeys[i] === PP_CONTENT_CACHE) continue;
                    if (oldKeys[i].indexOf("pp-zai-") !== 0 && oldKeys[i].indexOf("pp-content-") !== 0) continue;
                    var oldCache = await caches.open(oldKeys[i]);
                    saved = await oldCache.match(lookup);
                }
            }
            try {
                var network = await fetch(request);
                if (network && network.ok) return network;
            } catch (e) {}
            if (saved && request.headers.has("Range")) {
                return responsRentang(saved.clone(), request.headers.get("Range"));
            }
            return saved || Response.error();
        })());
        return;
    }

    event.respondWith((async function () {
        var cache = await caches.open(PP_SHELL_CACHE);
        try {
            var response = await fetch(request);
            if (response && response.ok) cache.put(request, response.clone()).catch(function () {});
            return response;
        } catch (e) {
            var fallback = await cache.match(request, {ignoreSearch:true});
            if (!fallback && request.mode === "navigate") fallback = await cache.match(urlAbsolut("index.html"));
            return fallback || Response.error();
        }
    })());
});

async function beriStatus(data) {
    var clients = await self.clients.matchAll({type:"window", includeUncontrolled:true});
    clients.forEach(function (client) { client.postMessage(data); });
}

self.addEventListener("message", function (event) {
    var message = event.data || {};
    if (message.jenis !== "SINKRON_PEKAN" || !Array.isArray(message.urls)) return;
    event.waitUntil((async function () {
        var cache = await caches.open(PP_CONTENT_CACHE);
        var urls = message.urls.map(function (value) {
            try { return new URL(value, PP_SCOPE); } catch (e) { return null; }
        }).filter(function (url) { return url && urlMateri(url); })
          .map(function (url) { return url.href; });
        var allowed = new Set(urls);
        var currentKeys = await cache.keys();

        /* Bila tidak ada pekan aktif, bersihkan seluruh cache materi lama. */
        if (!urls.length) {
            for (var z = 0; z < currentKeys.length; z++) await cache.delete(currentKeys[z]);
            var oldCaches = await caches.keys();
            for (var q = 0; q < oldCaches.length; q++) {
                if (oldCaches[q] !== PP_SHELL_CACHE && oldCaches[q] !== PP_CONTENT_CACHE &&
                    (oldCaches[q].indexOf("pp-zai-") === 0 || oldCaches[q].indexOf("pp-content-") === 0)) {
                    await caches.delete(oldCaches[q]);
                }
            }
            await beriStatus({jenis:"SINKRON_PEKAN_SELESAI", sukses:true, pekanAktif:0, tersimpan:0, gagal:0, total:0});
            return;
        }

        var missing = [];
        var required = 0;
        for (var i = 0; i < urls.length; i++) {
            if (await cache.match(urls[i])) continue;
            missing.push(urls[i]);
            if (/\.(m4a|mp3|mp4)(?:$|\?)/i.test(urls[i])) {
                try {
                    var head = await fetch(urls[i], {method:"HEAD"});
                    var bytes = parseInt(head.headers.get("Content-Length") || "0", 10);
                    if (bytes > 0) required += bytes;
                } catch (e) {}
            }
        }

        try {
            if (required > 0 && self.navigator.storage && self.navigator.storage.estimate) {
                var estimate = await self.navigator.storage.estimate();
                var free = (estimate.quota || 0) - (estimate.usage || 0);
                if (free > 0 && free < Math.ceil(required * 1.15)) {
                    await beriStatus({jenis:"SINKRON_PEKAN_SELESAI", sukses:false,
                        alasan:"ruang-tidak-cukup", perlu:required, bebas:free});
                    return;
                }
            }
        } catch (e) {}

        var downloaded = 0;
        var failed = 0;
        for (var j = 0; j < missing.length; j++) {
            try {
                var response = await fetch(missing[j], {cache:"no-store"});
                if (!response || !response.ok) throw new Error("HTTP " + (response && response.status));
                await cache.put(missing[j], response);
                downloaded++;
            } catch (e) {
                failed++;
                break;
            }
        }

        /* Hapus pekan yang kedaluwarsa hanya setelah daftar dua pekan
           berhasil dilengkapi. Jika unduhan gagal, cache lama tetap aman. */
        if (failed === 0) {
            var keys = await cache.keys();
            for (var k = 0; k < keys.length; k++) {
                if (!allowed.has(keys[k].url)) await cache.delete(keys[k]);
            }
            /* Setelah dua pekan baru lengkap, barulah cache generasi lama dibuang. */
            var oldCachesAfterSync = await caches.keys();
            for (var n = 0; n < oldCachesAfterSync.length; n++) {
                if (oldCachesAfterSync[n] !== PP_SHELL_CACHE && oldCachesAfterSync[n] !== PP_CONTENT_CACHE &&
                    (oldCachesAfterSync[n].indexOf("pp-zai-") === 0 || oldCachesAfterSync[n].indexOf("pp-content-") === 0)) {
                    await caches.delete(oldCachesAfterSync[n]);
                }
            }
        }

        await beriStatus({jenis:"SINKRON_PEKAN_SELESAI", sukses:failed === 0,
            pekanAktif:message.pekanAktif || 0, tersimpan:downloaded,
            gagal:failed, total:missing.length});
    })());
});
