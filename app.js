/* ============================================================
   APP.JS - PENYEGARAN PAGI - FKKP
   ------------------------------------------------------------
   Versi lengkap yang sudah disesuaikan:
   - Tanggal & pekan dinamis (WIB)
   - Tombol Home responsif (menutup reader kembali ke menu)
   - Tombol "Copy To Clipboard" otomatis menyesuaikan posisi:
     * Di ATAS (samping Home) untuk Senin - Sabtu (Bacaan Harian)
     * Di BAWAH (samping Home) untuk Minggu (Garis Besar / Outline)
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

        sisipkanTombolSalin(doc);

        var daftar = doc.querySelectorAll(".accordion-header, .toggle-header");
        for (var i = 0; i < daftar.length; i++) {
            pasangToggleAccordion(daftar[i]);
        }
    }

    function sisipkanTombolSalin(doc) {
        var listHome = doc.querySelectorAll("a[href*='index.html'], .home-btn");
        for (var h = 0; h < listHome.length; h++) {
            var btnHome = listHome[h];
            if (btnHome.getAttribute("data-fixed-home") === "1") continue;
            btnHome.setAttribute("data-fixed-home", "1");
            btnHome.setAttribute("href", "javascript:void(0);");
            
            btnHome.addEventListener("click", function(e) {
                e.preventDefault();
                var reader = window.parent.document.getElementById("pp-reader") || document.getElementById("pp-reader");
                if (reader) {
                    reader.style.display = "none";
                    var iframe = reader.querySelector("iframe");
                    if (iframe) iframe.src = "about:blank";
                    window.parent.document.body.style.overflow = "";
                    document.body.style.overflow = "";
                }
            });

            var parent = btnHome.parentNode;
            if (parent && !parent.querySelector("#pp-btn-salin")) {
                var isBottom = parent.classList.contains("bottom-nav");
                
                parent.style.display = "flex";
                parent.style.flexDirection = "row";
                parent.style.gap = "8px";
                parent.style.justifyContent = "center";
                parent.style.alignItems = "center";
                
                btnHome.style.flex = "1";
                btnHome.style.margin = "0";

                var btnCopy = doc.createElement("button");
                btnCopy.type = "button";
                btnCopy.id = "pp-btn-salin";
                if (isBottom) {
                    btnCopy.className = "nav-btn";
                }
                btnCopy.innerHTML = "📋 Copy To Clipboard";
                btnCopy.style.flex = "1";
                btnCopy.style.margin = "0";
                btnCopy.style.padding = isBottom ? "10px 15px" : "6px 12px";
                btnCopy.style.backgroundColor = "#2e7d32";
                btnCopy.style.border = "0";
                btnCopy.style.color = "#ffffff";
                btnCopy.style.fontWeight = "bold";
                btnCopy.style.borderRadius = "8px";
                btnCopy.style.cursor = "pointer";
                btnCopy.style.fontSize = "0.85rem";

                btnCopy.addEventListener("click", function() {
                    var el = doc.querySelector(".content-scroll, .bacaan-body, article, main") || doc.body;
                    var teks = el.innerText || el.textContent;
                    navigator.clipboard.writeText(teks).then(function() {
                        btnCopy.innerHTML = "✓ Tersalin!";
                        setTimeout(function() { btnCopy.innerHTML = "📋 Copy To Clipboard"; }, 2000);
                    }).catch(function() {
                        alert("Gagal menyalin teks.");
                    });
                });

                parent.appendChild(btnCopy);
            }
        }
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
        if (e.key === "Escape" || e.keyCode === 27) tutupBacaan();
    });
})();
