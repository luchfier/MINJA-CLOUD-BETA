export interface PackageItem {
  id: string;
  name: string;
  description: string;
  price: number;
  durationSeconds: number; // Durasi sesi foto & edit (dalam detik)
  printCopies: number; // Jumlah lembar cetak fisik 10×15 cm bawaan
  additionalPrintPrice?: number; // Tarif per lembar tambah cetak
  isActive: boolean;
  sortOrder: number;
  badge?: string;
  badgeText?: string;
  maxPhotos?: number; // Opsional / deprecated
  maxSelectedPhotos?: number; // Opsional / deprecated
}

export interface EventPackageItem {
  id: string;
  name: string;
  duration: string;
  subtitle: string;
  price?: string;
  badge?: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export const DEFAULT_EVENT_PACKAGES: EventPackageItem[] = [
  {
    id: 'intimate',
    name: 'Paket Intimate Event',
    duration: '2 Jam Sesi Unlimited',
    subtitle: 'Cocok untuk Birthday, Sweet 17, Arisan, & Intimate Wedding',
    price: 'Mulai Rp 1.500.000',
    badge: 'Hemat & Praktis',
    features: [
      'Unlimited Print Foto Standar Studio / Strip selama 2 Jam Penuh',
      'Free Custom Desain Frame (Nama & Tema Acara)',
      'Kamera Studio HD & Pencahayaan Studio Softbox',
      'Koleksi Fun Props & Kacamata Pesta',
      '1-2 Orang Crew Operator Ramah Standby',
      'QR Code Galeri Unduh Soft File Instan untuk Seluruh Tamu',
      'Google Drive Master File Foto untuk Tuan Rumah',
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'wedding-grand',
    name: 'Paket Grand Wedding & Party',
    duration: '3 - 4 Jam Sesi Unlimited',
    subtitle: 'Favorit untuk Resepsi Pernikahan, Prom Night, & Pesta Besar',
    price: 'Mulai Rp 2.500.000',
    badge: 'Paling Populer',
    features: [
      'Unlimited Cetak Foto Fisik Lab Standar Studio (Anti Air & Anti Pudar)',
      'Desain Frame Eksklusif Bebas Revisi sampai Cocok',
      'Free Exclusive Guestbook Foto + Spidol Metallic Khusus',
      'Live Motion Video (MP4) untuk Setiap Tamu',
      'Koleksi Fun Props & Properti Premium Melimpah',
      '2 Orang Operator & Kru Profesional Standby',
      'Scan QR Code Instan di Tempat untuk Tamu Undangan',
      'Master Soft File Foto & Video High-Res Lengkap',
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'corporate',
    name: 'Paket Corporate & Gala',
    duration: 'Full Day / Custom Hours',
    subtitle: 'Untuk Gathering Perusahaan, Launching Produk, Expo, & Gala Dinner',
    price: 'Hubungi Admin',
    badge: 'Full Branding',
    features: [
      'Unlimited Super-Fast Print Kualitas Studio Profesional',
      'Full Corporate Branding (Logo Perusahaan di Frame, UI Layar, & Backdrop)',
      'Pengiriman Soft File Otomatis ke Email Tamu secara Instan',
      'Rekap Data Jumlah Foto & Kunjungan Tamu (Analytics)',
      'Full Team Crew Standby dari Awal hingga Selesai',
      'Layanan Souvenir Frame Magnetik / Amplop Foto Eksklusif',
      'Dedicated Cloud Storage File HD Siap Publikasi',
    ],
    isActive: true,
    sortOrder: 3,
  },
];

export interface CalculatePriceRequest {
  packageId: string;
  additionalPrints: number;
  voucherCode?: string;
}

export interface CalculatePriceResponse {
  packageId: string;
  packageName: string;
  basePrice: number;
  additionalPrints: number;
  additionalPrintUnitPrice: number;
  additionalPrintTotal: number;
  subtotal: number;
  voucherCode?: string;
  voucherName?: string;
  discountAmount: number;
  grossAmount: number;
  voucherError?: string;
}
