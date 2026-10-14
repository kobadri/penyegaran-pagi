const TANGGAL_MULAI_BUKU = new Date('2026-10-05T00:00:00');

const petaHari = {
  0: 'Senin', // Jika Minggu, diarahkan ke Senin
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu'
};

const labelHariMap = {
  'garis_besar': 'Garis Besar Seminggu',
  'Senin': 'Senin',
  'Selasa': 'Selasa',
  'Rabu': 'Rabu',
  'Kamis': 'Kamis',
  'Jumat': 'Jumat',
  'Sabtu': 'Sabtu'
};

let mingguAktif = 1;
let hariAktif = 'Senin';

document.addEventListener('DOMContentLoaded', () => {
  hitungMingguAktif();
  
  if (window.IS_ADMIN_MODE) {
    initAdminDropdown();
  } else {
    aturInfoHariIni();
  }
  
  renderMenu();
});

function hitungMingguAktif() {
  const sekarang = new Date();
  const selisihHari = Math.floor((sekarang - TANGGAL_MULAI_BUKU) / (1000 * 60 * 60 * 24));
  
  if (selisihHari >= 0) {
    mingguAktif = Math.floor(selisihHari / 7) + 1;
    if (mingguAktif > 12) mingguAktif = 12;
  } else {
    mingguAktif = 1;
  }

  const infoEl = document.getElementById('info-minggu');
  if (infoEl && !window.IS_ADMIN_MODE) {
    infoEl.innerText = `Kaum Beriman (1) • Minggu ke-${mingguAktif}`;
  }
}

function aturInfoHariIni() {
  const sekarang = new Date();
  const dayIndex = sekarang.getDay();
  hariAktif = (dayIndex === 0) ? 'Senin' : petaHari[dayIndex];
  
  const opsiTanggal = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const teksTanggal = sekarang.toLocaleDateString('id-ID', opsiTanggal);

  const infoHariIniEl = document.getElementById('teks-info-hari-ini');
  if (infoHariIniEl) {
    infoHariIniEl.innerText = teksTanggal;
  }
}

function bukaHariIni() {
  const sekarang = new Date();
  const dayIndex = sekarang.getDay();
  hariAktif = (dayIndex === 0) ? 'Senin' : petaHari[dayIndex];
  pilihHari(hariAktif, labelHariMap[hariAktif]);
}

function pilihHariDariDropdown(val) {
  if (!val) return;
  hariAktif = val;
  pilihHari(val, labelHariMap[val]);
  
  setTimeout(() => {
    const sel = document.querySelector('.select-minggu-landing');
    if (sel) sel.selectedIndex = 0;
  }, 200);
}

function initAdminDropdown() {
  const select = document.getElementById('select-minggu');
  if (!select) return;
  
  select.innerHTML = '';
  for (let i = 1; i <= 12; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `Minggu ke-${i} ${i === mingguAktif ? '(Aktif Sekarang)' : ''}`;
    if (i === mingguAktif) opt.selected = true;
    select.appendChild(opt);
  }
  renderStatusInteraktif();
}

function gantiMingguAdmin(val) {
  mingguAktif = parseInt(val);
  renderStatusInteraktif();
  kembaliKeMenu();
}

async function renderStatusInteraktif() {
  const numSpan = document.getElementById('val-minggu-num');
  if (numSpan) numSpan.innerText = mingguAktif;

  const gridContainer = document.getElementById('status-grid-hari');
  if (!gridContainer) return;

  gridContainer.innerHTML = '<div style="font-size:0.8rem; color:#64748b; padding:4px;">Memeriksa status file...</div>';

  const mStr = pad(mingguAktif);
  let htmlContent = '';
  const daftarHariList = [
    { id: 'garis_besar', label: 'Garis Besar Seminggu' },
    { id: 'Senin', label: 'Senin' },
    { id: 'Selasa', label: 'Selasa' },
    { id: 'Rabu', label: 'Rabu' },
    { id: 'Kamis', label: 'Kamis' },
    { id: 'Jumat', label: 'Jumat' },
    { id: 'Sabtu', label: 'Sabtu' }
  ];

  for (const item of daftarHariList) {
    const namaFileTeks = `T_${mStr}_${item.id}.html`;
    let statusBadge = '<span class="badge-status badge-dummy">Belum Dicek</span>';
    
    try {
      const res = await fetch(namaFileTeks);
      if (res.ok) {
        const text = await res.text();
        if (text.length > 300 && !text.includes("materi_dummy")) {
          statusBadge = '<span class="badge-status badge-ok">Asli / Lengkap</span>';
        } else {
          statusBadge = '<span class="badge-status badge-dummy">Dummy / Kosong</span>';
        }
      } else {
        statusBadge = '<span class="badge-status badge-dummy">Belum Ada</span>';
      }
    } catch (e) {
      statusBadge = '<span class="badge-status badge-dummy">Error</span>';
    }

    htmlContent += `
      <div class="status-row" onclick="pilihHari('${item.id}', '${item.label}')">
        <span><b>${item.label}</b> <small style="color:#64748b;">(T_${mStr}_${item.id}.html)</small></span>
        ${statusBadge}
      </div>
    `;
  }

  gridContainer.innerHTML = htmlContent;
}

function renderMenu() {
  const container = document.getElementById('list-menu-hari');
  if (!container) return;
  container.innerHTML = '';
}

function pilihHari(idHari, labelHari) {
  hariAktif = idHari;
  const judulEl = document.getElementById('judul-hari');
  if (judulEl) judulEl.innerText = `${labelHari} (Minggu ${mingguAktif})`;
  
  const menuView = document.getElementById('menu-view');
  const detailView = document.getElementById('detail-view');
  if (menuView) menuView.classList.add('hidden');
  if (detailView) detailView.classList.remove('hidden');

  muatKonten(idHari);
  bukaTab('baca');
}

function kembaliKeMenu() {
  const menuView = document.getElementById('menu-view');
  const detailView = document.getElementById('detail-view');
  if (detailView) detailView.classList.add('hidden');
  if (menuView) menuView.classList.remove('hidden');
  
  const audioPlayer = document.getElementById('audio-player');
  const videoPlayer = document.getElementById('video-player');
  if (audioPlayer) audioPlayer.pause();
  if (videoPlayer) videoPlayer.pause();
}

function bukaTab(namaTab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  if (namaTab === 'baca') {
    const btnBaca = document.querySelector('button[onclick="bukaTab(\'baca\')"]');
    const contentBaca = document.getElementById('content-baca');
    if (btnBaca) btnBaca.classList.add('active');
    if (contentBaca) contentBaca.classList.add('active');
    catatStatistik('baca');
  } else if (namaTab === 'dengar') {
    const btnDengar = document.querySelector('button[onclick="bukaTab(\'dengar\')"]');
    const contentDengar = document.getElementById('content-dengar');
    if (btnDengar) btnDengar.classList.add('active');
    if (contentDengar) contentDengar.classList.add('active');
    catatStatistik('dengar');
  } else if (namaTab === 'lihat') {
    const btnLihat = document.querySelector('button[onclick="bukaTab(\'lihat\')"]');
    const contentLihat = document.getElementById('content-lihat');
    if (btnLihat) btnLihat.classList.add('active');
    if (contentLihat) contentLihat.classList.add('active');
    catatStatistik('lihat');
  }
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

async function muatKonten(idHari) {
  const mStr = pad(mingguAktif);
  
  // Menggunakan nama hari langsung (contoh: T_02_Rabu.html, S_02_Rabu.mp3, V_02_Rabu.mp4)
  const namaFileTeks = `T_${mStr}_${idHari}.html`;
  const elTeks = document.getElementById('teks-bacaan');
  if (elTeks) elTeks.innerHTML = "Memuat bacaan...";

  try {
    const res = await fetch(namaFileTeks);
    if (res.ok) {
      const htmlContent = await res.text();
      if (elTeks) elTeks.innerHTML = htmlContent;
    } else {
      if (elTeks) elTeks.innerHTML = `<p>Konten bacaan untuk ${idHari} Minggu ke-${mingguAktif} (${namaFileTeks}) sedang disiapkan.</p>`;
    }
  } catch (err) {
    if (elTeks) elTeks.innerHTML = `<p>Gagal memuat file bacaan.</p>`;
  }

  const namaFileAudio = `S_${mStr}_${idHari}.mp3`;
  const audioPlayer = document.getElementById('audio-player');
  const audioSource = document.getElementById('audio-source');
  if (audioSource) audioSource.src = namaFileAudio;
  if (audioPlayer) audioPlayer.load();

  const namaFileVideo = `V_${mStr}_${idHari}.mp4`;
  const videoPlayer = document.getElementById('video-player');
  const videoSource = document.getElementById('video-source');
  if (videoSource) videoSource.src = namaFileVideo;
  if (videoPlayer) videoPlayer.load();
}

function catatStatistik(tipe) {
  const key = `stats_m${mingguAktif}_${hariAktif}_${tipe}`;
  let currentCount = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, currentCount + 1);
}
