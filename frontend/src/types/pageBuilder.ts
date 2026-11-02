// minja-cloud/frontend/src/types/pageBuilder.ts
// Tipe data & Preset Standar Studio untuk CMS Engine (Landing Page & Mobile Gallery)
// Sesuai MINJA_CMS_LANDING_MOBILE_GALLERY_PROMPT.md

export type ThemePresetKey = 'warm-ivory' | 'obsidian-dark' | 'nordic-crisp' | 'luxury-gold';

export type LandingSectionKey =
  | 'hero'
  | 'pillars'
  | 'packages'
  | 'showcase'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'footer'
  | 'frames'
  | 'stats'
  | 'events';

export interface ThemePresetOption {
  id: ThemePresetKey;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  textColor: string;
  cardBg: string;
}

export const THEME_PRESETS: ThemePresetOption[] = [
  {
    id: 'warm-ivory',
    name: 'Lumina Warm Ivory (Studio Default)',
    description: 'Estetika hangat studio analog 35mm dengan sentuhan kertas gading lembut.',
    primaryColor: '#6C5CE7',
    secondaryColor: '#A29BFE',
    bgColor: '#FAF9F6',
    textColor: '#1A1917',
    cardBg: '#FFFFFF',
  },
  {
    id: 'obsidian-dark',
    name: 'Obsidian Velvet (Night Studio)',
    description: 'Tampilan gelap premium, kontras sinematik dengan aksen neon ungu lembut.',
    primaryColor: '#818CF8',
    secondaryColor: '#C084FC',
    bgColor: '#0B0F17',
    textColor: '#F8FAFC',
    cardBg: '#131B2B',
  },
  {
    id: 'nordic-crisp',
    name: 'Nordic Minimalist (Clean Studio)',
    description: 'Gaya Skandinavia bersih, tipografi monokrom modern dan nuansa studio galeri seni.',
    primaryColor: '#0EA5E9',
    secondaryColor: '#38BDF8',
    bgColor: '#F8FAFC',
    textColor: '#0F172A',
    cardBg: '#FFFFFF',
  },
  {
    id: 'luxury-gold',
    name: 'Royal Champagne (Luxury Wedding)',
    description: 'Kemewahan hangat warna emas sampanye, sangat cocok untuk acara pernikahan elegan.',
    primaryColor: '#D97706',
    secondaryColor: '#F59E0B',
    bgColor: '#FCFBF7',
    textColor: '#1C1917',
    cardBg: '#FFFDF9',
  },
];



// ============================================================
// CMS LANDING PAGE TYPES
// ============================================================

export interface CmsLandingTheme {
  presetId?: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily?: string;
}

export interface CmsLandingBranding {
  brandName: string;
  logoUrl?: string | null;
  whatsappNumber?: string;
  instagramHandle?: string;
}

export interface CmsLandingSeo {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl?: string | null;
  keywords?: string;
}

export interface CmsHeroSection {
  type: 'hero';
  visible: boolean;
  content: {
    eyebrowBadge: string;
    headline: string;
    subheadline: string;
    primaryButton: {
      label: string;
      url: string;
    };
    secondaryButton?: {
      label: string;
      url: string;
    };
    cameraFrameBadge: string;
    cameraFrameSubtitle: string;
    backgroundAssetUrl?: string;
  };
}

export interface CmsPillarsSection {
  type: 'pillars';
  visible: boolean;
  content: {
    sectionBadge: string;
    title: string;
    description: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
      highlight: string;
      iconKey?: string;
    }>;
  };
}

export interface CmsPackagesSection {
  type: 'packages';
  visible: boolean;
  content: {
    sectionBadge: string;
    title: string;
    description: string;
    items: Array<{
      id: string;
      name: string;
      badge?: string;
      priceRupiah: number;
      durationMinutes: number;
      printsCount: number;
      shotsLimit: number;
      features: string[];
      ctaText: string;
      ctaUrl: string;
    }>;
  };
}

export interface CmsShowcaseSection {
  type: 'showcase';
  visible: boolean;
  content: {
    sectionBadge: string;
    title: string;
    description: string;
    items: Array<{
      id: string;
      title: string;
      subtitle: string;
      tag: string;
      imageUrl: string;
    }>;
  };
}

export interface CmsTestimonialsSection {
  type: 'testimonials';
  visible: boolean;
  content: {
    sectionBadge: string;
    title: string;
    description?: string;
    items: Array<{
      id: string;
      userName: string;
      eventTag: string;
      quoteText: string;
      rating: number;
      avatarUrl?: string;
    }>;
  };
}

export interface CmsFaqSection {
  type: 'faq';
  visible: boolean;
  content: {
    sectionBadge: string;
    title: string;
    items: Array<{
      id: string;
      question: string;
      answer: string;
    }>;
  };
}

export interface CmsCtaSection {
  type: 'cta';
  visible: boolean;
  content: {
    badge: string;
    headline: string;
    description: string;
    primaryButton: {
      label: string;
      url: string;
    };
    features: string[];
  };
}

export interface CmsFooterSection {
  type: 'footer';
  visible: boolean;
  content: {
    tagline: string;
    copyrightText: string;
    socialLinks: Array<{
      platform: 'instagram' | 'tiktok' | 'whatsapp' | 'email' | 'youtube' | 'facebook';
      url: string;
      label: string;
    }>;
  };
}

export interface LandingPageDocument {
  schemaVersion: 1;
  theme: CmsLandingTheme;
  branding: CmsLandingBranding;
  seo: CmsLandingSeo;
  sectionOrder: LandingSectionKey[];
  sectionVisibility?: Record<string, boolean>;
  sections: {
    hero: CmsHeroSection;
    pillars: CmsPillarsSection;
    packages: CmsPackagesSection;
    showcase: CmsShowcaseSection;
    testimonials: CmsTestimonialsSection;
    faq: CmsFaqSection;
    cta: CmsCtaSection;
    footer: CmsFooterSection;
    [key: string]: any;
  };
  [key: string]: any;
}

// Backward Compatibility Aliases
export type PageBuilderLandingConfig = Record<string, any>;
export type PageBuilderGalleryConfig = Record<string, any>;

// ============================================================
// CMS MOBILE GALLERY TYPES
// ============================================================

export interface CmsGalleryTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  accentRingColor: string;
  fontFamily?: string;
}

export interface CmsGalleryLayout {
  columnsMobile: number;
  columnsTablet: number;
  columnsDesktop: number;
  aspectRatio: string;
  gap: string;
}

export interface CmsGalleryElements {
  header: {
    visible: boolean;
    showLogo: boolean;
    showLiveIndicator: boolean;
    customTitle?: string;
    locationSubtitle?: string;
  };
  cover: {
    visible: boolean;
    coverImageUrl?: string | null;
  };
  countdown: {
    visible: boolean;
    retentionHours: number;
    noticeText: string;
    enableLiveTicker: boolean;
  };
  toolbar: {
    visible: boolean;
    showTabStrip: boolean;
    showTabSingle: boolean;
    showTabLive: boolean;
  };
  actions: {
    showDownloadButton: boolean;
    showShareButton: boolean;
    showDownloadAllZip: boolean;
    downloadButtonPrefix: string;
  };
  states: {
    processingTitle: string;
    processingSubtitle: string;
    emptyStateTitle: string;
    emptyStateDescription: string;
    expiredTitle: string;
    expiredDescription: string;
    expiredSupportWhatsapp?: string;
  };
  footer: {
    visible: boolean;
    customNotice?: string;
  };
}

export interface MobileGalleryThemeDocument {
  schemaVersion: 1;
  theme: CmsGalleryTheme;
  layout: CmsGalleryLayout;
  elements: CmsGalleryElements;
}

// ============================================================
// DEFAULT CONSTANTS
// ============================================================

export const DEFAULT_PAGE_BUILDER_LANDING: LandingPageDocument = {
  schemaVersion: 1,
  theme: {
    presetId: 'warm-ivory',
    primaryColor: '#6C5CE7',
    secondaryColor: '#A29BFE',
    backgroundColor: '#FAF9F6',
    textColor: '#1A1917',
    fontFamily: 'Plus Jakarta Sans',
  },
  branding: {
    brandName: 'Minja Studio',
    logoUrl: '/storage/branding/logo.png',
    whatsappNumber: '6281234567890',
    instagramHandle: '@minjastudio',
  },
  seo: {
    metaTitle: 'Minja Studio — Photobooth Mandiri Kualitas Cetak Lab',
    metaDescription:
      'Photobooth mandiri tanpa canggung dengan kualitas cetak studio lab foto tahan air dan unduhan digital instan 48 jam.',
    ogImageUrl: '/storage/branding/og_banner.jpg',
    keywords: 'photobooth, sewa photobooth, studio foto jakarta, cetak foto',
  },
  sectionOrder: ['hero', 'pillars', 'packages', 'showcase', 'testimonials', 'faq', 'cta', 'footer'],
  sections: {
    hero: {
      type: 'hero',
      visible: true,
      content: {
        eyebrowBadge: 'STUDIO PHOTOBOOTH MANDIRI PERTAMA DENGAN KUALITAS CETAK LAB',
        headline: 'Abadikan Cerita Terbaik Anda dalam Cetakan Fisik Abadi.',
        subheadline:
          'Pengalaman berfoto mandiri berdefinisi tinggi dengan teknologi pencahayaan studio terkalibrasi, cetakan lab tahan air, dan unduhan galeri digital instan langsung ke ponsel Anda.',
        primaryButton: {
          label: 'Mulai Sesi di Booth',
          url: '/#packages',
        },
        secondaryButton: {
          label: 'Konsultasi Sewa Acara',
          url: 'https://wa.me/6281234567890',
        },
        cameraFrameBadge: 'STUDIO LIVE VIEW',
        cameraFrameSubtitle: 'Sensor Canon EOS • Natural Skin Tone Lab',
      },
    },
    pillars: {
      type: 'pillars',
      visible: true,
      content: {
        sectionBadge: 'STANDAR KUALITAS MINJA',
        title: 'Tiga Alasan Minja Menjadi Pilihan Studio Favorit',
        description: 'Kami menggabungkan kenyamanan photobooth mandiri modern dengan standar kualitas cetak studio foto profesional.',
        items: [
          {
            id: 'print',
            title: 'Mutu Cetak Lab Foto Asli',
            description: 'Bukan sekadar printer kertas biasa. Kertas foto lab premium anti-luntur, tahan goresan, dan tahan cipratan air hingga bertahun-tahun.',
            highlight: 'Kertas Foto Studio Lab Anti Air',
          },
          {
            id: 'shutter',
            title: 'Bebas Berekspresi Tanpa Canggung',
            description: 'Anda yang memegang kendali sepenuhnya. Ambil foto kapan pun Anda siap tanpa ada tatapan fotografer asing yang membuat risih.',
            highlight: 'Kendali Sentuh & Shutter Mandiri',
          },
          {
            id: 'cloud',
            title: 'Sinkronisasi Galeri Digital 48 Jam',
            description: 'Dapatkan lembar cetak fisik di tangan Anda, plus akses instan ke seluruh file foto asli dan video momen bergerak via smartphone.',
            highlight: 'QR Code Cepat Tanpa Instal Aplikasi',
          },
        ],
      },
    },
    packages: {
      type: 'packages',
      visible: true,
      content: {
        sectionBadge: 'PAKET LAYANAN STUDIO',
        title: 'Pilihan Sesi Sesuai Kebutuhan Anda',
        description: 'Nikmati sesi berfoto mandiri dengan cetakan foto instan dan galeri digital privat.',
        items: [
          {
            id: 'solo',
            name: 'Solo Express',
            badge: 'Cepat & Hemat',
            priceRupiah: 35000,
            durationMinutes: 10,
            printsCount: 1,
            shotsLimit: 6,
            features: ['1 Lembar Cetak 4R / Strip', 'Galeri Cloud 48 Jam', 'Pilihan Filter Studio'],
            ctaText: 'Pilih Paket',
            ctaUrl: '/#packages',
          },
          {
            id: 'duo',
            name: 'Bestie Duo',
            badge: 'Paling Populer',
            priceRupiah: 50000,
            durationMinutes: 15,
            printsCount: 2,
            shotsLimit: 8,
            features: ['2 Lembar Cetak Fisik', 'Live Motion Video', 'Unduh Seluruh Foto Mentah'],
            ctaText: 'Pilih Paket',
            ctaUrl: '/#packages',
          },
          {
            id: 'party',
            name: 'Party Quad',
            badge: 'Rombongan Geng',
            priceRupiah: 85000,
            durationMinutes: 20,
            printsCount: 4,
            shotsLimit: 12,
            features: ['4 Lembar Cetak Fisik', 'Live Video Multi-Slot', 'Stiker Kustom & Frame Bebas'],
            ctaText: 'Pilih Paket',
            ctaUrl: '/#packages',
          },
        ],
      },
    },
    showcase: {
      type: 'showcase',
      visible: true,
      content: {
        sectionBadge: 'GALERI MOMEN TERPILIH',
        title: 'Kehangatan yang Nyata, Bukan Sekadar File Digital',
        description: 'Setiap lembar cetakan Minja dirancang untuk bertahan puluhan tahun di dompet, pigura, atau jurnal kenangan Anda.',
        items: [
          {
            id: 'couples',
            title: 'Pasangan & Tunangan',
            subtitle: 'Ruang intim privat tanpa fotografer membuat ekspresi romantis Anda mengalir alami.',
            tag: 'Eksklusif Duo',
            imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'besties',
            title: 'Sahabat & Bestie',
            subtitle: 'Pose seseru mungkin dengan tombol shutter nirkabel di tangan Anda sendiri.',
            tag: 'Paling Populer',
            imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'family',
            title: 'Keluarga & Wisuda',
            subtitle: 'Momen berharga bersama keluarga dalam format cetak 4R abadi berkualitas arsip.',
            tag: 'Format 4R Studio',
            imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
    },
    testimonials: {
      type: 'testimonials',
      visible: true,
      content: {
        sectionBadge: 'KATA MEREKA',
        title: 'Cerita Hangat dari Pengunjung Minja Studio',
        description: 'Ribuan senyuman telah terpatri di lembar cetak studio lab Minja.',
        items: [
          {
            id: 'testi-1',
            userName: 'Nadia & Farhan',
            eventTag: 'Kencan Akhir Pekan di PIM',
            quoteText: 'Gak nyangka hasil cetaknya se-jernih ini! Kertasnya tebal beneran mutu studio lab foto, gak luntur kena air es di meja.',
            rating: 5,
          },
          {
            id: 'testi-2',
            userName: 'Geng Bestie 4 Serangkai',
            eventTag: 'Wisuda Sarjana UI',
            quoteText: 'Seru banget bisa dapet live motion video yang gerak-gerak di galeri HP, plus cetakan fisiknya dapet masing-masing satu!',
            rating: 5,
          },
        ],
      },
    },
    faq: {
      type: 'faq',
      visible: true,
      content: {
        sectionBadge: 'TANYA JAWAB',
        title: 'Pertanyaan yang Sering Diajukan',
        items: [
          {
            id: 'faq-1',
            question: 'Apakah hasil foto fisik Minja anti luntur?',
            answer: 'Ya, 100%. Kami menggunakan kertas dan tinta lab foto profesional dengan lapisan proteksi anti air, anti gores, dan tahan luntur hingga puluhan tahun.',
          },
          {
            id: 'faq-2',
            question: 'Bagaimana cara mengambil soft file dan video live?',
            answer: 'Setelah sesi selesai, layar booth akan memunculkan QR Code galeri privat. Pindai dengan kamera HP Anda untuk langsung mengunduh foto dan video tanpa harus menginstal aplikasi apa pun.',
          },
          {
            id: 'faq-3',
            question: 'Berapa lama file tersimpan di galeri handphone?',
            answer: 'Sesuai standar privasi, file tersimpan aman secara privat selama 48 jam di server cloud kami.',
          },
        ],
      },
    },
    cta: {
      type: 'cta',
      visible: true,
      content: {
        badge: 'LAYANAN SEWA KHUSUS ACARA',
        headline: 'Bawa Kehangatan Minja ke Pernikahan, Ulang Tahun, atau Acara Kantor Anda',
        description: 'Layanan photobooth mandiri tanpa ribet dengan operator ramah, cetakan tanpa batas (unlimited prints), desain frame kustom nama pengantin/perusahaan, dan galeri cloud instan.',
        primaryButton: {
          label: 'Konsultasi Sewa via WhatsApp',
          url: 'https://wa.me/6281234567890',
        },
        features: [
          'Pilihan Desain Frame Strip & 4R Kustom',
          'Cetak Cepat Tanpa Batas (Unlimited)',
          'Kamera DSLR & Tata Cahaya Studio Lembut',
          'Akses Galeri Digital 48 Jam untuk Tamu',
        ],
      },
    },
    footer: {
      type: 'footer',
      visible: true,
      content: {
        tagline: 'Momen Istimewa, Abadi Bersama Studio Lab Minja',
        copyrightText: '© 2026 Minja Photobooth Studio. Seluruh Hak Cipta Dilindungi.',
        socialLinks: [
          {
            platform: 'instagram',
            url: 'https://instagram.com/minjastudio',
            label: '@minjastudio',
          },
          {
            platform: 'whatsapp',
            url: 'https://wa.me/6281234567890',
            label: 'WhatsApp Studio',
          },
        ],
      },
    },
  },
};

export const DEFAULT_PAGE_BUILDER_GALLERY: MobileGalleryThemeDocument = {
  schemaVersion: 1,
  theme: {
    primaryColor: '#6C5CE7',
    secondaryColor: '#A29BFE',
    backgroundColor: '#FAF9F6',
    cardBackgroundColor: '#FFFFFF',
    textColor: '#1A1917',
    accentRingColor: '#6C5CE7',
    fontFamily: 'Plus Jakarta Sans',
  },
  layout: {
    columnsMobile: 1,
    columnsTablet: 2,
    columnsDesktop: 3,
    aspectRatio: '2/3',
    gap: '12px',
  },
  elements: {
    header: {
      visible: true,
      showLogo: true,
      showLiveIndicator: true,
      customTitle: 'Minja Photobooth Studio',
      locationSubtitle: 'Lokasi Booth Minja Studio',
    },
    cover: {
      visible: false,
      coverImageUrl: null,
    },
    countdown: {
      visible: true,
      retentionHours: 48,
      noticeText: 'Foto dan video Anda tersimpan secara privat selama 48 jam. Segera simpan ke galeri perangkat Anda sebelum masa berlaku berakhir.',
      enableLiveTicker: true,
    },
    toolbar: {
      visible: true,
      showTabStrip: true,
      showTabSingle: true,
      showTabLive: true,
    },
    actions: {
      showDownloadButton: true,
      showShareButton: true,
      showDownloadAllZip: true,
      downloadButtonPrefix: 'Download Frame',
    },
    states: {
      processingTitle: 'Menyiapkan Foto Studio Anda...',
      processingSubtitle: 'Sistem sedang memproses kompilasi frame studio dan menyinkronkan video momen.',
      emptyStateTitle: 'Tidak Ada Foto Ditemukan',
      emptyStateDescription: 'Silakan periksa kembali kode sesi atau PIN 4-digit Anda.',
      expiredTitle: 'Masa Penyimpanan Galeri Berakhir',
      expiredDescription: 'Sesuai kebijakan privasi studio, file foto dan video sesi ini telah dibersihkan secara aman setelah 48 jam.',
      expiredSupportWhatsapp: '6281234567890',
    },
    footer: {
      visible: true,
      customNotice: 'Minja Cloud Digital Gallery Engine • Mutu Cetak Studio Lab',
    },
  },
};
