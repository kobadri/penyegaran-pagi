/* ============================================================
   APP.JS - PENYEGARAN PAGI - FKKP
   ------------------------------------------------------------
   Tugas file ini (dibuat ulang):
   1. Menampilkan tanggal hari ini secara DINAMIS mengikuti
      zona waktu WIB (Asia/Jakarta), contoh: "Sabtu, 7 Nopember 2026".
      Tanggal otomatis berganti saat tengah malam WIB.
   2. Menghitung pekan yang sedang berjalan berdasarkan periode
      buku (lihat pp-konfigurasi.js): pekan dimulai hari MINGGU.
   3. Mengisi tombol "Hari Ini" dengan bacaan hari ini.
   4. Mengisi submenu "Pekan Ini" dengan Garis Besar + Senin-Sabtu
      beserta tanggalnya, dan menandai hari ini.
   5. Menampilkan/menyembunyikan pesan "di luar periode".
   6. Menyediakan fungsi global ppPosisi() yang dipakai index.html
      untuk tombol Media (audio/video pekan ini).
   7. Pembaca (reader): bacaan dibuka di atas halaman utama dalam
      bingkai layar penuh TANPA header tetap sama sekali. Keluar
      lewat tombol Home di dalam bacaan, tombol Esc, atau tombol
      back ponsel. Di samping Home ada tombol "Copy To Clipboard"
      untuk menyalin materi hari itu (paste ke Gemini/ChatGPT).
   ============================================================ */

(function () {
    "use strict";

    var K = (typeof PP_CONFIG !== "undefined") ? PP_CONFIG : {
        zonaWaktu: "Asia/Jakarta", bukuJudul: "", subJudul: "",
        periodeMulai: "2026-10-04", periodeSelesai: "2026-12-26",
        jumlahPekan: 12, pathTeks: "data/teks/",
        hariIndo: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
        hariBerkas: { 1: "senin", 2: "selasa", 3: "rabu", 4: "kamis", 5: "jumat", 6: "sabtu" },
        bulanIndo: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
                    "Agustus", "September", "Oktober", "Nopember", "Desember"]
    };

    var SATU_HARI = 24 * 60 * 60 * 1000;

    /* ---------- util ---------- */
    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    function parseHari(iso) {           /* "2026-10-04" -> ms UTC tengah malam */
        var b = iso.split("-");
        return Date.UTC(parseInt(b[0], 10), parseInt(b[1], 10) - 1, parseInt(b[2], 10));
    }

    var MS_MULAI = parseHari(K.periodeMulai);      /* 4 Oktober 2026  (Minggu) */
    var MS_SELESAI = parseHari(K.periodeSelesai);  /* 26 Desember 2026 (Sabtu)  */

    /* ---------- tanggal hari ini versi WIB ---------- */
    function tanggalWIB() {
        var sekarang = new Date();
        var y = 0, m = 0, d = 0, ok = false;

        try {
            var fmt = new Intl.DateTimeFormat("en-GB", {
                timeZone: K.zonaWaktu || "Asia/Jakarta",
                year: "numeric", month: "2-digit", day: "2-digit"
            });
            if (fmt.formatToParts) {
                var bag = fmt.formatToParts(sekarang), i;
                for (i = 0; i < bag.length; i++) {
                    if (bag[i].type === "year")  y = parseInt(bag[i].value, 10);
                    if (bag[i].type === "month") m = parseInt(bag[i].value, 10);
                    if (bag[i].type === "day")   d = parseInt(bag[i].value, 10);
                }
                ok = (y > 1970 && m >= 1 && m <= 12 && d >= 1 && d <= 31);
            }
        } catch (e) { ok = false; }

        if (!ok) {  /* fallback manual: geser UTC + 7 jam (WIB) */
            var wib = new Date(sekarang.getTime() + (7 * 60 + sekarang.getTimezoneOffset()) * 60000);
            y = wib.getFullYear(); m = wib.getMonth() + 1; d = wib.getDate();
        }

        var msHari = Date.UTC(y, m - 1, d);
        return { y: y, m: m, d: d, hari: new Date(msHari).getUTCDay(), msHari: msHari };
    }

    /* tanggal berupa {y,m,d,hari} dari ms UTC tengah malam */
    function objTanggal(ms) {
        var t = new Date(ms);
        return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
                 hari: t.getUTCDay(), msHari: ms };
    }

    function formatPenuh(t) {
        return K.hariIndo[t.hari] + ", " + t.d + " " + K.bulanIndo[t.m - 1] + " " + t.y;
    }
    function formatPendek(t) { return t.d + " " + K.bulanIndo[t.m - 1]; }
    function rentangPekan(mulai, akhir) {
        if (mulai.m === akhir.m) {
            return mulai.d + " - " + akhir.d + " " + K.bulanIndo[mulai.m - 1] + " " + mulai.y;
        }
        return formatPendek(mulai) + " - " + formatPendek(akhir) + " " + akhir.y;
    }

    /* ---------- posisi hari ini terhadap periode buku ---------- */
    /* GLOBAL: dipakai index.html (pekanAktif untuk tombol Media) */
    window.ppPosisi = function () {
        var t = tanggalWIB();
        var selisih = Math.round((t.msHari - MS_MULAI) / SATU_HARI);
        var dalam = (selisih >= 0 && t.msHari <= MS_SELESAI);
        var pekan = dalam ? Math.floor(selisih / 7) + 1 : 0;

        /* awal pekan = hari Minggu pekan berjalan */
        var msMulaiPekan = t.msHari - t.hari * SATU_HARI;

        var pos = {
            dalam: dalam,
            pekan: pekan,
            hari: t.hari,                    /* 0 = Minggu ... 6 = Sabtu */
            tanggal: t,
            mulaiPekan: objTanggal(msMulaiPekan),
            akhirPekan: objTanggal(msMulaiPekan + 6 * SATU_HARI),
            fileHariIni: ""
        };

        pos.fileGarisBesar = K.pathTeks + "t_" + pad2(pekan || 1) + "_garis_besar_01.html";

        if (dalam) {
            /* Minggu: buka Garis Besar; Senin-Sabtu: bacaan harian */
            var namaHari = K.hariBerkas[t.hari];
            pos.fileHariIni = namaHari
                ? K.pathTeks + "t_" + pad2(pekan) + "_" + namaHari + "_01.html"
                : pos.fileGarisBesar;
        }
        return pos;
    };

    /* ---------- gaya tambahan (submenu aktif + reader) ---------- */
    function pasangGaya() {
        var css = document.createElement("style");
        css.textContent =
            ".submenu-btn.submenu-aktif{background-color:#1e5138;box-shadow:0 0 0 2px #a3c9bb inset;}" +
            ".submenu-btn .pp-tanda-hari-ini{font-size:11px;font-weight:bold;color:#c8e6d4;}" +

            /* READER: bingkai layar penuh TANPA header tetap. Tampilan
               yang terlihat murni isi file bacaannya (judul + tanggal +
               tombol Home + tombol Copy milik bacaan itu sendiri), dan
               semuanya ikut bergulir secara alami. */
            "#pp-reader{display:none;position:fixed;top:0;left:0;right:0;bottom:0;" +
            "background:#121212;z-index:400;}" +
            "#pp-reader iframe{display:block;width:100%;height:100%;border:0;" +
            "background:#121212;}";
        document.head.appendChild(css);
    }

    /* ---------- pembaca (reader) ----------
       Bingkai layar penuh TANPA header tetap: semua header yang tidak
       bergerak dihapus. Keluar dari bacaan lewat tombol Home di dalam
       bacaan, tombol Esc, atau tombol back (ponsel/browser). Di samping
       tombol Home tersedia tombol "Copy To Clipboard" untuk menyalin
       materi hari itu agar mudah ditempel ke Gemini / ChatGPT. */
    var readerEl = null, readerFrame = null, readerTerbuka = false;

    function pastikanReader() {
        if (readerEl) return;
        readerEl = document.createElement("div");
        readerEl.id = "pp-reader";

        readerFrame = document.createElement("iframe");
        readerFrame.setAttribute("title", "Bacaan Penyegaran Pagi");
        readerFrame.addEventListener("load", function () {
            layaniIsiBacaan();
        });

        readerEl.appendChild(readerFrame);
        document.body.appendChild(readerEl);
    }

    /* ---------- menyiapkan isi bacaan di dalam iframe ----------
       Dipanggil setiap kali iframe selesai memuat. Tugasnya:
       1. Sembunyikan SATU-SATUNYA header yang tidak bergerak: bar
          hijau di kartu file garis besar. (Bacaan harian tidak punya
          header tetap; kartu judulnya ikut bergulir dan justru
          diperlukan karena di situ tombol Home & Copy.)
       2. Tombol Home di dalam bacaan berfungsi menutup pembaca.
       3. Sisipkan tombol "Copy To Clipboard" di samping Home.
       4. Pasang ulang aksi buka/tutup accordion dari sisi induk,
          karena CSP pada file bacaan memblokir script internalnya. */
    function layaniIsiBacaan() {
        if (!readerFrame) return;
        var src = readerFrame.getAttribute("src") || "";
        if (src === "about:blank" || src === "") return;

        var doc = null;
        try { doc = readerFrame.contentDocument; } catch (e) { doc = null; }
        if (!doc || !doc.body) return;

        /* pengaman: bila isi bingkai berpindah ke halaman utama,
           tutup saja pembacanya */
        try {
            var href = readerFrame.contentWindow.location.href || "";
            if (/index\.html([?#].*)?$/.test(href) || /\/$/.test(href)) {
                tutupBacaan();
                return;
            }
        } catch (e) { /* abaikan */ }

        /* 1. buang header tetap milik file garis besar */
        var el = doc.querySelector(".mobile-container > .header");
        if (el) el.style.display = "none";

        /* 2. tombol Home menutup pembaca */
        alihkanTombolHome(doc);

        /* 3. tombol salin di samping Home */
        sisipkanTombolSalin(doc);

        /* 4. accordion dikendalikan dari sini (lihat catatan di atas) */
        var daftar = doc.querySelectorAll(".accordion-header, .toggle-header");
        for (var i = 0; i < daftar.length; i++) {
            pasangToggleAccordion(daftar[i]);
        }
    }

    function alihkanTombolHome(doc) {
        var daftar = doc.querySelectorAll("a[href*='index.html']");
        for (var i = 0; i < daftar.length; i++) {
            var a = daftar[i];
            if (a.getAttribute("data-pp-home") === "1") continue;
            a.setAttribute("data-pp-home", "1");
            a.addEventListener("click", function (e) {
                e.preventDefault();
                tutupBacaan();
            });
        }
    }

    function sisipkanTombolSalin(doc) {
        if (doc.getElementById("pp-btn-salin")) return;

        /* bacaan harian: tombol Home ada di dalam kartu judul (.header-card);
           tombol salin dibuat persis di sampingnya dengan gaya yang sama */
        var home = doc.querySelector(".header-card a[href*='index.html']");
        if (home && home.parentNode) {
            var wadah = home.parentNode;
            wadah.style.display = "flex";
            wadah.style.flexWrap = "wrap";
            wadah.style.justifyContent = "center";
            wadah.style.alignItems = "center";
            wadah.style.gap = "8px";

            var btn = doc.createElement("button");
            btn.type = "button";
            btn.id = "pp-btn-salin";
            btn.innerHTML = "\uD83D\uDCCB Copy To Clipboard";
            btn.style.cssText =
                "display:inline-flex;align-items:center;justify-content:center;gap:6px;" +
                "background-color:#296d59;color:#ffffff;border:0;padding:6px 16px;" +
                "border-radius:16px;font-weight:bold;font-size:0.85rem;font-family:inherit;" +
                "box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:pointer;";
            wadah.appendChild(btn);
            pasangAksiSalin(doc, btn);
            return;
        }

        /* garis besar: tombol Home ada di bar bawah kartu (.bottom-nav);
           tombol salin ditambahkan sebagai tombol sebaris di sampingnya */
        var nav = doc.querySelector(".bottom-nav");
        if (nav) {
            var btn2 = doc.createElement("button");
            btn2.type = "button";
            btn2.id = "pp-btn-salin";
            btn2.className = "nav-btn";
            btn2.innerHTML = "\uD83D\uDCCB Copy To Clipboard";
            nav.appendChild(btn2);
            pasangAksiSalin(doc, btn2);
        }
    }

    function pasangAksiSalin(doc, btn) {
        btn.addEventListener("click", function () {
            salinMateri(doc, btn);
        });
    }

    /* ---------- menyusun teks materi hari itu ----------
       Seluruh isi bacaan diambil dari dalam bingkai: judul, tanggal,
       Rawatan Pagi, Pembacaan Hari Ini / isi garis besar - termasuk
       bagian accordion yang sedang tertutup. */
    function teksElemen(el) {
        if (!el) return "";
        var clone = el.cloneNode(true);
        var buang = clone.querySelectorAll("a,button,script,style");
        for (var i = 0; i < buang.length; i++) {
            if (buang[i].parentNode) buang[i].parentNode.removeChild(buang[i]);
        }
        var baris = [];
        var anak = clone.children;
        for (var j = 0; j < anak.length; j++) {
            var t = (anak[j].textContent || "").replace(/\s+/g, " ").trim();
            if (t) baris.push(t);
        }
        if (!baris.length) {
            var t2 = (clone.textContent || "").replace(/\s+/g, " ").trim();
            if (t2) baris.push(t2);
        }
        return baris.join("\n");
    }

    function kumpulMateri(doc) {
        var out = [];
        var kartu = doc.querySelector(".mobile-container");
        if (kartu) {
            /* file garis besar */
            var h = kartu.querySelector(".header");
            if (h) {
                var tj = (h.textContent || "").replace(/\s+/g, " ").trim();
                if (tj) out.push(tj);
            }
            var cs = kartu.querySelector(".content-scroll");
            if (cs) {
                var anak = cs.children;
                for (var i = 0; i < anak.length; i++) {
                    if (anak[i].classList &&
                        anak[i].classList.contains("accordion-section")) continue;
                    var t = (anak[i].textContent || "").replace(/\s+/g, " ").trim();
                    if (t) out.push(t);
                }
                var secs = cs.querySelectorAll(".accordion-section");
                for (var j = 0; j < secs.length; j++) {
                    var hd = secs[j].querySelector(".toggle-header");
                    var cn = secs[j].querySelector(".toggle-content");
                    if (hd) out.push(teksJudulBagian(hd));
                    if (cn) out.push(teksElemen(cn));
                }
            }
        } else {
            kartu = doc.querySelector(".container");
            if (!kartu) return "";
            var hc = kartu.querySelector(".header-card");
            if (hc) out.push(teksElemen(hc));
            var ak = kartu.querySelectorAll(".accordion-rawatan, .accordion-pembacaan");
            for (var k = 0; k < ak.length; k++) {
                var h2 = ak[k].querySelector(".accordion-header");
                var c2 = ak[k].querySelector(".accordion-content");
                if (h2) out.push(teksJudulBagian(h2));
                if (c2) out.push(teksElemen(c2));
            }
        }
        return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    /* judul bagian accordion tanpa ikon panah (\u25BC/\u25B2) */
    function teksJudulBagian(header) {
        if (!header) return "";
        var clone = header.cloneNode(true);
        var buang = clone.querySelectorAll(".icon-arrow, .arrow");
        for (var i = 0; i < buang.length; i++) {
            if (buang[i].parentNode) buang[i].parentNode.removeChild(buang[i]);
        }
        return (clone.textContent || "").replace(/\s+/g, " ").trim();
    }

    function salinMateri(doc, btn) {
        var teks = kumpulMateri(doc);
        if (!teks) { umpanBalik(btn, "\u2717 Materi kosong"); return; }
        var selesai = function (ok) {
            umpanBalik(btn, ok ? "\u2713 Tersalin!" : "\u2717 Gagal menyalin");
        };
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(teks).then(
                    function () { selesai(true); },
                    function () { selesai(salinCaraLama(teks)); }
                );
                return;
            }
        } catch (e) { /* lanjut ke cara lama */ }
        selesai(salinCaraLama(teks));
    }

    function salinCaraLama(teks) {
        try {
            var ta = document.createElement("textarea");
            ta.value = teks;
            ta.setAttribute("readonly", "");
            ta.style.cssText = "position:fixed;left:-9999px;top:0;";
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, teks.length);
            var ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
        } catch (e) { return false; }
    }

    function umpanBalik(btn, teks) {
        if (!btn) return;
        if (!btn.getAttribute("data-label")) {
            btn.setAttribute("data-label", btn.innerHTML);
        }
        btn.innerHTML = teks;
        if (btn._ppWaktu) clearTimeout(btn._ppWaktu);
        btn._ppWaktu = setTimeout(function () {
            btn.innerHTML = btn.getAttribute("data-label");
        }, 2000);
    }

    function pasangToggleAccordion(header) {
        if (header.getAttribute("data-pp-toggle") === "1") return;
        header.setAttribute("data-pp-toggle", "1");
        try { header.onclick = null; } catch (e) { /* abaikan */ }
        header.addEventListener("click", function () {
            var konten = header.nextElementSibling;
            if (!konten) return;
            if (header.classList.contains("accordion-header")) {
                /* bacaan harian: konten .accordion-content + ikon .icon-arrow */
                var aktif = konten.classList.toggle("active");
                var ikon = header.querySelector(".icon-arrow");
                if (ikon) ikon.innerHTML = aktif ? "\u25B2" : "\u25BC";
            } else {
                /* garis besar: konten .toggle-content + panah .arrow */
                var tampil = (konten.style.display === "block");
                konten.style.display = tampil ? "none" : "block";
                var panah = header.querySelector(".arrow");
                if (panah) panah.textContent = tampil ? "\u25BC" : "\u25B2";
            }
        });
    }

    function bukaBacaan(file, judul) {
        pastikanReader();
        void judul;   /* judul kini tampil di dalam bacaannya sendiri */
        readerFrame.setAttribute("src", file);
        readerEl.style.display = "block";
        /* cegah halaman utama ikut menggulir saat pembaca terbuka */
        document.body.style.overflow = "hidden";
        /* tombol back ponsel/browser menutup pembaca, bukan keluar situs */
        readerTerbuka = true;
        try { history.pushState({ ppReader: true }, "", location.href); } catch (e) { /* abaikan */ }
    }

    function tutupBacaan() {
        if (!readerEl) return;
        readerEl.style.display = "none";
        readerFrame.setAttribute("src", "about:blank");
        document.body.style.overflow = "";
        if (readerTerbuka) {
            readerTerbuka = false;
            try { history.back(); } catch (e) { /* abaikan */ }
        }
    }

    /* tombol back (ponsel / browser) juga menutup pembaca */
    window.addEventListener("popstate", function () {
        if (!readerTerbuka) return;
        readerTerbuka = false;
        if (readerEl) {
            readerEl.style.display = "none";
            readerFrame.setAttribute("src", "about:blank");
            document.body.style.overflow = "";
        }
    });

    /* ---------- penyusunan tampilan ---------- */
    function buatTautanSubmenu(label, file, aktif) {
        var a = document.createElement("a");
        a.className = "submenu-btn" + (aktif ? " submenu-aktif" : "");
        a.setAttribute("href", file);

        var kiri = document.createElement("span");
        kiri.textContent = label;
        var kanan = document.createElement("span");
        kanan.innerHTML = "&rsaquo;";

        a.appendChild(kiri);
        a.appendChild(kanan);
        a.addEventListener("click", function (e) {
            e.preventDefault();
            bukaBacaan(file, label);
        });
        return a;
    }

    function render() {
        var t = tanggalWIB();
        var pos = window.ppPosisi();

        /* 1. sub judul buku */
        var sub = document.getElementById("pp-sub-judul");
        if (sub && K.subJudul) sub.textContent = K.subJudul;

        /* 2. kotak tanggal - INTI PERBAIKAN */
        var elTgl = document.getElementById("pp-tanggal");
        if (elTgl) elTgl.textContent = formatPenuh(t);   /* "Sabtu, 7 Nopember 2026" */

        /* 3. deskripsi di bawah tanggal */
        var elDesc = document.getElementById("pp-deskripsi");
        if (elDesc) {
            if (pos.dalam) {
                elDesc.textContent = "Pekan " + pos.pekan + " dari " + K.jumlahPekan +
                    " \u2022 " + rentangPekan(pos.mulaiPekan, pos.akhirPekan);
            } else {
                elDesc.textContent = "Periode buku: 4 Oktober - 26 Desember " +
                    new Date(MS_MULAI).getUTCFullYear();
            }
        }

        /* 4. pesan di luar periode */
        var pesan = document.getElementById("pp-pesan-luar");
        if (pesan) pesan.style.display = pos.dalam ? "none" : "block";

        /* 5. tombol Hari Ini */
        var btnHari = document.getElementById("btn-hari-ini");
        if (btnHari) {
            var labelHari = K.hariIndo[t.hari];
            btnHari.setAttribute("href", pos.dalam ? pos.fileHariIni : "#");
            btnHari.onclick = function (e) {
                e.preventDefault();
                if (!pos.dalam) {
                    alert("Buku penyegaran pagi \"" + K.bukuJudul + "\" berlaku " +
                          "4 Oktober - 26 Desember 2026. Sekarang di luar periode itu, " +
                          "jadi bacaan harian belum tersedia.");
                    return;
                }
                bukaBacaan(pos.fileHariIni, "Hari Ini - " + formatPenuh(t));
            };
            void labelHari;
        }

        /* 6. submenu Pekan Ini */
        var submenu = document.getElementById("pekanSubmenu");
        if (submenu) {
            submenu.innerHTML = "";
            if (pos.dalam) {
                submenu.appendChild(buatTautanSubmenu(
                    "Garis Besar Pekan " + pos.pekan, pos.fileGarisBesar, false));
                for (var h = 1; h <= 6; h++) {
                    var ms = pos.mulaiPekan.msHari + h * SATU_HARI;
                    var tgl = objTanggal(ms);
                    var aktif = (tgl.msHari === t.msHari);
                    var label = K.hariIndo[h];
                        (aktif ? "  \u2022 Hari Ini" : "");
                    submenu.appendChild(buatTautanSubmenu(
                        label,
                        K.pathTeks + "t_" + pad2(pos.pekan) + "_" + K.hariBerkas[h] + "_01.html",
                        aktif));
                }
            } else {
                var info = document.createElement("div");
                info.style.cssText = "font-size:12px;color:#666;padding:4px 6px;text-align:center;";
                info.textContent = "Submenu bacaan aktif saat periode buku berjalan " +
                    "(4 Oktober - 26 Desember 2026).";
                submenu.appendChild(info);
            }
        }

        return t;
    }

    /* ---------- jalan otomatis + pergantian hari ---------- */
    pasangGaya();
    var terakhir = render().msHari;

    /* cek tiap 30 detik: kalau sudah berganti hari (tengah malam WIB),
       segarkan tanggal, pekan, submenu, dan tombol Hari Ini */
    setInterval(function () {
        var t = tanggalWIB();
        if (t.msHari !== terakhir) {
            terakhir = render().msHari;
        }
    }, 30000);

    /* tutup reader dengan tombol ESC juga */
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" || e.keyCode === 27) tutupBacaan();
    });
})();

window.tutupReader = function() { var r = document.getElementById("reader-overlay") || document.getElementById("reader") || document.querySelector(".reader-container"); if (r) r.style.display = "none"; window.location.hash = ""; };
window.salinTeksBacaan = function() { var el = document.querySelector("#reader-content, .bacaan-body, article, main") || document.body; navigator.clipboard.writeText(el.innerText).then(function() { alert("Materi berhasil disalin ke clipboard!"); }); };
