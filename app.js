/* ============================================================
   APP.JS - PENYEGARAN PAGI - FKKP
   ------------------------------------------------------------
   Versi Lengkap & Utuh:
   - Tanggal & pekan dinamis (WIB)
   - Tombol Home universal di dalam reader (berfungsi normal di semua halaman)
   - Tombol Copy To Clipboard otomatis (Atas untuk Harian, Bawah untuk Minggu)
   - Tombol Audio & Video dinamis mengarah ke folder Pekan aktif
   PERBAIKAN 2026-11-08 (tombol Audio & Video tersambung):
   - playAudioPekanIni() / playVideoPekanIni() sebelumnya DIPANGGIL
     oleh index.html tetapi tidak pernah didefinisikan, sehingga
     klik tombol Audio/Video hanya memunculkan error ReferenceError.
   - Kini kedua fungsi didefinisikan di file ini dan membaca daftar
     berkas dari PP_CONFIG.mediaPekan (lihat pp-konfigurasi.js),
     lalu memutarnya di modal #mediaModal yang sudah tersedia.
   - closeModal()/closeModalDirect() juga kini terdefinisi sehingga
     tombol "Tutup" dan klik di luar modal berfungsi.
   - Blok mati btn-audio/btn-video di render() dihapus (elemen
     dengan id tersebut tidak ada di index.html).
   PERBARUI 2026-11-08 (tombol salin versi menyeluruh):
   - sisipkanTombolSalinKhususReader() ditulis ulang:
     * Posisi PASTI menurut jenis halaman: nama berkas iframe
       (t_NN_garis_besar_01.html -> MINGGUAN; t_NN_<hari>_01.html ->
       HARIAN); bila nama berkas tak dikenali, ditekan dari
       <title>/.header/.header-sub/h1-h4 halaman.
       HARIAN  -> tombol salin SEBELUM (di atas) Home.
       MINGGUAN-> tombol salin SESUDAH (di bawah) Home.
     * Tombol salin meniru tampilan tombol Home (kelas + gaya
       inline disalin), jadi selalu berdampingan dan serasi.
     * Menyalin SELURUH teks bacaan pada kontainer utama (.container
       / .mobile-container) - termasuk isi accordion yang TERTUTUP -
       tanpa emoji, panah, tombol, navigasi, atau modal media.
     * Pemutar clipboard: Clipboard API + cadangan execCommand
       (untuk konteks non-HTTPS) + umpan balik "Tersalin!".
     * Klik Home tetap dicegat untuk menutup reader (perilaku lama
       dipertahankan, kini di intersepsiTombolHome()).
   PERBAIKAN 2026-11-09 (submenu Pekan Lalu dinamis):
   - Tombol "Pekan Lalu" di index.html kini membuka submenu PERSIS
     sama dengan "Pekan Ini", tetapi mengarah ke pekan sebelumnya
     (pekan - 1). Bila pekan ini Pekan_06 maka menu ini Pekan_05.
   - render() mengisi #pekanLaluSubmenu setiap perhitungan ulang;
     bila Pekan 1 / di luar periode, tampil catatan penjelasan.
   PERBAIKAN 2026-11-09 v2 (warna merah muda):
   - Seluruh butir submenu Pekan Lalu memakai kelas tambahan
     "submenu-btn-lalu" (warna merah muda #e05252, hover merah tua)
     sesuai permintaan, serasi dengan tombol Pekan Lalu.
   - index.html kini juga memuat jaring pengaman: bila app.js versi
     lama/gagal dimuat, submenu diisi oleh script bawaan index.html
     sehingga tombol "Pekan Lalu" TETAP merespon.
   PERBAIKAN 2026-11-09 v3 (salmon KEBAL ketidakcocokan versi):
   - Diagnosa situs live 9 Nov 2026: index.html versi LAMA (tanpa
     rule CSS .submenu-btn-lalu) berpasangan dengan app.js baru
     (menambah kelas) -> butir dropdown jatuh ke HIJAU .submenu-btn
     karena kelasnya tidak dikenali CSS.
   - Solusi: app.js kini MENYUNTIKKAN sendiri <style> berisi warna
     butir Pekan Lalu (#e05252, hover #991b1b, dengan !important)
     segera setelah dimuat. Akibatnya butir TETAP merah salmon
     walaupun index.html lama yang tayang - tidak bergantung pada
     CSS mana pun di index.html.
   PERMINTAAN 2026-11-09 v4 (Home di KIRI, salin di KANAN):
   - Di dalam pembaca (reader), tombol Home kini SELALU berada di
     sebelah kiri dan "Copy To Clipboard" di sebelah kanan, untuk
     SEMUA halaman (harian maupun garis besar) - susunan yang lebih
     umum seperti aplikasi pada umumnya.
   - Caranya: tombol salin selalu disisipkan SESUDAH tombol Home
     (sebelumnya: harian = salin di kiri Home; mingguan = salin di
     kanan Home - tidak seragam).
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

    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    function parseHari(iso) {
        var b = iso.split("-");
        return Date.UTC(parseInt(b[0], 10), parseInt(b[1], 10) - 1, parseInt(b[2], 10));
    }

    var MS_MULAI = parseHari(K.periodeMulai);
    var MS_SELESAI = parseHari(K.periodeSelesai);

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

        if (!ok) {
            var wib = new Date(sekarang.getTime() + (7 * 60 + sekarang.getTimezoneOffset()) * 60000);
            y = wib.getFullYear(); m = wib.getMonth() + 1; d = wib.getDate();
        }

        var msHari = Date.UTC(y, m - 1, d);
        return { y: y, m: m, d: d, hari: new Date(msHari).getUTCDay(), msHari: msHari };
    }

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

    window.ppPosisi = function () {
        var t = tanggalWIB();
        var selisih = Math.round((t.msHari - MS_MULAI) / SATU_HARI);
        var dalam = (selisih >= 0 && t.msHari <= MS_SELESAI);
        var pekan = dalam ? Math.floor(selisih / 7) + 1 : 0;
        var msMulaiPekan = t.msHari - t.hari * SATU_HARI;

        var pos = {
            dalam: dalam,
            pekan: pekan,
            hari: t.hari,
            tanggal: t,
            mulaiPekan: objTanggal(msMulaiPekan),
            akhirPekan: objTanggal(msMulaiPekan + 6 * SATU_HARI),
            fileHariIni: ""
        };

        pos.fileGarisBesar = K.pathTeks + "t_" + pad2(pekan || 1) + "_garis_besar_01.html";

        if (dalam) {
            var namaHari = K.hariBerkas[t.hari];
            pos.fileHariIni = namaHari
                ? K.pathTeks + "t_" + pad2(pekan) + "_" + namaHari + "_01.html"
                : pos.fileGarisBesar;
        }
        return pos;
    };

    function pasangGaya() {
        var css = document.createElement("style");
        css.textContent =
            ".submenu-btn.submenu-aktif{background-color:#1e5138;box-shadow:0 0 0 2px #a3c9bb inset;}" +
            "#pp-reader{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:#121212;z-index:400;}" +
            "#pp-reader iframe{display:block;width:100%;height:100%;border:0;background:#121212;}";
        document.head.appendChild(css);
    }

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

    function layaniIsiBacaan() {
        if (!readerFrame) return;
        var src = readerFrame.getAttribute("src") || "";
        if (src === "about:blank" || src === "") return;

        var doc = null;
        try { doc = readerFrame.contentDocument; } catch (e) { doc = null; }
        if (!doc || !doc.body) return;

        try {
            var href = readerFrame.contentWindow.location.href || "";
            if (/index\.html([?#].*)?$/.test(href) || /\/$/.test(href)) {
                tutupBacaan();
                return;
            }
        } catch (e) {}

        var el = doc.querySelector(".mobile-container > .header");
        if (el) el.style.display = "none";

        /* PERMINTAAN 2026-11-09: susunan tombol di reader kini
           SERAGAM - Home di kiri, Copy To Clipboard di kanan (lebih
           umum). Posisi tidak lagi bergantung pada jenis halaman;
           jenis tetap dihitung dari nama berkas dan diteruskan bila
           kelak diperlukan. */
        var jenis = null;
        if (/garis[-_]?besar|mingguan/i.test(src)) jenis = "mingguan";
        else if (/[_\/](senin|selasa|rabu|kamis|jumat|sabtu)[_\/]/i.test(src)) jenis = "harian";

        sisipkanTombolSalinKhususReader(doc, jenis);

        var daftar = doc.querySelectorAll(".accordion-header, .toggle-header");
        for (var i = 0; i < daftar.length; i++) {
            pasangToggleAccordion(daftar[i]);
        }
    }

    /* ============================================================
       TOMBOL COPY TO CLIPBOARD DI READER - versi menyeluruh
       ------------------------------------------------------------
       1. Selalu berdampingan dengan tombol Home/Beranda.
       2. Posisi (PERMINTAAN 2026-11-09): Home DI KIRI, tombol salin
          DI KANAN pada SEMUA halaman - susunan yang umum dan seragam
          untuk harian maupun mingguan. (Sebelumnya: harian = salin
          di kiri Home; mingguan = salin di kanan Home.)
       3. Menyalin SELURUH teks bacaan pada kontainer utama (.container
          / .mobile-container) - termasuk isi accordion yang TERTUTUP -
          tanpa emoji, panah, tombol, navigasi, atau modal media;
          antarblok dipisah baris baru agar salinan rapi.
       4. Klik tombol Home tetap dicegat untuk menutup reader.
       ============================================================ */

    var ID_TOMBOL_SALIN = "pp-btn-salin";
    var LABEL_SALIN = "📋 Copy To Clipboard";
    var LABEL_TERSENTUH = "✓ Tersalin!";
    var LABEL_GAGAL = "Gagal salin";

    var TAG_BLOK = /^(DIV|P|LI|UL|OL|H[1-6]|SECTION|ARTICLE|HEADER|FOOTER|TABLE|TR|BLOCKQUOTE|BR|FIGURE|FIGCAPTION)$/;

    var SELECTOR_KONTEN = [
        ".container", ".mobile-container", "main", "article", ".content-scroll",
        ".isi-bacaan", ".konten-bacaan", ".bacaan", "#isi-bacaan",
        "#konten", "#content", ".content"
    ];

    var SELECTOR_ABAIKAN =
        "script, style, noscript, template, nav, footer, " +
        ".navigasi, .toolbar, .menu, button, .btn, " +
        ".icon-arrow, .arrow, .title-group > span:first-child, " +
        ".header-card a, .nav-container a, a[href$=\"index.html\"], " +
        ".bottom-nav, #mediaModal, " +
        "#" + ID_TOMBOL_SALIN + ", #btnHome, #tombolHome, #btnBeranda, " +
        ".btn-home, .tombol-home, .btn-beranda";

    var BULAN_INDO = { januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
                       juli: 6, agustus: 7, september: 8, oktober: 9,
                       november: 10, desember: 11 };

    /* Teks elemen tanpa emoji/simbol: "🏠 Home" -> "Home". */
    function teksInti(el) {
        return (el.textContent || "")
            .replace(/[^\p{L}\p{N}\s]/gu, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function cariTombolHomeReader(doc) {
        var byId = doc.getElementById("btnHome") ||
                   doc.getElementById("tombolHome") ||
                   doc.getElementById("btnBeranda");
        if (byId) return byId;

        var bySelector = doc.querySelector(
            '.btn-home, .tombol-home, .home-btn, .btn-beranda, [data-aksi="home"]');
        if (bySelector) return bySelector;

        /* Pola aplikasi: <a href="../../index.html">🏠 Home</a> */
        var byHref = doc.querySelector(
            'a[href$="index.html"], a[href="/"], a[href*="home"], a[href*="beranda"]');
        if (byHref) return byHref;

        var semua = doc.querySelectorAll("a, button");
        for (var i = 0; i < semua.length; i++) {
            if (/^(home|beranda)$/i.test(teksInti(semua[i]))) return semua[i];
        }
        return null;
    }

    function tentukanJenisHalamanReader(doc) {
        var sumber = [doc.title || ""];
        var daftarSelector = [".header-title", ".header-sub", ".header", ".week-title",
                              "h1", "h2", "h3", "h4"];
        for (var s = 0; s < daftarSelector.length; s++) {
            var kelompok = doc.querySelectorAll(daftarSelector[s]);
            for (var k = 0; k < kelompok.length; k++) {
                sumber.push(kelompok[k].textContent || "");
            }
        }
        var teks = sumber.join(" ").toLowerCase();

        /* Nama hari Senin-Sabtu dicek lebih dulu: halaman harian boleh
           saja memuat frasa "Garis Besar" pada judul bagiannya (h4). */
        if (/\b(senin|selasa|rabu|kamis|jumat|jum'?at|sabtu)\b/.test(teks)) return "harian";
        if (/garis\s?besar|mingguan|outline|weekly/.test(teks)) return "mingguan";
        if (/\bminggu\b/.test(teks)) return "mingguan";

        var cocok = teks.match(
            /\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})\b/);
        if (cocok) {
            var t = new Date(parseInt(cocok[3], 10), BULAN_INDO[cocok[2]], parseInt(cocok[1], 10));
            if (!isNaN(t.getTime())) return t.getDay() === 0 ? "mingguan" : "harian";
        }
        return "harian";
    }

    /* Perilaku lama yang dipertahankan: Home menutup reader. */
    function intersepsiTombolHome(tombolHome) {
        if (!tombolHome || tombolHome.getAttribute("data-fixed-home") === "1") return;
        tombolHome.setAttribute("data-fixed-home", "1");
        tombolHome.setAttribute("href", "javascript:void(0);");
        tombolHome.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            tutupBacaan();
        }, true);
    }

    /* Efek hover/aktif/disabled untuk tombol salin (tetap mengikuti
       warna yang disalin dari tombol Home). */
    function sisipkanGayaTombolSalin(doc) {
        if (doc.getElementById("pp-btn-salin-gaya")) return;
        var style = doc.createElement("style");
        style.id = "pp-btn-salin-gaya";
        style.textContent =
            "#pp-btn-salin{border:0;cursor:pointer;font-family:inherit;" +
            "transition:background-color .2s ease,transform .1s ease}" +
            "#pp-btn-salin:hover{filter:brightness(1.15)}" +
            "#pp-btn-salin:active{transform:scale(0.98)}" +
            "#pp-btn-salin:disabled{opacity:.7;cursor:default}";
        (doc.head || doc.documentElement).appendChild(style);
    }

    function buatTombolSalinReader(doc, tombolHome) {
        var btn = doc.createElement("button");
        btn.type = "button";
        btn.id = ID_TOMBOL_SALIN;
        btn.innerHTML = LABEL_SALIN;
        btn.title = "Salin seluruh isi bacaan";
        btn.setAttribute("aria-label", "Salin isi bacaan ke clipboard");
        btn.setAttribute("data-label-asli", LABEL_SALIN);

        /* Tampilan mengikuti tombol Home (kelas + gaya inline):
         * - template harian : pil #296d59 dari gaya inline Home;
         * - template mingguan: kelas .nav-btn (pil #1e5138, flex:1). */
        if (tombolHome) {
            if (tombolHome.className) btn.className = tombolHome.className;
            var gaya = tombolHome.getAttribute("style");
            if (gaya) btn.setAttribute("style", gaya);
        }
        btn.style.border = "0";
        btn.style.cursor = "pointer";
        btn.style.fontFamily = "inherit";
        btn.style.marginLeft = "6px";
        btn.style.marginRight = "6px";
        return btn;
    }

    /* Rekursif: teks node, dengan baris baru pada batas elemen blok
       (klon yang terlepas dari DOM tidak punya layout, sehingga
       innerText tidak andal). */
    function ekstrakTeksReader(node) {
        if (node.nodeType === 3) return node.nodeValue;
        if (node.nodeType !== 1) return "";
        if (node.matches && node.matches(SELECTOR_ABAIKAN)) return "";
        var hasil = "";
        var anak = node.childNodes;
        for (var i = 0; i < anak.length; i++) {
            hasil += ekstrakTeksReader(anak[i]);
        }
        if (TAG_BLOK.test(node.tagName || "")) hasil += "\n";
        return hasil;
    }

    function ambilTeksBacaanReader(doc) {
        var konten = null;
        for (var i = 0; i < SELECTOR_KONTEN.length && !konten; i++) {
            var el = doc.querySelector(SELECTOR_KONTEN[i]);
            if (el && (el.textContent || "").trim().length > 0) konten = el;
        }
        if (!konten) konten = doc.body;
        if (!konten) return "";

        /* Bekerja pada klon: halaman asli tidak terganggu dan isi
           accordion yang tertutup (display:none) tetap ikut tersalin. */
        var teks = ekstrakTeksReader(konten.cloneNode(true));
        return teks
            .replace(/[\u{1F000}-\u{1FAFF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "")
            .replace(/[ \t]{2,}/g, " ")
            .replace(/^[ \t]+/gm, "")
            .replace(/[ \t]*\r?\n[ \t\n]*/g, "\n")
            .trim();
    }

    /* Cadangan untuk konteks non-HTTPS: textarea sementara + execCommand. */
    function salinCadangan(teks) {
        try {
            var ta = document.createElement("textarea");
            ta.value = teks;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.top = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            var berhasil = document.execCommand("copy");
            document.body.removeChild(ta);
            return berhasil;
        } catch (e) {
            return false;
        }
    }

    function salinTeksKeClipboard(teks, tombol) {
        var selesai = function (sukses) {
            tombol.innerHTML = sukses ? LABEL_TERSENTUH : LABEL_GAGAL;
            tombol.disabled = true;
            setTimeout(function () {
                tombol.innerHTML = tombol.getAttribute("data-label-asli") || LABEL_SALIN;
                tombol.disabled = false;
            }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
            navigator.clipboard.writeText(teks).then(
                function () { selesai(true); },
                function () { selesai(salinCadangan(teks)); }
            );
        } else {
            selesai(salinCadangan(teks));
        }
    }

    function sisipkanTombolSalinKhususReader(doc, jenisPaksa) {
        if (!doc || !doc.body) return null;

        /* Hapus tombol lama bila ada agar posisi dihitung ulang. */
        var lama = doc.getElementById(ID_TOMBOL_SALIN);
        if (lama) lama.parentNode.removeChild(lama);

        /* PERMINTAAN 2026-11-09: Home di KIRI, salin di KANAN untuk
           SEMUA jenis halaman. Karena keduanya berdampingan satu
           baris, cukup SELALU menyisipkan tombol salin SESUDAH
           tombol Home. Argumen jenisPaksa tidak lagi menentukan
           posisi (dipertahankan agar pemanggil lama tetap cocok). */
        var jenis = jenisPaksa || tentukanJenisHalamanReader(doc);
        var tombolHome = cariTombolHomeReader(doc);
        var tombolSalin = buatTombolSalinReader(doc, tombolHome);
        sisipkanGayaTombolSalin(doc);

        if (!tombolHome) {
            doc.body.insertBefore(tombolSalin, doc.body.firstChild);
        } else {
            /* Home tetap pertama (kiri), salin menyusul (kanan). */
            tombolHome.insertAdjacentElement("afterend", tombolSalin);
        }

        intersepsiTombolHome(tombolHome);

        tombolSalin.addEventListener("click", function () {
            var teks = ambilTeksBacaanReader(doc);
            if (!teks) return;
            salinTeksKeClipboard(teks, tombolSalin);
        });

        return tombolSalin;
    }

    function pasangToggleAccordion(header) {
        if (header.getAttribute("data-pp-toggle") === "1") return;
        header.setAttribute("data-pp-toggle", "1");
        try { header.onclick = null; } catch (e) {}
        header.addEventListener("click", function () {
            var konten = header.nextElementSibling;
            if (!konten) return;
            if (header.classList.contains("accordion-header")) {
                var aktif = konten.classList.toggle("active");
                var ikon = header.querySelector(".icon-arrow");
                if (ikon) ikon.innerHTML = aktif ? "▲" : "▼";
            } else {
                var tampil = (konten.style.display === "block");
                konten.style.display = tampil ? "none" : "block";
                var panah = header.querySelector(".arrow");
                if (panah) panah.textContent = tampil ? "▼" : "▲";
            }
        });
    }

    function bukaBacaan(file, judul) {
        pastikanReader();
        void judul;
        readerFrame.setAttribute("src", file);
        readerEl.style.display = "block";
        document.body.style.overflow = "hidden";
        readerTerbuka = true;
        try { history.pushState({ ppReader: true }, "", location.href); } catch (e) {}
    }

    function tutupBacaan() {
        if (!readerEl) return;
        readerEl.style.display = "none";
        readerFrame.setAttribute("src", "about:blank");
        document.body.style.overflow = "";
        if (readerTerbuka) {
            readerTerbuka = false;
            try { history.back(); } catch (e) {}
        }
    }

    window.addEventListener("popstate", function () {
        if (!readerTerbuka) return;
        readerTerbuka = false;
        if (readerEl) {
            readerEl.style.display = "none";
            readerFrame.setAttribute("src", "about:blank");
            document.body.style.overflow = "";
        }
    });

    /* PERBAIKAN 2026-11-09 v3: gaya butir submenu Pekan Lalu kini
       DISUNTIKKAN langsung oleh app.js, bukan hanya mengandalkan
       CSS di index.html. Bila index.html versi lama yang tayang
       (tanpa rule .submenu-btn-lalu), butir tetap MERAH SALMON.
       Dipanggil segera di bawah; id dipakai agar tak dobel.
       !important agar mengungguli :hover hijau .submenu-btn. */
    function pasangGayaSubmenuLalu() {
        var kepala = document.head || document.getElementsByTagName("head")[0];
        if (!kepala || document.getElementById("pp-gaya-submenu-lalu")) return;
        var gaya = document.createElement("style");
        gaya.id = "pp-gaya-submenu-lalu";
        gaya.textContent =
            ".submenu-btn-lalu{background-color:#e05252 !important;}" +
            ".submenu-btn-lalu:hover{background-color:#991b1b !important;}";
        kepala.appendChild(gaya);
    }
    pasangGayaSubmenuLalu();

    function buatTautanSubmenu(label, file, aktif, kelasTambahan) {
        var a = document.createElement("a");
        a.className = "submenu-btn" + (aktif ? " submenu-aktif" : "") +
                      (kelasTambahan ? " " + kelasTambahan : "");
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

        var sub = document.getElementById("pp-sub-judul");
        if (sub && K.subJudul) sub.textContent = K.subJudul;

        var elTgl = document.getElementById("pp-tanggal");
        if (elTgl) elTgl.textContent = formatPenuh(t);

        var elDesc = document.getElementById("pp-deskripsi");
        if (elDesc) {
            if (pos.dalam) {
                elDesc.textContent = "Pekan " + pos.pekan + " dari " + K.jumlahPekan +
                    " • " + rentangPekan(pos.mulaiPekan, pos.akhirPekan);
            } else {
                elDesc.textContent = "Periode buku: 4 Oktober - 26 Desember " +
                    new Date(MS_MULAI).getUTCFullYear();
            }
        }

        var pesan = document.getElementById("pp-pesan-luar");
        if (pesan) pesan.style.display = pos.dalam ? "none" : "block";

        var btnHari = document.getElementById("btn-hari-ini");
        if (btnHari) {
            btnHari.setAttribute("href", pos.dalam ? pos.fileHariIni : "#");
            btnHari.onclick = function (e) {
                e.preventDefault();
                if (!pos.dalam) {
                    alert("Buku penyegaran pagi \"" + K.bukuJudul + "\" berlaku 4 Oktober - 26 Desember 2026.");
                    return;
                }
                bukaBacaan(pos.fileHariIni, "Hari Ini - " + formatPenuh(t));
            };
        }

        var submenu = document.getElementById("pekanSubmenu");
        if (submenu) {
            submenu.innerHTML = "";
            if (pos.dalam) {
                submenu.appendChild(buatTautanSubmenu("Garis Besar", pos.fileGarisBesar, false));
                for (var h = 1; h <= 6; h++) {
                    var ms = pos.mulaiPekan.msHari + h * SATU_HARI;
                    var tgl = objTanggal(ms);
                    var aktif = (tgl.msHari === t.msHari);
                    var label = K.hariIndo[h];
                    submenu.appendChild(buatTautanSubmenu(
                        label,
                        K.pathTeks + "t_" + pad2(pos.pekan) + "_" + K.hariBerkas[h] + "_01.html",
                        aktif));
                }
            } else {
                var info = document.createElement("div");
                info.style.cssText = "font-size:12px;color:#666;padding:4px 6px;text-align:center;";
                info.textContent = "Submenu bacaan aktif saat periode buku berjalan.";
                submenu.appendChild(info);
            }
        }

        /* ============================================================
           PERBAIKAN 2026-11-09: SUBMENU "PEKAN LALU" (dinamis)
           ------------------------------------------------------------
           Persis sama dengan submenu "Pekan Ini", tetapi seluruh
           pilihan mengarah ke pekan SEBELUMNYA (pekan - 1).
           Bila pekan ini Pekan_06, menu ini berisi Pekan_05:
           data/teks/t_05_garis_besar_01.html ... t_05_sabtu_01.html.
           Bila buku baru dimulai (Pekan 1), tampil catatan singkat;
           di luar periode buku, catatan yang sama dengan Pekan Ini.
           ============================================================ */
        var submenuLalu = document.getElementById("pekanLaluSubmenu");
        if (submenuLalu) {
            submenuLalu.innerHTML = "";
            if (pos.dalam && pos.pekan >= 2) {
                var pekanLalu = pos.pekan - 1;
                var fileLalu = K.pathTeks + "t_" + pad2(pekanLalu) + "_garis_besar_01.html";
                submenuLalu.appendChild(buatTautanSubmenu("Garis Besar", fileLalu, false, "submenu-btn-lalu"));
                for (var hl = 1; hl <= 6; hl++) {
                    submenuLalu.appendChild(buatTautanSubmenu(
                        K.hariIndo[hl],
                        K.pathTeks + "t_" + pad2(pekanLalu) + "_" + K.hariBerkas[hl] + "_01.html",
                        false, "submenu-btn-lalu"));
                }
            } else {
                var infoLalu = document.createElement("div");
                infoLalu.style.cssText = "font-size:12px;color:#666;padding:4px 6px;text-align:center;";
                infoLalu.textContent = (pos.dalam && pos.pekan === 1)
                    ? "Buku ini baru dimulai (Pekan 1). Belum ada pekan sebelumnya."
                    : "Submenu bacaan aktif saat periode buku berjalan.";
                submenuLalu.appendChild(infoLalu);
            }
        }

        return t;
    }

    pasangGaya();
    var terakhir = render().msHari;

    setInterval(function () {
        var t = tanggalWIB();
        if (t.msHari !== terakhir) {
            terakhir = render().msHari;
        }
    }, 30000);

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" || e.keyCode === 27) {
            hentikanPemutarMedia();
            tutupBacaan();
        }
    });

    /* ============================================================
       PEMUTAR MEDIA - tombol Audio & Video di menu Media
       ------------------------------------------------------------
       Sumber daftar berkas: PP_CONFIG.mediaPekan (pp-konfigurasi.js).
       Pemutaran memakai modal #mediaModal yang sudah ada di index.html.
       ============================================================ */

    function folderMedia(pekan) {
        return (K.pathMedia || "data/berita_mingguan/") + "Pekan_" + pad2(pekan) + "/";
    }

    function daftarMedia(pekan) {
        try {
            if (typeof PP_CONFIG !== "undefined" && PP_CONFIG.mediaPekan && PP_CONFIG.mediaPekan[pekan]) {
                return PP_CONFIG.mediaPekan[pekan];
            }
        } catch (e) {}
        return { audio: [], video: [] };
    }

    function judulDariNamaFile(nama) {
        return nama.replace(/\.(m4a|mp3|mp4)$/i, "")
                   .replace(/^[0-9]+[\s_]+/, "")
                   .replace(/_/g, " ")
                   .trim();
    }

    function hentikanPemutarMedia() {
        var body = document.getElementById("modalBody");
        if (body) {
            var av = body.querySelectorAll("audio, video");
            for (var i = 0; i < av.length; i++) {
                try { av[i].pause(); av[i].currentTime = 0; } catch (e) {}
            }
            body.innerHTML = "";
        }
        var modal = document.getElementById("mediaModal");
        if (modal) modal.style.display = "none";
    }

    function bukaModalMedia(isi) {
        var modal = document.getElementById("mediaModal");
        var body = document.getElementById("modalBody");
        if (!modal || !body) { alert("Modal media tidak ditemukan."); return; }
        body.innerHTML = isi;
        modal.style.display = "flex";
    }

    function blokPemain(jenis, folder, nama, autoplay) {
        var tautan = folder + nama;
        var html = '<div style="margin:10px 0 14px 0;text-align:left;">' +
            '<div style="font-size:12px;font-weight:bold;color:#1e5138;margin-bottom:6px;line-height:1.4;">' +
            judulDariNamaFile(nama) + '</div>';
        if (jenis === "audio") {
            html += '<audio controls' + (autoplay ? ' autoplay' : '') + ' preload="metadata" style="width:100%;">' +
                    '<source src="' + tautan + '" type="audio/mp4">' +
                    'Peramban Anda tidak mendukung pemutar audio.</audio>';
        } else {
            html += '<video controls' + (autoplay ? ' autoplay' : '') + ' preload="metadata" playsinline ' +
                    'style="width:100%;border-radius:8px;background:#000;">' +
                    '<source src="' + tautan + '" type="video/mp4">' +
                    'Peramban Anda tidak mendukung pemutar video.</video>';
        }
        html += '<a href="' + tautan + '" target="_blank" rel="noopener" download ' +
            'style="display:inline-block;margin-top:5px;font-size:11px;color:#2e7d32;text-decoration:none;">' +
            'Unduh / putar di tab baru &rsaquo;</a></div>';
        return html;
    }

    function kepalaModal(ikon, judul) {
        var pos = window.ppPosisi();
        var sub = "Pekan " + pos.pekan;
        if (pos.dalam) sub += " \u2022 " + rentangPekan(pos.mulaiPekan, pos.akhirPekan);
        return '<h3 style="margin:0 0 4px 0;font-size:16px;">' + ikon + ' ' + judul + '</h3>' +
               '<p style="margin:0 0 8px 0;font-size:12px;color:#666;">' + sub + '</p>' +
               '<p style="margin:0 0 8px 0;font-size:11px;color:#999;">Media diputar daring (butuh koneksi internet); gunakan tautan di bawah untuk mengunduh.</p>';
    }

    function posisiAktif() {
        var pos = window.ppPosisi();
        if (!pos.dalam) {
            alert("Buku penyegaran pagi \"" + K.bukuJudul + "\" berlaku 4 Oktober - 26 Desember 2026.");
            return null;
        }
        return pos;
    }

    window.playAudioPekanIni = function () {
        var pos = posisiAktif();
        if (!pos) return;
        var m = daftarMedia(pos.pekan);
        var isi = kepalaModal("\uD83C\uDFB5", "Audio Penyegaran Pagi");
        if (!m.audio.length) {
            isi += '<p style="font-size:13px;color:#666;margin:6px 0 2px 0;">Belum ada berkas audio untuk pekan ini.</p>';
        } else {
            for (var i = 0; i < m.audio.length; i++) {
                isi += blokPemain("audio", folderMedia(pos.pekan), m.audio[i], i === 0);
            }
        }
        bukaModalMedia(isi);
    };

    window.playVideoPekanIni = function () {
        var pos = posisiAktif();
        if (!pos) return;
        var m = daftarMedia(pos.pekan);
        var isi = kepalaModal("\uD83C\uDFAC", "Video Penyegaran Pagi");
        if (!m.video.length) {
            isi += '<p style="font-size:13px;color:#666;margin:6px 0 2px 0;">Belum ada berkas video untuk pekan ini.</p>';
        } else {
            for (var j = 0; j < m.video.length; j++) {
                isi += blokPemain("video", folderMedia(pos.pekan), m.video[j], j === 0);
            }
        }
        bukaModalMedia(isi);
    };

    window.closeModal = function () { hentikanPemutarMedia(); };
    window.closeModalDirect = function () { hentikanPemutarMedia(); };

    /* ============================================================
       PWA - tombol Install Aplikasi & sinkron pekan ke service worker
       ------------------------------------------------------------
       PERBARUI 2026-11-08:
       - Tombol "Install Aplikasi" menangkap peristiwa
         beforeinstallprompt (Chrome/Android/Edge/desktop). Bila
         peristiwa tidak tersedia (mis. tautan dibuka di dalam
         WhatsApp, atau di iPhone), muncul petunjuk langkah demi
         langkah sesuai perangkat.
       - Setiap aplikasi dibuka, halaman mengirim pesan
         SINKRON_PEKAN ke service worker agar bacaan pekan yang
         baru selalu disiapkan untuk mode offline.
       ============================================================ */

    var promptInstall = null;

    function dalamModeAplikasi() {
        return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
               window.navigator.standalone === true; /* iOS Safari */
    }

    function tampilkanTombolInstall() {
        var b = document.getElementById("btn-install");
        if (!b) return;
        /* Tombol hanya tampil setelah browser benar-benar mengirim
           beforeinstallprompt; jangan tampil sebagai tombol semu. */
        b.style.display = (!dalamModeAplikasi() && promptInstall) ? "flex" : "none";
    }

    window.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault();
        promptInstall = e;
        tampilkanTombolInstall();
    });

    window.addEventListener("appinstalled", function () {
        promptInstall = null;
        var b = document.getElementById("btn-install");
        if (b) b.style.display = "none";
    });

    window.instalAplikasi = function () {
        if (promptInstall) {
            promptInstall.prompt();
            promptInstall.userChoice.then(function () { promptInstall = null; });
            return;
        }
        var ua = navigator.userAgent || "";
        if (/WhatsApp/i.test(ua)) {
            alert("Tautan ini masih terbuka di dalam WhatsApp.\n\n" +
                  "Cara meng-install:\n" +
                  "1. Ketuk titik tiga (\u22ee) di kanan atas WhatsApp.\n" +
                  "2. Pilih \"Buka di Chrome\" / \"Open in browser\".\n" +
                  "3. Setelah terbuka di Chrome, ketuk menu \u22ee lalu pilih \"Install aplikasi\" / \"Tambahkan ke layar utama\".");
        } else if (/iphone|ipad|ipod/i.test(ua)) {
            alert("Di iPhone/iPad (pakai Safari):\n\n" +
                  "1. Ketuk ikon Bagikan (kotak dengan panah ke atas).\n" +
                  "2. Gulir dan pilih \"Tambah ke Layar Utama\".\n" +
                  "3. Ketuk \"Tambah\". Aplikasi akan muncul seperti aplikasi biasa.");
        } else {
            alert("Untuk meng-install aplikasi:\n\n" +
                  "Buka menu titik tiga (\u22ee) di sudut peramban, lalu pilih \"Install aplikasi\" / \"Tambahkan ke layar utama\".");
        }
    };

    tampilkanTombolInstall();

    /* Unduh offline hanya untuk Pekan Ini dan Pekan Lalu.
       Cache perangkat dibersihkan; sumber GitHub tidak pernah dihapus. */
    function daftarAsetOffline() {
        var pos = window.ppPosisi();
        if (!pos.dalam || !pos.pekan) return null;
        var pekan = [pos.pekan, pos.pekan - 1].filter(function (n) { return n >= 1; });
        var daftar = [];
        pekan.forEach(function (nomor) {
            var nn = pad2(nomor);
            daftar.push(K.pathTeks + "t_" + nn + "_garis_besar_01.html");
            Object.keys(K.hariBerkas || {}).forEach(function (k) {
                daftar.push(K.pathTeks + "t_" + nn + "_" + K.hariBerkas[k] + "_01.html");
            });
            var media = daftarMedia(nomor);
            (media.audio || []).forEach(function (nama) { daftar.push(folderMedia(nomor) + nama); });
            (media.video || []).forEach(function (nama) { daftar.push(folderMedia(nomor) + nama); });
        });
        return daftar.filter(function (v, i, a) { return a.indexOf(v) === i; })
            .map(function (v) { return new URL(v, document.baseURI).href; });
    }

    if ("serviceWorker" in navigator) {
        var asetOffline = daftarAsetOffline();
        if (asetOffline && asetOffline.length) {
            navigator.serviceWorker.ready.then(function (reg) {
                var pekerja = reg.active || reg.waiting || reg.installing;
                if (pekerja) pekerja.postMessage({
                    jenis: "SINKRON_PEKAN",
                    pekanAktif: window.ppPosisi().pekan,
                    urls: asetOffline
                });
            }).catch(function () {});
        }
    }
})();
