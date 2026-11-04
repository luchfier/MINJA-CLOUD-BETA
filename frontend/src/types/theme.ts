export interface PublicBrandingConfig {
  boothName: string;
  tagline: string;
  logoUrl: string;
  wallpaperUrl: string;
  welcomeHeadline: string;
  welcomeSubheadline: string;
  startSessionButtonText: string;
  primaryColor: string;
  accentColor: string;
  darkSurfaceColor: string;
  // Advanced visual editing options
  backgroundBlur?: number; // 0 - 40px (default 8)
  backgroundOverlayOpacity?: number; // 0 - 95% (default 50)
  backgroundFit?: 'cover' | 'contain' | 'repeat'; // default 'cover'
  backgroundOpacity?: number; // 10 - 100% (default 100)
  logoHeight?: number; // 32 - 96px (default 64)
  glassmorphismIntensity?: 'light' | 'medium' | 'heavy'; // default 'medium'
  enableVignette?: boolean; // default true
  // Studio & Web Promosi Contact Info
  whatsappNumber?: string;
  instagramHandle?: string;
  studioAddress?: string;
  promoHeadline?: string;
  promoSubheadline?: string;
  eventPackages?: any[];
  livePhotoEnabled?: boolean;
  pageBuilderLanding?: import('./pageBuilder').PageBuilderLandingConfig;
  pageBuilderGallery?: import('./pageBuilder').PageBuilderGalleryConfig;
  customCss?: string;
  footerFeature1?: string;
  footerFeature2?: string;
  footerFeature3?: string;
  footerTouchPrompt?: string;
}

export interface AdminThemeConfig extends PublicBrandingConfig {
  sessionTimeoutSeconds: number;
  paymentTimeoutSeconds: number;
  photoRetentionHours: number;
  extraPrintPrice?: number;
}
