# 💎 Minja Cloud — Cetak Biru Desain UI/UX & Master Prompt Google Stitch

> **Dokumen Arsitektur Desain Generasi Baru (Next-Gen UI/UX Blueprint)**  
> Panduan komprehensif untuk merancang seluruh ekosistem web **Minja Cloud** dari nol menggunakan kecerdasan buatan (**Google Stitch**, v0, Galileo, atau Figma AI).  
> 
> 🎯 **Fokus & Filosofi Desain Baru:**
> 1. **Landing Page (`minja.my.id`):** *Wajah Utama Minja* — Sangat minimalis, bernafas lega, elegan, dan **penuh interaktivitas langsung** (pengunjung web bisa mencoba simulator photobooth mini, geser tema frame, dan hitung estimasi harga sewa secara real-time).
> 2. **Portal Manajemen (Admin Pemilik, Mitra, Kasir):** Desain **radikal simpel (*clean & frictionless*)**, mudah dipahami dalam 3 detik tanpa buku panduan, tombol besar ramah sentuhan, serta dilengkapi **Pilihan Mode Terang (Light Mode) dan Mode Gelap (Dark Mode)**.
> 3. **Bebas Warna Kaku:** Desain berbasis token hierarki visual semantik, memberikan kebebasan mutlak bagi Anda untuk menentukan palet warna di Google Stitch.
> 4. **100% Bahasa Indonesia:** Seluruh antarmuka, tombol, tabel, dan pesan menggunakan Bahasa Indonesia modern yang santun, profesional, dan bebas jargon mesin pengembang.

---

## 📑 Daftar Isi Dokumen

1. [🚀 FORMAT KHUSUS KOLOM "ADDITIONAL INSTRUCTIONS" DI GOOGLE STITCH](#1--format-khusus-kolom-additional-instructions-di-google-stitch)
2. [🌐 HALAMAN 1: Landing Page Publik (`minja.my.id`) — Simpel, Minimalis, & Sangat Interaktif](#2--halaman-1-landing-page-publik-minjamyid--simpel-minimalis--sangat-interaktif)
3. [👑 HALAMAN 2: Pusat Komando Pemilik / Admin (`rich.minja.my.id/owner`) — Simpel, Dual-Mode (Light/Dark)](#3--halaman-2-pusat-komando-pemilik--admin-richminjamyidowner--simpel-dual-mode-lightdark)
4. [🤝 HALAMAN 3: Portal Mitra Franchise / Kafe (`mitra.minja.my.id/partner`) — Transparan, Dual-Mode](#4--halaman-3-portal-mitra-franchise--kafe-mitraminjamyidpartner--transparan-dual-mode)
5. [🛠️ HALAMAN 4: Meja Kasir Lapangan / Operator POS (`mitra.minja.my.id/operator`) — Cepat, Sentuh, Dual-Mode](#5--halaman-4-meja-kasir-lapangan--operator-pos-mitraminjamyidoperator--cepat-sentuh-dual-mode)
6. [📱 HALAMAN 5: Portal Galeri Handphone Pelanggan (`gallery.minja.my.id/s/:token`) — Ringan & Cepat](#6--halaman-5-portal-galeri-handphone-pelanggan-galleryminjamyidstoken--ringan--cepat)
7. [💡 Panduan Eksekusi di Google Stitch & Ekspor Kode](#7--panduan-eksekusi-di-google-stitch--ekspor-kode)

---

## 1. 🚀 FORMAT KHUSUS KOLOM "ADDITIONAL INSTRUCTIONS" DI GOOGLE STITCH

> 📌 **CARA PAKAI DI GOOGLE STITCH:**  
> Salin seluruh teks di dalam kotak kode di bawah ini, lalu tempelkan (*paste*) langsung ke kolom **"Additional instructions"** (atau *System Prompt / Project Instructions / Context*) di pengaturan proyek Google Stitch Anda.  
> Teks ini menjadi **instruksi sistem permanen** yang mengunci bahasa, tema terang/gelap, filosofi desain, dan batas rute di seluruh layar yang Anda buat.

### 📋 Salin Teks Ini ke Kolom "Additional Instructions":

```text
ROLE & IDENTITAS:
Kamu adalah Principal Product Designer kelas dunia untuk "Minja Photobooth & Cloud Platform". Rancang antarmuka web modern, segar, minimalis, dan sangat mudah digunakan orang awam tanpa terpaku pada template SaaS klise.

FILOSOFI DESAIN UTAMA:
- Estetika Minimalis Modern (Linear & Apple style): Ruang bernafas lega (generous whitespace), garis batas ultra-tipis (1px hairline), bayangan mikro lembut, sudut membulat modern (rounded-2xl).
- Simpel & Bebas Hambatan (Frictionless): Navigasi intuitif yang dipahami dalam 3 detik tanpa buku panduan.
- Interaktif & Ramah Sentuhan (Touch-First): Target sentuh tombol minimal 44x44px dengan efek tekan balik yang nyata.

EKOSISTEM 5 HALAMAN & URL RESMI:
1. minja.my.id ➔ Landing Page Publik (Wajah Utama Minja: Sangat minimalis, interaktif, simulator frame foto, kalkulator sewa).
2. rich.minja.my.id/owner ➔ Pusat Komando Pemilik (Dashboard eksekutif, armada kiosk, generator PASS-XXXX, dual-mode Terang/Gelap).
3. mitra.minja.my.id/partner ➔ Portal Mitra Franchise/Kafe (Bagi hasil transparan, kustomisasi struk promo kafe, kupon, dual-mode Terang/Gelap).
4. mitra.minja.my.id/operator ➔ Meja Kasir Layar Sentuh POS (Kasir sentuh cepat tablet/laptop, tiket sesi tunai, cek alat, dual-mode Terang/Gelap).
5. gallery.minja.my.id/s/[token] ➔ Portal Galeri Handphone (Mobile view privat 48 jam, 1-klik unduh ZIP, pemutar video Reels 9:16).

ATURAN SISTEM MUTLAK (SYSTEM GUARDRAILS):
1. 100% BAHASA INDONESIA:
   - Seluruh teks (judul, label, tombol, status, tabel, dan pesan dialog) WAJIB dalam Bahasa Indonesia alami, santun, dan profesional.
   - Dilarang keras memakai "Lorem Ipsum", nama asing "John Doe", atau simbol dollar ($). Gunakan Rupiah ("Rp 35.000"), lokasi lokal ("Mall Grand Indonesia"), dan nama Indonesia ("Budi Santoso", "Siti Rahma").
   - Dilarang menampilkan jargon pengembang teknis ("300 DPI", "FFmpeg", "libvips", "Database Sync", "JWT"). Ganti dengan bahasa awam yang ramah ("Foto Kualitas Studio", "Menyiapkan Video Momen...", "Data Tersinkron").

2. DUAL-MODE THEME TOGGLE (MODE TERANG & GELAP):
   - Tiga portal manajemen (/owner, /partner, /operator) WAJIB menyediakan tombol sakelar tema [☀️ Mode Terang] dan [🌙 Mode Gelap] di bilah atas.
   - Mode Terang: Latar putih bersih/kertas halus, kartu abu-abu muda berbayang mikro, kontras teks tajam (optimal untuk kasir di kafe/mall terang).
   - Mode Gelap: Latar obsidian elegan, kartu glassmorphism transparan halus, teks putih bersih tanpa silau.

3. BEBAS KUNCI WARNA (COLOR-AGNOSTIC SEMANTIC SYSTEM):
   - Jangan mengunci kode warna hex (#hex) kaku. Gunakan hierarki semantik: Warna Latar/Permukaan, Warna Teks Kontras, Warna Teks Muted, Warna Aksen Utama (Brand CTA), dan Warna Lencana Status. Pemilik dapat mengganti palet warna branding secara fleksibel.
```

---

## 2. 🌐 HALAMAN 1: Landing Page Publik (`minja.my.id`) — Simpel, Minimalis, & Sangat Interaktif

**Peran Halaman:** Ini adalah **wajah utama Minja** di mata publik, calon penyewa acara (pernikahan, pesta ulang tahun, pensi, event kantor), dan pengunjung kafe. Desainnya harus **sangat simpel, minimalis, tidak membosankan, dan interaktif** (bukan sekadar brosur statis panjang).

### 📋 Salin Teks Prompt Halaman 1:

```text
Rancang Landing Page yang sangat segar, minimalis, berkelas, dan INTERAKTIF untuk "Minja Photobooth" (minja.my.id) — photobooth mandiri layar sentuh kualitas lab studio foto.

Konsep: "The Interactive Living Canvas". Halaman ini adalah wajah utama merek Minja. Harus terasa hidup, bersih, bernafas lega, dan langsung memikat pengunjung sejak detik pertama melalui simulasi interaktif tanpa perlu membaca teks yang panjang.

Seluruh teks WAJIB 100% menggunakan Bahasa Indonesia.

STRUKTUR DAN KOMPONEN INTERAKTIF:

1. Navigasi Atas (Bilah Kaca Minimalis / Floating Pill Header):
   - Kiri: Logo Minja bergaris tipis modern dengan titik kilau kamera.
   - Tengah: Tautan ringkas ("Fitur", "Simulasi Foto", "Paket Sewa", "Ulasan").
   - Kanan: Tombol aksi utama "Cek Jadwal Tanggal Acara" dan ikon WhatsApp melayang dengan status "Admin Siaga Online".

2. Panggung Utama (Hero Section) dengan WIDGET SIMULATOR INTERAKTIF:
   - Judul Besar Minimalis: "Momen Bahagiamu, Terabadikan Sempurna."
   - Subjudul Singkat: "Photobooth mandiri layar sentuh dengan cetak fisik studio instan dan unduhan video momen langsung ke smartphone."
   - FITUR INTERAKTIF UTAMA (Interactive Photobooth Playground):
     * Di tengah hero, tampilkan widget simulasi frame foto interaktif berukuran besar.
     * Ada tombol sentuh "Uji Coba Jepret Foto" yang memunculkan efek kilatan lampu studio putih sesaat dan suara rana kamera.
     * Pengunjung web bisa menggeser (slider) pilihan frame: [Strip Klasik 2x6], [Kotak Grid 4R], dan [Kolase Modern].
     * Pengunjung bisa mengklik tab filter warna interaktif langsung di layar: [Korean Natural], [Vintage 90-an], dan [Hitam Putih Sinematik] untuk melihat perubahan foto seketika.
   - Dua Tombol CTA di Bawah Simulator:
     * Tombol Utama: "Konsultasikan Acara Anda"
     * Tombol Pendukung: "Lihat Video Contoh Acara"

3. Bagian Interaktif: Kalkulator Estimasi Biaya Sewa Acara (Event Estimator):
   - Pengunjung bisa menggeser tombol durasi: [2 Jam] • [4 Jam] • [Seharian Penuh].
   - Pilihan Jenis Acara: [Pernikahan] • [Pesta Ulang Tahun] • [Acara Kantor / Pameran].
   - Layar otomatis menampilkan estimasi jumlah lembar foto yang bisa dicetak, jumlah operator pendamping, dan kisaran harga transparan secara real-time.
   - Tombol langsung: "Kunci Jadwal Tanggal Ini via WhatsApp".

4. Galeri Momen Bergulir Halus (Kinetic Masonry Showcase):
   - Deretan foto strip hasil cetak nyata dari tamu acara pernikahan dan kafe yang dipajang miring artistik dengan bayangan lembut.
   - Saat kursor mouse melintas (hover), foto sedikit terangkat dan memutar video klip 3 detik di dalam frame.

5. Tiga Pilar Nilai Minja (Bento Box Bersih & Minimalis):
   - Kotak 1: "Cetak Lab Foto Tahan Air" — Kertas foto tebal kualitas studio tahan air dan anti luntur bertahun-tahun.
   - Kotak 2: "Video Klip Momen 9:16" — Tamu bisa scan QR dan langsung dapat video klip bergerak siap post ke Instagram Reels & TikTok.
   - Kotak 3: "Desain Frame Eksklusif" — Desain bingkai foto dikustomisasi khusus memuat nama mempelai atau logo perusahaan.

6. Pertanyaan Umum yang Sering Ditanyakan (Accordion Minimalis):
   - FAQ interaktif yang membuka dengan mulus: Berapa daya listrik yang dibutuhkan? Berapa lama persiapan pemasangan booth? Area jangkauan layanan?

7. Kaki Halaman (Minimalist Footer):
   - Teks penutup hangat: "Siap membuat acaramu tak terlupakan?".
   - Informasi kontak studio, tautan ke Portal Pemilik (rich.minja.my.id/owner) dan Portal Mitra (mitra.minja.my.id/partner), serta hak cipta Minja.
```

---

## 3. 👑 HALAMAN 2: Pusat Komando Pemilik / Admin (`rich.minja.my.id/owner`) — Simpel, Dual-Mode (Light/Dark)

**Peran Halaman:** Dashboard pemilik (*Super Admin*) untuk memantau performa bisnis di smartphone maupun laptop. Desainnya harus **sangat simpel, data disajikan to-the-point tanpa grafik yang membingungkan**, dan wajib memiliki **sakelar Mode Terang / Mode Gelap**.

### 📋 Salin Teks Prompt Halaman 2:

```text
Rancang Dashboard Manajemen Eksekutif yang sangat simpel, modern, dan mudah digunakan untuk "Pusat Komando Pemilik Minja Cloud" (rich.minja.my.id/owner).

FITUR KHUSUS TEMA:
Sediakan tombol sakelar tema yang jelas di pojok kanan atas: [☀️ Mode Terang] dan [🌙 Mode Gelap].
- Mode Terang: Latar putih bersih, kartu abu-abu muda dengan bayangan halus, teks hitam pekat berhierarki jelas.
- Mode Gelap: Latar obsidian elegan, kartu transparan halus, teks putih terang.

Seluruh teks dan metrik WAJIB 100% menggunakan Bahasa Indonesia.

STRUKTUR & TATA LETAK:

1. Bilah Navigasi Atas:
   - Kiri: Logo Minja Cloud Vault dengan lencana "Pemilik Utama".
   - Tengah: Ringkasan Cepat: "3 Mesin Aktif • 1 Mesin Sedang Berfoto • 0 Kendala".
   - Kanan:
     * Sakelar Tema: Ikon Matahari / Bulan untuk beralih Terang/Gelap.
     * Indikator status database pusat (Lampu hijau berkedip: "Data Terhubung Real-Time").
     * Tombol "Keluar Akun".

2. Baris Metrik Utama (4 Kartu Angka Besar — Sangat Mudah Dibaca):
   - Kartu 1: "Pendapatan Hari Ini" (Angka raksasa tebal: "Rp 2.450.000" dengan indikator "+18% dibanding kemarin").
   - Kartu 2: "Rincian Pembayaran" ("QRIS: Rp 1.950.000 • Tunai Kasir: Rp 500.000").
   - Kartu 3: "Aktivitas Foto" ("68 Sesi • 146 Lembar Dicetak").
   - Kartu 4: "Total Sisa Kertas Armada" (Grafik lingkaran minimalis: "85% Kertas Tersedia di Semua Mesin").

3. Pemantau Kondisi Mesin Lapangan (Kartu Armada):
   - Tampilkan kartu untuk masing-masing booth fisik (misal: "Kiosk 01 — Mall Grand Indonesia"):
     * Status Nyata: [HIJAU - SIAGA] atau [KUNING - SEDANG DIGUNAKAN PELANGGAN] atau [MERAH - PERAWATAN].
     * Sisa Kertas Cetak: "Tersisa 285 dari 700 lembar kertas foto".
     * Tiga Tombol Aksi Langsung:
       1. "Kunci Mesin Darurat" (Sakelar merah 1-klik untuk menampilkan layar perawatan di booth).
       2. "Tes Cetak Jarak Jauh" (Tombol uji coba printer dari jarak jauh).
       3. "Sinkronkan Ulang Data".

4. Generator Kode Akses Tunai Sesi (PASS-XXXX Module):
   - Fitur cepat bagi pemilik untuk menerbitkan kode 4 digit bagi pelanggan yang transfer manual atau bayar tunai di lokasi:
     * Pilihan Mesin: Dropdown pilih Kiosk 01, Kiosk 02, atau Kiosk 03.
     * Pilihan Paket Foto: [Paket Solo] • [Paket Berdua] • [Paket Rame-Rame].
     * Tombol Menonjol: "Buat Kode Akses Sekarang".
     * Output Besar: "PASS-4921" lengkap dengan tombol "Salin Teks ke WhatsApp Pelanggan".
   - Tabel riwayat kode aktif: Kode, Waktu Dibuat, Status (Siap Pakai / Sudah Digunakan).

5. Tabel Transaksi Hari Ini (Sederhana & Bersih):
   - Kolom rapi: Jam Transaksi, Nama Mesin, Paket, Metode (QRIS Bank / Tunai / Kode Akses), Nominal Masuk.
   - Tombol di pojok tabel: "Unduh Rekap Laporan (Excel/CSV)".
```

---

## 4. 🤝 HALAMAN 3: Portal Mitra Franchise / Kafe (`mitra.minja.my.id/partner`) — Transparan, Dual-Mode

**Peran Halaman:** Portal khusus bagi mitra pemilik lokasi (misal: pemilik kafe atau pengelola mall tempat booth diletakkan) untuk melihat bagi hasil komisi secara transparan, mencairkan saldo, dan mengatur promosi toko mereka di struk booth. Desain harus **simpel, bersih, tidak rumit, dan mendukung Mode Terang / Gelap**.

### 📋 Salin Teks Prompt Halaman 3:

```text
Rancang Portal Mitra Franchise & Pengelola Lokasi yang simpel, transparan, dan terpercaya untuk "Portal Mitra Minja" (mitra.minja.my.id/partner).

FITUR KHUSUS TEMA:
Sediakan sakelar pengubah tema di pojok atas: [☀️ Mode Terang] dan [🌙 Mode Gelap] agar pengelola kafe nyaman membukanya di bawah terik lampu kafe maupun suasana malam.

Seluruh teks WAJIB 100% menggunakan Bahasa Indonesia yang profesional dan transparan.

STRUKTUR & FITUR UTAMA:

1. Bilah Atas:
   - Kiri: Logo Minja Partner & Nama Cabang Kafe (contoh: "Kopi Kenangan — Cabang Kelapa Gading").
   - Kanan: Sakelar Tema Terang/Gelap, Pilihan Cabang Booth (jika mitra punya lebih dari 1 lokasi), dan Tombol Keluar.

2. Tiga Kartu Finansial Bagi Hasil (Fokus Utama Mitra):
   - Kartu 1: "Saldo Komisi Siap Ditarik" (Angka besar: "Rp 4.850.000").
     * Tombol Aksi Utama di dalam kartu: "Ajukan Penarikan Dana ke Rekening Bank".
     * Catatan: "Bagi hasil 30% dihitung otomatis setiap transaksi berhasil".
   - Kartu 2: "Total Omzet Booth Bulan Ini" ("Rp 16.200.000").
   - Kartu 3: "Total Pengunjung Berfoto" ("342 Orang Bulan Ini").

3. Grafik Sederhana Tren Penghasilan Mitra:
   - Grafik batang minimalis yang membandingkan pendapatan hari kerja (weekdays) dan akhir pekan (weekends) agar mitra tahu hari paling ramai.

4. Kustomisasi Struk Kasir Kertas Thermal (Promosi Kafe Mitra):
   - Antarmuka visual yang menampilkan pratinjau struk kasir yang keluar dari booth.
   - Mitra kafe bisa mengatur promosi mereka sendiri:
     * Kolom input: "Pesan Promo Kafe di Atas Struk" (contoh: "Bawa struk ini ke kasir kafe untuk diskon 15% semua minuman kopi!").
     * Unggah logo kafe mereka untuk dicetak di kepala struk.
     * Tombol: "Simpan Pengaturan Struk".

5. Kelola Kupon Diskon Photobooth Khusus Pelanggan Kafe:
   - Mitra bisa membuat kupon diskon (contoh: KODE: KOPIHEMAT, Potongan Rp 5.000) untuk dibagikan ke pembeli kopi agar mencoba photobooth.
   - Tabel kupon aktif, batas kuota, dan tombol "+ Buat Kupon Baru".
```

---

## 5. 🛠️ HALAMAN 4: Meja Kasir Lapangan / Operator POS (`mitra.minja.my.id/operator`) — Cepat, Sentuh, Dual-Mode

**Peran Halaman:** Antarmuka khusus petugas kasir lapangan (sering dijalankan di tablet 10 inci atau laptop kasir toko). Desain harus **berkontras tinggi, tombol raksasa yang tidak mungkin salah tekan, serba 1-klik, dan mendukung Mode Terang / Gelap**.

### 📋 Salin Teks Prompt Halaman 4:

```text
Rancang Antarmuka Meja Kasir Layar Sentuh Cepat (Touchscreen POS) untuk petugas lapangan "Meja Kasir Minja" (mitra.minja.my.id/operator).

FITUR KHUSUS TEMA & ERGONOMI:
- Sediakan sakelar [☀️ Terang] / [🌙 Gelap] di sudut atas.
- Mode Terang sangat penting untuk tablet kasir yang diletakkan di bawah pencahayaan lampu toko yang terang.
- Seluruh tombol interaktif berukuran BESAR, ramah sentuhan jari (finger-friendly), dengan jeda ruang yang mencegah kasir salah ketuk saat antrean sedang ramai.

Seluruh teks WAJIB 100% menggunakan Bahasa Indonesia.

STRUKTUR LAYAR SENTUH CEPAT (DIBAGI 2 KOLOM RAPI):

1. Bilah Informasi Singkat (Atas):
   - Lokasi: "Kasir Booth 01 — Mall Grand Indonesia" • Petugas Jaga: "Andi Pratama" • Sakelar Terang/Gelap • Tombol Ganti Shift.

2. Terminal Kasir Pembayaran Tunai (Kolom Kiri - 60% Layar):
   - Langkah 1: Pilih Paket (3 Tombol Kotak Besar Berikon):
     * [Paket Solo — Rp 25.000]
     * [Paket Berdua — Rp 35.000]
     * [Paket Rame-Rame — Rp 50.000]
   - Langkah 2: Total Tagihan Terpampang Raksasa: "Rp 35.000".
   - Langkah 3: Tombol Cepat Uang Pelanggan:
     * Tombol: [Uang Pas] • [Rp 50.000] • [Rp 100.000] • [Ketik Manual].
   - Langkah 4: Kalkulator Kembalian Otomatis (Huruf Hijau Besar Bersih):
     * "Uang Diterima: Rp 50.000"
     * "Uang Kembalian: Rp 15.000" (Sangat jelas dan bebas kesalahan hitung).
   - Tombol Raksasa Utama di Bawah:
     * "KONFIRMASI BAYAR & AKTIFKAN KAMERA BOOTH" (Begitu ditekan, mesin photobooth langsung berbunyi dan membuka layar kamera).

3. Panel Terbitkan Tiket Kode Akses (Kolom Kanan - 40% Layar):
   - Jika pelanggan ingin membayar tunai tetapi antreannya nanti:
     * Tekan tombol: "Terbitkan Tiket Sesi".
     * Muncul kotak besar dengan 4 angka tebal: "PASS-7821".
     * Panduan Petugas: "Berikan 4 angka ini ke pelanggan untuk diketik di layar sentuh booth saat gilirannya tiba."
     * Tombol cepat: "Cetak Tiket Kertas Struk".

4. Bilah Cek Kesehatan Alat Booth (Bawah Layar):
   - 4 Indikator Lingkaran:
     * Kamera Booth: Normal
     * Kertas Printer: 285 Lembar Tersisa (Aman)
     * Sambungan Internet: Lancar
     * Status Layar Booth: Siap Digunakan
   - Tombol Darurat: "Kunci Mesin (Sedang Isi Kertas)" jika ada kendala di mesin.
```

---

## 6. 📱 HALAMAN 5: Portal Galeri Handphone Pelanggan (`gallery.minja.my.id/s/:token`) — Ringan & Cepat

**Peran Halaman:** Layanan unduh foto dan video yang dibuka di smartphone pelanggan setelah memindai QR code di booth. Desain harus **sangat simpel, estetis, fokus 100% pada foto pelanggan, dan proses unduhnya instan**.

### 📋 Salin Teks Prompt Halaman 5:

```text
Rancang Halaman Galeri Foto Handphone yang bersih, minimalis, dan sangat berkelas dalam Bahasa Indonesia untuk "Portal Unduhan Foto Minja" (gallery.minja.my.id/s/[token]).

Konsep: Desain bersih fokus pada keindahan foto pelanggan, tanpa iklan, tanpa formulir yang berbelit-belit, dan sangat cepat dimuat di koneksi 4G/5G handphone.

Seluruh teks WAJIB 100% menggunakan Bahasa Indonesia yang ramah dan bersahabat.

STRUKTUR LAYAR HANDPHONE (MOBILE VIEW):

1. Header Sederhana:
   - Logo Minja Studio berukuran kecil di tengah atas.
   - Lokasi & Tanggal Foto: "Minja Studio • Mall Grand Indonesia • Hari Ini".
   - Spanduk Pengingat Halus: "Foto tersimpan aman di galeri ini selama 48 jam. Segera simpan ke galeri handphone Anda."

2. Tombol Utama Paling Menonjol (Single Primary Action):
   - Tombol besar di bagian atas: "📦 Unduh Semua Foto & Video (ZIP)" dengan info ukuran (contoh: "18.4 MB").
   - Keterangan: "Cukup 1 kali ketuk, seluruh foto berbingkai, foto pose asli, dan video klip langsung tersimpan di handphone Anda tanpa terblokir popup."

3. Tampilan Hasil Cetak Foto Bingkai (Hero Preview):
   - Pratinjau lembar foto berbingkai komposit dengan sudut melengkung halus dan bayangan estetik.
   - Ketuk foto untuk membuka tampilan layar penuh (zoom HD).
   - Tombol pendukung di bawah foto: "Simpan Foto Lembaran Ini" dan "Bagikan ke WhatsApp".

4. Pemutar Video Momen Pilihan (Siap Reels & TikTok 9:16):
   - Kartu video vertikal format 9:16 dengan tombol putar/jeda yang anggun.
   - Teks keterangan: "Dilengkapi musik latar santai dan suara kamera, pas untuk diunggah ke Instagram Reels, TikTok, atau WhatsApp Story."
   - Tombol aksi: "Unduh Video Momen (9:16)".

5. Koleksi Foto Satuan Mentah:
   - Deretan 3 kolom foto pose asli pelanggan sebelum digabung ke bingkai.
   - Tombol kecil di tiap foto: "Simpan Pose Ini".

6. Bagian Bawah:
   - Teks ajakan manis: "Terima kasih sudah berfoto bersama Minja! Jangan lupa tag Instagram kami di @minjastudio ya ✨".
```

---

## 7. 💡 Panduan Eksekusi di Google Stitch & Ekspor Kode

1. **Urutan Pengerjaan yang Dianjurkan:**
   - **Langkah 1:** Tempelkan isi **[Bagian 1: Additional Instructions](#1--format-khusus-kolom-additional-instructions-di-google-stitch)** ke kolom *Additional instructions / System Prompt* di pengaturan proyek Google Stitch Anda.
   - **Langkah 2:** Masukkan prompt **Halaman 1 (Landing Page di `minja.my.id`)** untuk menetapkan standar visual dan interaktivitasnya.
   - **Langkah 3:** Masukkan prompt **Halaman 2 (Owner Portal di `rich.minja.my.id/owner`)** dan perhatikan sakelar Mode Terang & Gelapnya.
   - **Langkah 4:** Teruskan berturut-turut untuk **Halaman 3 (`mitra.minja.my.id/partner`)**, **Halaman 4 (`mitra.minja.my.id/operator`)**, dan **Halaman 5 (`gallery.minja.my.id/s/[token]`)**.

2. **Perintah Meminta Kode Jadi React + Tailwind CSS:**
   Setelah desain visual di Stitch sesuai dengan yang Anda inginkan, mintalah kodenya dengan perintah:
   ```text
   Ekspor rancangan desain ini menjadi komponen React 18 + Tailwind CSS modular.
   - Gunakan paket ikon 'lucide-react'.
   - Pisahkan tombol sakelar tema Dark/Light Mode menggunakan state sederhana (isDarkMode).
   - Pastikan seluruh nama properti data sesuai dengan Bahasa Indonesia yang sudah dirancang.
   ```

3. **Penyelarasan dengan Backend VPS:**
   Seluruh alur data pada prompt di atas (seperti nomor urut mesin, kode akses `PASS-XXXX`, status kertas printer, dan link galeri 48 jam) **sudah 100% selaras** dengan arsitektur backend Fastify dan database PostgreSQL Supabase yang telah aktif di server VPS Anda.
