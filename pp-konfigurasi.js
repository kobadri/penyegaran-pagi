/* ============================================================
   KONFIGURASI PENYEGARAN PAGI - FKKP
   ------------------------------------------------------------
   Semua angka & teks yang mudah berubah dikumpulkan di sini,
   supaya app.js di bawahnya tidak perlu disentuh setiap buku baru.

   PENTING (dipakai oleh index.html):
   - fungsi global ppPosisi() didefinisikan di app.js dan
     dipanggil oleh tombol Media (pekanAktif()).
   ============================================================ */

var PP_CONFIG = {

    /* Zona waktu acuan tampilan tanggal: WIB (UTC+7) */
    zonaWaktu: "Asia/Jakarta",

    /* Identitas buku yang sedang berjalan */
    bukuJudul: "Kaum Beriman (1)",

    /* Periode buku: 4 Oktober 2026 - 26 Desember 2026
       (12 pekan; pekan dimulai hari MINGGU) */
    periodeMulai: "2026-10-04",
    periodeSelesai: "2026-12-26",
    jumlahPekan: 12,

    /* Lokasi berkas bacaan & media */
    pathTeks: "data/teks/",
    pathMedia: "data/berita_mingguan/",

    /* Nama hari & bulan untuk tampilan tanggal
       (urutan sesuai getDay(): 0 = Minggu) */
    hariIndo: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],

    /* Nama file bacaan harian di data/teks/ untuk hari ke-1..6
       (Minggu tidak punya bacaan harian; Minggu pakai Garis Besar) */
    hariBerkas: { 1: "senin", 2: "selasa", 3: "rabu", 4: "kamis", 5: "jumat", 6: "sabtu" },

    /* Penulisan bulan sesuai permintaan: "Nopember".
       Ganti "Nopember" menjadi "November" bila menghendaki KBBI. */
    bulanIndo: ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember"],

    /* Judul kecil di atas kotak tanggal (sub-header halaman utama) */
    subJudul: "Kaum Beriman (1)",

    /* ============================================================
       DAFTAR MEDIA PER PEKAN (dipakai tombol Audio & Video)
       ------------------------------------------------------------
       Nama berkas HARUS sama persis dengan berkas yang ada di
       folder data/berita_mingguan/Pekan_XX/ di repositori.
       PERBAIKAN 2026-11-08: tombol Audio/Video di index.html
       memanggil playAudioPekanIni()/playVideoPekanIni() yang
       sebelumnya tidak pernah didefinisikan di app.js. Kini kedua
       fungsi membaca daftar di bawah ini, sehingga tombol tersambung
       ke berkas media pekan yang sedang berjalan.
       Catatan: sebagian berkas lama sempat ditulis dengan SPASI
       setelah nomor pekan (mis. "6 Tujuan_..."); berkas aslinya
       memakai GARIS BAWAH ("6_Tujuan_...") - jangan mengganti
       namanya kecuali berkas di folder juga diubah.
       ============================================================ */
    mediaPekan: {
        1:  { audio: ["1_Empat_Lapisan_Identitas_Orang_Kristen.m4a"],
              video: ["1_Makna_Asli_Empat_Status_Pengikut_Kristus.mp4"] },
        2:  { audio: ["2_Mengapa_Allah_Suka_Menyembunyikan_Diri.m4a"],
              video: ["2_Realitas_Tersembunyi_Kaum_Beriman.mp4"] },
        3:  { audio: ["3_Peremukan_Ego_Lewat_Lima_Metafora_Matius.m4a"],
              video: ["3_Mengungkap_Makna_Radikal_Metafora_Identitas_Kaum_Beriman.mp4"] },
        4:  { audio: ["4_Allah_Sendiri_Adalah_Warisan_Kita.m4a"],
              video: ["4_Proses_Kematangan_Ahli_Waris_Allah.mp4"] },
        5:  { audio: ["5_Dari_Domba_Rapuh_Menjadi_Batu_Hidup.m4a"],
              video: ["5_Bagaimana_Tanah_Liat_Bertransformasi_Menjadi_Batu_Hidup.mp4"] },
        6:  { audio: ["6_Tujuan_Allah_Menjadikan_Manusia_Bersifat_Ilahi.m4a",
                      "6_Bagaimana_Manusia_Fana_Menjadi_Bersifat_Ilahi.m4a"],
              video: ["6_Bagaimana_Hayat_Ilahi_Bertumbuh_di_Dalam_Kita.mp4"] },
        7:  { audio: ["7_Harta_Ilahi_dalam_Bejana_Tanah_Liat.m4a"],
              video: ["7_Mengapa_Kita_Disebut_Bejana,_Gandum,_dan_Ranting.mp4"] },
        8:  { audio: ["8_Paradoks_Kepemimpinan_Kristus_Dalam_Injil_Matius.m4a"],
              video: ["8_Sisi_Mengejutkan_Raja_Surgawi_dalam_Injil_Matius.mp4"] },
        9:  { audio: ["9_Merobek_Tirai_Ego_demi_Penyatuan_Ilahi.m4a"],
              video: ["9_Cara_Memantulkan_Cahaya_Kristus.mp4"] },
        10: { audio: ["10_Mengapa_Berusaha_Jadi_Orang_Baik_Itu_Gagal.m4a"],
              video: ["10_Bagaimana_Cetakan_Kematian_Kristus_Bekerja.mp4"] },
        11: { audio: ["11_Dari_Tanah_Liat_Menjadi_Permata_Yaspis.m4a"],
              video: ["11_Empat_Simbol_Rahasia_Orang_Percaya_dalam_Kitab_Wahyu.mp4"] },
        12: { audio: ["12_Ketika_Gaun_Pengantin_Menjadi_Zirah_Perang.m4a"],
              video: ["12_Dua_Sisi_Mempelai_Kristus_yang_Menggetarkan_Musuh.mp4"] }
    }
};
