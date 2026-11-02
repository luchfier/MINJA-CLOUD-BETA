// minja-cloud/frontend/src/pages/public/landing/translations.ts
// Data teks terjemahan bilingual (ID / EN) untuk Landing Page Minja Studio

export type Language = 'id' | 'en';

export interface LandingTranslations {
  page_title: string;
  nav_home: string;
  nav_about: string;
  nav_rent: string;
  nav_partner: string;
  admin_status: string;
  chat_admin_btn: string;
  hero_badge: string;
  hero_title: string;
  hero_title_highlight: string;
  hero_desc: string;
  hero_cta_primary: string;
  showcase_badge: string;
  showcase_sub: string;
  showcase_studio_vibes: string;
  showcase_strip_label: string;
  showcase_experience_tag: string;
  showcase_title: string;
  f1_highlight_title: string;
  f1_highlight_desc: string;
  f2_highlight_title: string;
  f2_highlight_desc: string;
  f3_highlight_title: string;
  f3_highlight_desc: string;
  service_crew: string;
  service_setup: string;
  pillars_tag: string;
  pillars_title: string;
  p1_number: string;
  p1_title: string;
  p1_desc: string;
  p1_badge_left: string;
  p1_badge_right: string;
  p2_number: string;
  p2_title: string;
  p2_desc: string;
  p2_badge_left: string;
  p2_badge_right: string;
  p3_number: string;
  p3_title: string;
  p3_desc: string;
  p3_badge_left: string;
  p3_badge_right: string;
  layouts_tag: string;
  layouts_title: string;
  layouts_sub: string;
  layout_strip_badge: string;
  layout_single_badge_1: string;
  layout_single_badge_2: string;
  layout_grid_badge_1: string;
  layout_grid_badge_2: string;
  f1_title: string;
  f1_desc: string;
  f2_title: string;
  f2_desc: string;
  f2_quote: string;
  f2_date: string;
  f3_title: string;
  f3_desc: string;
  stats_tag: string;
  stats_title: string;
  stat_smiles: string;
  stat_smiles_sub: string;
  stat_sessions: string;
  stat_sessions_sub: string;
  stat_quality: string;
  stat_quality_sub: string;
  stat_spots: string;
  stat_spots_sub: string;
  event_tag: string;
  event_title: string;
  event_desc: string;
  event_cta: string;

  // Footer Bilingual
  footer_quote: string;
  footer_whatsapp: string;
  footer_nav_title: string;
  footer_gallery: string;
  footer_hours_title: string;
  footer_days_weekday: string;
  footer_hours_weekday: string;
  footer_days_weekend: string;
  footer_hours_weekend: string;
  footer_event_247: string;
  footer_copyright: string;

  // Sub-View: About
  about_back_btn: string;
  about_badge_top: string;
  about_badge_hero: string;
  about_hero_title: string;
  about_hero_title_highlight: string;
  about_hero_desc: string;
  about_cta_consult: string;
  about_cta_explore: string;
  about_quote_heart: string;
  about_photo_badge_1: string;
  about_photo_badge_2: string;
  about_story_tag: string;
  about_story_title: string;
  about_story_p1: string;
  about_story_p2: string;
  about_story_p3: string;

  // Sub-View: Rent
  rent_back_btn: string;
  rent_badge_top: string;
  rent_badge_hero: string;
  rent_hero_title: string;
  rent_hero_title_highlight: string;
  rent_hero_desc: string;
  rent_f1_title: string;
  rent_f1_sub: string;
  rent_f2_title: string;
  rent_f2_sub: string;
  rent_f3_title: string;
  rent_f3_sub: string;
  rent_f4_title: string;
  rent_f4_sub: string;
  rent_packages_tag: string;
  rent_packages_title: string;
  rent_packages_sub: string;
  rent_p1_badge: string;
  rent_p1_duration: string;
  rent_p1_name: string;
  rent_p1_desc: string;
  rent_p1_price: string;
  rent_p1_price_sub: string;
  rent_p1_f1: string;
  rent_p1_f2: string;
  rent_p1_f3: string;
  rent_p1_f4: string;
  rent_p1_cta: string;
  rent_p2_badge_top: string;
  rent_p2_badge: string;
  rent_p2_duration: string;
  rent_p2_name: string;
  rent_p2_desc: string;
  rent_p2_price: string;
  rent_p2_price_sub: string;
  rent_p2_f1: string;
  rent_p2_f2: string;
  rent_p2_f3: string;
  rent_p2_f4: string;
  rent_p2_cta: string;
  rent_p3_badge: string;
  rent_p3_duration: string;
  rent_p3_name: string;
  rent_p3_desc: string;
  rent_p3_price: string;
  rent_p3_price_sub: string;
  rent_p3_f1: string;
  rent_p3_f2: string;
  rent_p3_f3: string;
  rent_p3_cta: string;

  // Sub-View: Partner
  partner_back_btn: string;
  partner_badge_top: string;
  partner_badge_hero: string;
  partner_hero_title: string;
  partner_hero_title_highlight: string;
  partner_hero_desc: string;
  partner_cta_apply: string;
  partner_cta_learn: string;
  partner_stat_spots: string;
  partner_stat_cost: string;
  partner_stat_maintenance: string;
  partner_card_title: string;
  partner_card_slot: string;
  partner_features_tag: string;
  partner_features_title: string;
  partner_features_sub: string;
  partner_f1_tag: string;
  partner_f1_title: string;
  partner_f1_desc: string;
  partner_f1_highlight: string;
  partner_f2_tag: string;
  partner_f2_title: string;
  partner_f2_desc: string;
  partner_f2_highlight: string;
  partner_f3_tag: string;
  partner_f3_title: string;
  partner_f3_desc: string;
  partner_f3_highlight: string;
}

export const TRANSLATIONS: Record<Language, LandingTranslations> = {
  id: {
    page_title: 'Minja Booth — Platform Self-Service Photobooth',
    nav_home: 'Beranda',
    nav_about: 'Tentang Minja',
    nav_rent: 'Sewa Buat Acara',
    nav_partner: 'Jadi Mitra Minja',
    admin_status: 'Admin Siaga Online',
    chat_admin_btn: 'Buka Gallery kamu',
    hero_badge: 'FOTO SERU BARENG MINJA • SIMPAN KENANGAN MANIS',
    hero_title: 'Momen Bahagia Bareng Sahabat, Sayang Banget Kalau Cuma Lewat.',
    hero_title_highlight: 'Sayang Banget Kalau Cuma Lewat.',
    hero_desc:
      'Photobooth mandiri dengan pencahayaan studio yang bikin wajah fresh dan glowing alami. Hasil cetak fotonya tebal, warnanya cakep, plus video seru pas pose langsung masuk ke HP kamu.',
    hero_cta_primary: 'Atur Acara Kamu',
    showcase_badge: 'BOOTH FOTO PRIBADI SIAP PAKAI',
    showcase_sub: 'RUANG EKSPLORASI GAYA',
    showcase_studio_vibes: 'Vibes Studio Mandiri',
    showcase_strip_label: 'STRIP KLASIK',
    showcase_experience_tag: 'PENGALAMAN FOTO SERU',
    showcase_title: 'Bebas Berekspresi, Simpan Cerita Paling Asli',
    f1_highlight_title: 'Pencahayaan Glowing Alami',
    f1_highlight_desc:
      'Tone kulit langsung fresh, lembut, dan natural di setiap jepretan tanpa perlu sentuhan filter tambahan.',
    f2_highlight_title: 'Video Momen Bergerak',
    f2_highlight_desc:
      'Klip video candid pas kamu lagi pose seru langsung tersimpan ke HP, siap di-share ke Instagram Story & TikTok.',
    f3_highlight_title: 'Desain Frame Gemas & Kekinian',
    f3_highlight_desc:
      'Banyak pilihan bingkai estetik bergaya minimalis Jepang dan Korea yang manis dan cocok buat memorabilia abadi.',
    service_crew: 'Didampingi Kru Minja Ramah Selama Acara',
    service_setup: 'Gratis Pasang Area Kota',
    pillars_tag: 'KENAPA HARUS MINJA?',
    pillars_title: 'Biar Momen Manis Nggak Cuma Numpuk di HP, Tapi Nyata Disimpan.',
    p1_number: '01 / Sentuhan Hangat',
    p1_title: 'Cetak Foto Tahan Lama',
    p1_desc:
      'Kertas tebal anti air dan nggak gampang luntur. Mau sering dipegang atau dipajang bertahun-tahun, warnanya tetap cakep.',
    p1_badge_left: 'TAHAN AIR & ANTI PUDAR',
    p1_badge_right: 'AWET BANGET',
    p2_number: '02 / Akses Privat',
    p2_title: 'Scan QR Langsung Masuk HP',
    p2_desc:
      'Tinggal scan sekali di bilik booth, semua foto dan klip video seru langsung tersimpan rapi di HP tanpa perlu instal aplikasi tambahan.',
    p2_badge_left: 'LANGSUNG KE PONSEL',
    p2_badge_right: 'SUPER CEPAT',
    p3_number: '03 / Sentuhan Personal',
    p3_title: 'Desain Frame Sesuai Visi Kamu',
    p3_desc:
      'Bisa pasang nama nikahan, tanggal pesta, atau ucapan khusus. Pas banget jadi cinderamata yang berkesan buat tamu undangan.',
    p3_badge_left: 'NAMA & PESAN MANIS',
    p3_badge_right: 'BISA CUSTOM',
    layouts_tag: 'PILIHAN FRAME FAVORIT',
    layouts_title: 'Ragam Tata Letak & Bingkai Lucu',
    layouts_sub: 'Banyak pilihan layout gemas yang siap langsung dicetak dalam hitungan detik!',
    layout_strip_badge: 'STRIP KLASIK',
    layout_single_badge_1: 'KARTU MOMEN TUNGGAL',
    layout_single_badge_2: 'CINDERAMATA',
    layout_grid_badge_1: 'KOLASE BEREMPAT',
    layout_grid_badge_2: 'PENUH TAWA',
    f1_title: 'Foto Strip Kenangan',
    f1_desc:
      'Format strip klasik memanjang berisi rangkaian pose bersambung, pas dan praktis dibagi dua bersama sahabat atau pasangan.',
    f2_title: 'Single Cut',
    f2_desc:
      'Satu foto berbingkai lega dan fokus dengan ruang catatan pesan manis, anggun dan abadi untuk cinderamata istimewa.',
    f2_quote: 'Pernikahan Sarah & Reza',
    f2_date: '24 OKTOBER 2026 • CINDERAMATA PENUH ARTI',
    f3_title: 'Kolase Cerita',
    f3_desc:
      'Tata letak multi-pose dalam satu lembar cetak harmonis, merangkum berbagai momen seru dan tawa riang sekaligus.',
    stats_tag: 'BUKTI KASIH & KEPERCAYAAN',
    stats_title: 'Ribuan Senyum Tulus yang Sudah Nyata Tersimpan',
    stat_smiles: 'Senyuman Terabadikan',
    stat_smiles_sub: 'Tamu dan sahabat yang puas berbagi pose ceria.',
    stat_sessions: 'Sesi Foto Dicetak',
    stat_sessions_sub: 'Lembar fisik berkualitas lab & klip video ke HP.',
    stat_quality: 'Kepuasan Kualitas Cetak',
    stat_quality_sub: 'Warna akurat, tahan air, dan awet bertahun-tahun.',
    stat_spots: 'Titik Booth & Acara',
    stat_spots_sub: 'Mulai dari intimate wedding hingga kafe ternama.',
    event_tag: 'PERNIKAHAN, PESTA & KAFE',
    event_title: 'Booth Elegan & Ringkas, Bikin Suasana Acara Makin Hidup.',
    event_desc:
      'Booth minimalis berbahan kayu alami yang menyatu manis di dekorasi pesta maupun kafe santai. Kabel rapi tanpa berserakan, didampingi kru ramah Minja yang siap bantu kapan saja.',
    event_cta: 'Yuk, Cek Tanggal Acara Kamu',

    // Footer
    footer_quote:
      '"Menyimpan kilas tawa, kehangatan momen personal, dan kebersamaan otentik tanpa batasan fotografer. Abadikan cerita Anda dengan sentuhan studio mandiri."',
    footer_whatsapp: 'WhatsApp Minja Resmi',
    footer_nav_title: 'NAVIGASI STUDIO',
    footer_gallery: 'Galeri Online Tamu',
    footer_hours_title: 'JAM OPERASIONAL',
    footer_days_weekday: 'Senin – Kamis',
    footer_hours_weekday: '10.00 – 21.00 WIB',
    footer_days_weekend: 'Jumat – Minggu',
    footer_hours_weekend: '09.00 – 22.00 WIB',
    footer_event_247: 'Layanan Sewa Acara 24/7 Terjadwal',
    footer_copyright: '© 2026 Minja Studio SELF-SERVE PHOTOBOOTH. Seluruh hak cipta dilindungi.',

    // Sub-View: About
    about_back_btn: 'Kembali ke Beranda',
    about_badge_top: 'Filosofi & Cerita Minja',
    about_badge_hero: 'CERITA DI BALIK MINJA • DARI HATI UNTUK KENANGANMU',
    about_hero_title: 'Bukan Sekadar Ambil Foto,',
    about_hero_title_highlight: 'Tapi Merawat Cerita yang Nyata.',
    about_hero_desc:
      'Di tengah ribuan foto yang menumpuk dan terlupakan di galeri ponsel, Minja hadir mengembalikan kehangatan memegang selembar kenangan fisik yang bisa disentuh, disimpan di dompet, dan ditatap bertahun-tahun kemudian dengan senyum yang sama.',
    about_cta_consult: 'Konsultasi Momen Acara',
    about_cta_explore: 'Jelajahi Beranda',
    about_quote_heart:
      '"Kamera boleh canggih, tapi rasa haru saat memegang cetakan strip basah yang baru keluar dari bilik... itu keajaiban yang tak tergantikan."',
    about_photo_badge_1: 'BILIK BUNGA MATAHARI #01',
    about_photo_badge_2: 'ORIGINAL STRIP MINJA',
    about_story_tag: 'TITIK MULA PERJALANAN',
    about_story_title: 'Kenapa Kami Memulai Minja?',
    about_story_p1:
      'Semua bermula dari keresahan yang begitu dekat: saat kita nongkrong berjam-jam bareng sahabat, menghadiri pesta nikahan kerabat dekat, atau merayakan kelulusan, kita sering berfoto puluhan kali. Namun esok harinya, foto-foto itu terkubur ribuan tangkapan layar lain di memori ponsel.',
    about_story_p2:
      'Kami rindu masa ketika selembar foto fisik diselipkan di balik casing HP, ditempel di dinding kamar kos dengan selotip kertas, atau dibuka kembali dari dompet lusuh dengan senyum yang sama hangatnya.',
    about_story_p3:
      'Minja dirancang sebagai bilik foto mandiri (self-serve photobooth) yang memberi ruang privat sepenuhnya. Tanpa juru foto yang mengarahkan gaya, kamu dan orang tersayang bebas menjadi diri sendiri: tertawa lepas, berpose konyol, atau sekadar berbagi tatapan bahagia.',

    // Sub-View: Rent
    rent_back_btn: 'Kembali ke Beranda',
    rent_badge_top: 'Layanan Sewa Acara Minja',
    rent_badge_hero: 'SEWA BOOTH ACARA ISTIMEWA • BEBAS RIBET',
    rent_hero_title: 'Bikin Suasana Acaramu',
    rent_hero_title_highlight: 'Makin Hangat & Penuh Tawa.',
    rent_hero_desc:
      'Hadirkan bilik foto kayu estetik dengan cetak kilat kualitas studio tanpa batas untuk pernikahan intim, pesta ulang tahun, maupun gathering kantor yang tak terlupakan.',
    rent_f1_title: 'Cetak Kilat 12 Detik',
    rent_f1_sub: 'Langsung kering & tahan air',
    rent_f2_title: 'Cetak Tak Terbatas',
    rent_f2_sub: 'Semua tamu bawa pulang foto',
    rent_f3_title: 'File & Video ke HP',
    rent_f3_sub: 'Scan QR tanpa instal aplikasi',
    rent_f4_title: '2 Kru Operator Ramah',
    rent_f4_sub: 'Standby bantu tamu berpose',
    rent_packages_tag: 'PILIHAN PAKET TRANSPARAN',
    rent_packages_title: 'Paket Sewa Booth Sederhana Sesuai Kebutuhanmu',
    rent_packages_sub:
      'Semua paket sudah termasuk kru bertugas, kustomisasi nama/tanggal pada frame, dan kertas foto unlimited.',
    rent_p1_badge: 'Intimate & Birthday',
    rent_p1_duration: '2 Jam Acara',
    rent_p1_name: 'Paket Intimate',
    rent_p1_desc: 'Ideal untuk syukuran hangat, pesta ulang tahun, atau makan malam akrab keluarga.',
    rent_p1_price: 'Rp 2.100.000',
    rent_p1_price_sub: 'Termasuk 2 jam cetak sepuasnya',
    rent_p1_f1: 'Cetak tak terbatas (Unlimited)',
    rent_p1_f2: '2 Operator ramah mendampingi',
    rent_p1_f3: 'Kustomisasi nama & tanggal frame',
    rent_p1_f4: 'Properti pose & kacamata unik',
    rent_p1_cta: 'Pilih Paket Intimate',
    rent_p2_badge_top: 'Paling Favorit Pengantin',
    rent_p2_badge: 'Resepsi & Wedding',
    rent_p2_duration: '4 Jam Acara',
    rent_p2_name: 'Paket Pesta Bahagia',
    rent_p2_desc: 'Pilihan nomor 1 untuk resepsi pernikahan, sweet seventeen, & perayaan besar.',
    rent_p2_price: 'Rp 3.450.000',
    rent_p2_price_sub: 'Durasi 4 jam leluasa bagi seluruh tamu',
    rent_p2_f1: 'Cetak tak terbatas (Unlimited 4 Jam)',
    rent_p2_f2: 'Custom template frame eksklusif',
    rent_p2_f3: 'Seluruh soft file & video dikirim ZIP',
    rent_p2_f4: '2 Operator berseragam rapi',
    rent_p2_cta: 'Pilih Paket Terfavorit',
    rent_p3_badge: 'Corporate & Festival',
    rent_p3_duration: '6 Jam Acara',
    rent_p3_name: 'Paket Grand Celebration',
    rent_p3_desc: 'Pesta seharian, gala dinner perusahaan, konser, atau festival kreatif besar.',
    rent_p3_price: 'Rp 4.800.000',
    rent_p3_price_sub: 'Durasi 6 jam penuh kepuasan',
    rent_p3_f1: 'Unlimited cetak 6 jam nonstop',
    rent_p3_f2: 'Branding logo perusahaan di layar booth',
    rent_p3_f3: '3 Operator standby sepanjang acara',
    rent_p3_cta: 'Pilih Paket Grand',

    // Sub-View: Partner
    partner_back_btn: 'Kembali ke Beranda',
    partner_badge_top: 'Kemitraan Ruang Komersial',
    partner_badge_hero: 'PELUANG KEMITRAAN KAFE & RUANG PUBLIK',
    partner_hero_title: 'Ubah Sudut Kosong Kafemu Jadi',
    partner_hero_title_highlight: 'Magnet Pengunjung & Cuan.',
    partner_hero_desc:
      'Tempatkan bilik photobooth kayu minimalis Minja di kafemu. Tanpa biaya sewa mesin yang mahal, bagi hasil transparan, dan bantu kafe kamu makin viral di media sosial.',
    partner_cta_apply: 'Ajukan Lokasi Kafe Kamu',
    partner_cta_learn: 'Pelajari Detail Minja',
    partner_stat_spots: 'Titik Kafe Aktif',
    partner_stat_cost: 'Modal Mesin',
    partner_stat_maintenance: 'Perawatan Gratis',
    partner_card_title: 'Kemitraan Kedai Kopi Minja',
    partner_card_slot: 'Slot Tersedia',
    partner_features_tag: 'KEUNGGULAN OPERASIONAL',
    partner_features_title: 'Kenapa Pemilik Kafe Memilih Minja?',
    partner_features_sub: 'Sistem mandiri tanpa membebani barista atau staf kafe Anda.',
    partner_f1_tag: '01 • RETENSI & VIRALITAS',
    partner_f1_title: 'Daya Tarik Pelanggan Baru',
    partner_f1_desc:
      'Pengunjung datang bukan cuma minum kopi, tapi punya alasan seru berlama-lama, merayakan reuni kecil, dan mengajak teman mereka berfoto.',
    partner_f1_highlight: 'Lama nongkrong naik 25-40 menit',
    partner_f2_tag: '02 • BRANDING BERKELANJUTAN',
    partner_f2_title: 'Promosi Kafe Otomatis',
    partner_f2_desc:
      'Setiap frame foto dan struk memuat logo kafemu atau kupon diskon minuman untuk kunjungan berikutnya yang langsung diunggah ke Instagram Story.',
    partner_f2_highlight: 'Kupon promo minuman otomatis',
    partner_f3_tag: '03 • PASSIVE INCOME',
    partner_f3_title: 'Bagi Hasil Transparan',
    partner_f3_desc:
      'Mesin mandiri melayani pembayaran QRIS langsung tanpa menyita waktu kasir kafe. Omzet harian bisa dipantau real-time dari Partner Portal.',
    partner_f3_highlight: 'Dashboard live partner portal',
  },
  en: {
    page_title: 'Minja Booth — Self-Service Photobooth Platform',
    nav_home: 'Home',
    nav_about: 'About Minja',
    nav_rent: 'Rent for Events',
    nav_partner: 'Partner with Us',
    admin_status: 'Admin Online',
    chat_admin_btn: 'Open your Gallery',
    hero_badge: 'JOYFUL MOMENTS WITH MINJA • TREASURE SWEET MEMORIES',
    hero_title: 'Joyful Moments with Friends, Too Precious to Let Slip Away.',
    hero_title_highlight: 'Too Precious to Let Slip Away.',
    hero_desc:
      'Self-serve photobooth with studio lighting that keeps every smile radiant and natural. Thick lab-grade prints, vibrant colors, plus fun live pose videos delivered straight to your phone.',
    hero_cta_primary: 'Arrange Your Event',
    showcase_badge: 'SELF-SERVE STUDIO BOOTH READY',
    showcase_sub: 'SPACE TO EXPLORE YOUR STYLE',
    showcase_studio_vibes: 'Self-Serve Studio Vibes',
    showcase_strip_label: 'CLASSIC STRIP',
    showcase_experience_tag: 'FUN PHOTO EXPERIENCE',
    showcase_title: 'Express Yourself Freely, Cherish Your Authentic Story',
    f1_highlight_title: 'Natural Glowing Studio Light',
    f1_highlight_desc:
      'Instant fresh, soft, and natural skin tones across every snapshot without needing additional filters.',
    f2_highlight_title: 'Live Motion Videos',
    f2_highlight_desc:
      'Spontaneous candid clips of your poses land directly on your phone, ready for Instagram Stories & TikTok.',
    f3_highlight_title: 'Playful & Trendy Frames',
    f3_highlight_desc:
      'Wide collection of aesthetic Japanese & Korean inspired minimalist frames perfect for eternal keepsakes.',
    service_crew: 'Accompanied by Friendly Minja Crew',
    service_setup: 'Free Setup in City Area',
    pillars_tag: 'WHY CHOOSE MINJA?',
    pillars_title: "Because Sweet Memories Shouldn't Just Sit in Your Phone, but Be Held in Hand.",
    p1_number: '01 / Warm Touch',
    p1_title: 'Long-Lasting Keepsake Prints',
    p1_desc:
      'Thick waterproof archival paper that resists fading. Built to be held often and cherished for years to come.',
    p1_badge_left: 'WATERPROOF & FADE RESISTANT',
    p1_badge_right: 'BUILT TO LAST',
    p2_number: '02 / Private Access',
    p2_title: 'Scan QR Straight to Phone',
    p2_desc:
      'Single QR scan, instant access to all high-res photos and motion clips on your phone without installing any app.',
    p2_badge_left: 'DIRECT TO PHONE',
    p2_badge_right: 'LIGHTNING FAST',
    p3_number: '03 / Personal Touch',
    p3_title: 'Custom Frame Design',
    p3_desc:
      'Customized with wedding names, event dates, or party messages. The most heartfelt keepsake for every guest.',
    p3_badge_left: 'NAMES & HEARTFELT WORDS',
    p3_badge_right: 'FULLY CUSTOMIZABLE',
    layouts_tag: 'FAVORITE FRAME DESIGNS',
    layouts_title: 'Playful Layouts & Beautiful Frames',
    layouts_sub: 'Thoughtfully curated photo layouts ready to print in seconds!',
    layout_strip_badge: 'CLASSIC STRIP',
    layout_single_badge_1: 'SINGLE MOMENT CARD',
    layout_single_badge_2: 'KEEPSAKE',
    layout_grid_badge_1: 'QUAD COLLAGE',
    layout_grid_badge_2: 'FULL OF LAUGHTER',
    f1_title: 'Keepsake Photo Strip',
    f1_desc:
      'Timeless elongated vertical cut with consecutive poses, ideal and effortless to split with your best friend or partner.',
    f2_title: 'Single Cut',
    f2_desc:
      'A spacious portrait frame with room for a personalized quote, an elegant wedding keepsake.',
    f2_quote: "Sarah & Reza's Wedding",
    f2_date: 'OCTOBER 24, 2026 • A MEANINGFUL KEEPSAKE',
    f3_title: 'Story Collage',
    f3_desc:
      'Harmonious multi-pose composition in a single print, capturing multiple bursts of laughter and spontaneous poses.',
    stats_tag: 'TESTAMENT OF LOVE & TRUST',
    stats_title: 'Thousands of Genuine Smiles Truly Cherished',
    stat_smiles: 'Radiant Smiles Captured',
    stat_smiles_sub: 'Guests and friends joyfully posing together.',
    stat_sessions: 'Photo Sessions Printed',
    stat_sessions_sub: 'Physical lab prints & video clips delivered to phones.',
    stat_quality: 'Print Quality Satisfaction',
    stat_quality_sub: 'Vibrant accurate tones, waterproof and long-lasting.',
    stat_spots: 'Booth Locations & Events',
    stat_spots_sub: 'From intimate weddings to top tier creative cafes.',
    event_tag: 'WEDDINGS, PARTIES & CAFES',
    event_title: 'Sleek & Compact Booth, Bringing Any Gathering to Life.',
    event_desc:
      'Minimalist natural wood booth that blends effortlessly into party aesthetics or relaxed cafe spaces. Neat hidden cabling, guided by friendly Minja crew ready to assist.',
    event_cta: 'Check Your Event Date',

    // Footer
    footer_quote:
      '"Preserving bursts of laughter, personal warmth, and authentic togetherness without photographer barriers. Capture your story with a self-serve studio touch."',
    footer_whatsapp: 'Official Minja WhatsApp',
    footer_nav_title: 'STUDIO NAVIGATION',
    footer_gallery: 'Guest Online Gallery',
    footer_hours_title: 'OPERATING HOURS',
    footer_days_weekday: 'Monday – Thursday',
    footer_hours_weekday: '10:00 AM – 09:00 PM',
    footer_days_weekend: 'Friday – Sunday',
    footer_hours_weekend: '09:00 AM – 10:00 PM',
    footer_event_247: 'Scheduled 24/7 Event Rental Service',
    footer_copyright: '© 2026 Minja Studio SELF-SERVE PHOTOBOOTH. All rights reserved.',

    // Sub-View: About
    about_back_btn: 'Back to Home',
    about_badge_top: 'Minja Philosophy & Story',
    about_badge_hero: 'THE STORY BEHIND MINJA • FROM THE HEART FOR YOUR MEMORIES',
    about_hero_title: 'More Than Just Taking Photos,',
    about_hero_title_highlight: 'Nurturing Stories That Are Real.',
    about_hero_desc:
      'Amidst thousands of photos piled up and forgotten in smartphone galleries, Minja brings back the warmth of holding a tangible physical keepsake that you can touch, tuck into your wallet, and look back upon years later with that very same smile.',
    about_cta_consult: 'Consult Event Moments',
    about_cta_explore: 'Explore Home',
    about_quote_heart:
      '"Cameras can be advanced, but the emotional spark of holding a freshly printed photo strip emerging from the booth... that magic is irreplaceable."',
    about_photo_badge_1: 'SUNFLOWER BOOTH #01',
    about_photo_badge_2: 'ORIGINAL MINJA STRIP',
    about_story_tag: 'WHERE IT ALL BEGAN',
    about_story_title: 'Why Did We Start Minja?',
    about_story_p1:
      'It all started from an intimate concern: when spending hours with close friends, attending a wedding, or celebrating graduation, we take dozens of photos. Yet the very next day, those memories get buried under thousands of screenshots in phone storage.',
    about_story_p2:
      'We yearned for the days when a real physical print was tucked behind a phone case, taped to a bedroom wall, or pulled out of an old wallet with that same heartwarming grin.',
    about_story_p3:
      'Minja was designed as a self-serve photobooth that provides absolute private space. Without a photographer directing your poses, you and your loved ones are completely free to be yourselves: laughing out loud, striking silly poses, or simply sharing genuine smiles.',

    // Sub-View: Rent
    rent_back_btn: 'Back to Home',
    rent_badge_top: 'Minja Event Rental Service',
    rent_badge_hero: 'SPECIAL EVENT BOOTH RENTAL • HASSLE FREE',
    rent_hero_title: 'Make Your Gathering',
    rent_hero_title_highlight: 'Warmer & Full of Laughter.',
    rent_hero_desc:
      'Bring an aesthetic wooden photobooth with unlimited studio-grade instant prints for intimate weddings, birthday parties, or memorable company gatherings.',
    rent_f1_title: '12-Sec Instant Print',
    rent_f1_sub: 'Instantly dry & waterproof',
    rent_f2_title: 'Unlimited Prints',
    rent_f2_sub: 'Every guest takes home photos',
    rent_f3_title: 'Digital Files & Videos',
    rent_f3_sub: 'QR scan without app install',
    rent_f4_title: '2 Friendly Crew Members',
    rent_f4_sub: 'Standby to assist guests',
    rent_packages_tag: 'TRANSPARENT PACKAGE OPTIONS',
    rent_packages_title: 'Simple Booth Rental Packages Tailored to Your Needs',
    rent_packages_sub:
      'All packages include on-duty crew, custom frame name/date designs, and unlimited photo prints.',
    rent_p1_badge: 'Intimate & Birthday',
    rent_p1_duration: '2 Hours Event',
    rent_p1_name: 'Intimate Package',
    rent_p1_desc: 'Ideal for intimate gatherings, birthday celebrations, or cozy family dinners.',
    rent_p1_price: 'IDR 2,100,000',
    rent_p1_price_sub: 'Includes 2 hours of unlimited prints',
    rent_p1_f1: 'Unlimited instant photo prints',
    rent_p1_f2: '2 Friendly on-site operators',
    rent_p1_f3: 'Custom frame name & date',
    rent_p1_f4: 'Fun props & unique glasses',
    rent_p1_cta: 'Choose Intimate Package',
    rent_p2_badge_top: 'Most Popular for Weddings',
    rent_p2_badge: 'Reception & Wedding',
    rent_p2_duration: '4 Hours Event',
    rent_p2_name: 'Joyful Celebration Package',
    rent_p2_desc: 'The #1 choice for wedding receptions, sweet seventeens, & large parties.',
    rent_p2_price: 'IDR 3,450,000',
    rent_p2_price_sub: '4 full hours for all guests to enjoy',
    rent_p2_f1: 'Unlimited prints for 4 full hours',
    rent_p2_f2: 'Exclusive bespoke template design',
    rent_p2_f3: 'All high-res files & videos in ZIP',
    rent_p2_f4: '2 Uniformed courteous operators',
    rent_p2_cta: 'Choose Most Popular Package',
    rent_p3_badge: 'Corporate & Festival',
    rent_p3_duration: '6 Hours Event',
    rent_p3_name: 'Grand Celebration Package',
    rent_p3_desc: 'All-day parties, corporate gala dinners, concerts, or large creative festivals.',
    rent_p3_price: 'IDR 4,800,000',
    rent_p3_price_sub: '6-hour duration of pure celebration',
    rent_p3_f1: 'Unlimited prints for 6 nonstop hours',
    rent_p3_f2: 'Corporate logo branding on screen',
    rent_p3_f3: '3 Standby operators throughout event',
    rent_p3_cta: 'Choose Grand Package',

    // Sub-View: Partner
    partner_back_btn: 'Back to Home',
    partner_badge_top: 'Commercial Space Partnership',
    partner_badge_hero: 'CAFE & PUBLIC SPACE PARTNERSHIP OPPORTUNITY',
    partner_hero_title: 'Turn Empty Cafe Corners Into',
    partner_hero_title_highlight: 'Customer Magnets & Revenue.',
    partner_hero_desc:
      'Place an aesthetic minimalist Minja photobooth in your cafe. Zero machine rental costs, transparent revenue share, and boost your venue’s organic social media buzz.',
    partner_cta_apply: 'Submit Your Cafe Location',
    partner_cta_learn: 'Explore Minja Details',
    partner_stat_spots: 'Active Cafe Locations',
    partner_stat_cost: 'Machine Capital',
    partner_stat_maintenance: 'Free Maintenance',
    partner_card_title: 'Minja Coffee Shop Partnership',
    partner_card_slot: 'Slots Available',
    partner_features_tag: 'OPERATIONAL ADVANTAGES',
    partner_features_title: 'Why Do Cafe Owners Choose Minja?',
    partner_features_sub: 'Fully self-service system without burdening baristas or cafe staff.',
    partner_f1_tag: '01 • RETENTION & VIRALITY',
    partner_f1_title: 'New Customer Attraction',
    partner_f1_desc:
      'Patrons visit not just for coffee, but have a fun reason to linger longer, celebrate small reunions, and invite friends to pose.',
    partner_f1_highlight: 'Dwell time increases by 25-40 mins',
    partner_f2_tag: '02 • SUSTAINABLE BRANDING',
    partner_f2_title: 'Automatic Cafe Promotion',
    partner_f2_desc:
      'Every photo frame and slip carries your cafe logo or drink voucher for their next visit, readily shared to Instagram Stories.',
    partner_f2_highlight: 'Automated beverage promo coupons',
    partner_f3_tag: '03 • PASSIVE INCOME',
    partner_f3_title: 'Transparent Revenue Sharing',
    partner_f3_desc:
      'Self-service kiosk handles direct QRIS payments without taking up cashier time. Track daily revenue in real-time from the Partner Portal.',
    partner_f3_highlight: 'Live partner portal dashboard',
  },
};
