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
    subJudul: "Kaum Beriman (1)"
};
