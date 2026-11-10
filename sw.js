/* Service worker Penyegaran Pagi - offline dua pekan.
   Cache konten hanya menyimpan Pekan Ini + Pekan Lalu.
   Pembersihan hanya menyentuh Cache Storage perangkat. */
"use strict";
var PP_SHELL_CACHE = "pp-shell-v3";
var PP_CONTENT_CACHE = "pp-content-v3";
var PP_SCOPE = self.registration.scope;
function urlAbsolut(path) { return new URL(path, PP_SCOPE).href; }

self.addEventListener("install", function (event) {
    event.waitUntil((async function () {
        var cache = await caches.open(PP_SHELL_CACHE);
        var shell = ["./","index.html","app.js","pp-konfigurasi.js","manifest.json",
            "assets/favicon.png","assets/apple-touch-icon.png","assets/icon-192.png",
            "assets/icon-512.png","assets/icon-192-maskable.png","assets/icon-512-maskable.png",
            "assets/css/reader.css"];
        for (var i=0;i<shell.length;i++) {
            try { var u=urlAbsolut(shell[i]); var r=await fetch(u); if(r&&r.ok) await cache.put(u,r); } catch(e) {}
        }
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", function (event) {
    event.waitUntil((async function () {
        var keys=await caches.keys();
        await Promise.all(keys.map(function(k) {
            if ((k.indexOf("pp-zai-")===0 || k.indexOf("pp-shell-")===0 || k.indexOf("pp-content-")===0) &&
                k!==PP_SHELL_CACHE && k!==PP_CONTENT_CACHE) return caches.delete(k);
            return Promise.resolve(false);
        }));
        await self.clients.claim();
    })());
});

function responsRentang(response, headerRange) {
    return response.arrayBuffer().then(function(buffer) {
        var size=buffer.byteLength, m=/^bytes=(\d*)-(\d*)$/i.exec(headerRange||"");
        if(!m||!size) return response;
        var start=m[1]?parseInt(m[1],10):null, end=m[2]?parseInt(m[2],10):null;
        if(start===null){var suffix=end||0;start=Math.max(size-suffix,0);end=size-1;}
        else end=end===null?size-1:Math.min(end,size-1);
        if(start>=size||start>end) return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+size}});
        var h=new Headers(response.headers);
        h.set("Content-Range","bytes "+start+"-"+end+"/"+size);
        h.set("Content-Length",String(end-start+1)); h.set("Accept-Ranges","bytes");
        return new Response(buffer.slice(start,end+1),{status:206,statusText:"Partial Content",headers:h});
    });
}

self.addEventListener("fetch", function(event) {
    var req=event.request;
    if(req.method!=="GET") return;
    var u=new URL(req.url);
    if(u.origin!==self.location.origin||u.href.indexOf(PP_SCOPE)!==0) return;
    var teks=u.pathname.indexOf("/data/teks/")!==-1;
    var media=u.pathname.indexOf("/data/berita_mingguan/")!==-1;
    if(teks||media) {
        event.respondWith((async function() {
            var c=await caches.open(PP_CONTENT_CACHE), key=new Request(u.href,{method:"GET"});
            var saved=await c.match(key), range=req.headers.get("Range");
            if(media&&range&&saved) return responsRentang(saved.clone(),range);
            if(media&&saved) return saved;
            try { var net=await fetch(req); if(net&&net.ok) return net; } catch(e) {}
            return saved||Response.error();
        })());
        return;
    }
    event.respondWith((async function() {
        var c=await caches.open(PP_SHELL_CACHE);
        try { var r=await fetch(req); if(r&&r.ok) c.put(req,r.clone()).catch(function(){}); return r; }
        catch(e) {
            var fallback=await c.match(req,{ignoreSearch:true});
            if(!fallback&&req.mode==="navigate") fallback=await c.match(urlAbsolut("index.html"));
            return fallback||Response.error();
        }
    })());
});

async function beriStatus(data) {
    var clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    clients.forEach(function(client){client.postMessage(data);});
}

self.addEventListener("message", function(event) {
    var msg=event.data||{};
    if(msg.jenis!=="SINKRON_PEKAN"||!Array.isArray(msg.urls)) return;
    event.waitUntil((async function() {
        var cache=await caches.open(PP_CONTENT_CACHE);
        var urls=msg.urls.map(function(u){return new URL(u,PP_SCOPE).href;});
        var allowed=new Set(urls), old=await cache.keys();
        for(var i=0;i<old.length;i++) if(!allowed.has(old[i].url)) await cache.delete(old[i]);

        var missing=[], required=0;
        for(var j=0;j<urls.length;j++) {
            if(await cache.match(urls[j])) continue;
            missing.push(urls[j]);
            if(/\.(m4a|mp3|mp4)(?:$|\?)/i.test(urls[j])) {
                try {
                    var h=await fetch(urls[j],{method:"HEAD"});
                    var n=parseInt(h.headers.get("Content-Length")||"0",10);
                    if(n>0) required+=n;
                } catch(e) {}
            }
        }
        try {
            if(required>0&&self.navigator.storage&&self.navigator.storage.estimate) {
                var est=await self.navigator.storage.estimate();
                var free=(est.quota||0)-(est.usage||0);
                if(free>0&&free<Math.ceil(required*1.15)) {
                    await beriStatus({jenis:"SINKRON_PEKAN_SELESAI",sukses:false,alasan:"ruang-tidak-cukup",perlu:required,bebas:free});
                    return;
                }
            }
        } catch(e) {}

        var ok=0, fail=0;
        for(var k=0;k<missing.length;k++) {
            try {
                var response=await fetch(missing[k],{cache:"no-store"});
                if(!response||!response.ok) throw new Error("HTTP "+(response&&response.status));
                await cache.put(missing[k],response); ok++;
            } catch(e) {
                fail++;
                if(e&&(e.name==="QuotaExceededError"||/quota|storage/i.test(e.message||""))) break;
            }
        }
        await beriStatus({jenis:"SINKRON_PEKAN_SELESAI",sukses:fail===0,pekanAktif:msg.pekanAktif||null,tersimpan:ok,gagal:fail,total:missing.length});
    })());
});
