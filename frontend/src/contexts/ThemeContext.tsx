import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicBrandingConfig } from '../types/theme';

export const defaultBranding: PublicBrandingConfig = {
  boothName: 'MinjaPhotobooth',
  tagline: 'Momen Istimewa, Abadi Bersama',
  logoUrl: '',
  wallpaperUrl: '',
  primaryColor: '#F59E0B',      // Amber/Gold
  accentColor: '#38BDF8',       // Sky Blue
  darkSurfaceColor: '#0E131F',  // Deep Slate
  backgroundBlur: 8,
  backgroundOverlayOpacity: 50,
  backgroundFit: 'cover',
  backgroundOpacity: 100,
  logoHeight: 64,
  glassmorphismIntensity: 'medium',
  enableVignette: true,
  whatsappNumber: '6281321699090',
  instagramHandle: '@minjabooth',
  studioAddress: 'Lokasi Booth Minja Studio',
  promoHeadline: 'Abadikan Momen Terbaik dengan Kualitas Studio Lab',
  promoSubheadline:
    'Nikmati pengalaman berfoto mandiri tanpa canggung. Cetak foto fisik standar studio 10×15 cm tahan air dalam hitungan detik, pilihan frame strip eksklusif, plus unduhan digital langsung ke smartphone Anda.',
};

interface ThemeContextValue {
  branding: PublicBrandingConfig;
  updateBranding: (newBranding: Partial<PublicBrandingConfig>) => void;
  resetBranding: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<PublicBrandingConfig>(() => {
  try {
      const saved = localStorage.getItem('minja_public_branding');
      return saved ? { ...defaultBranding, ...JSON.parse(saved) } : defaultBranding;
    } catch {
      return defaultBranding;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', branding.primaryColor);
    root.style.setProperty('--color-accent', branding.accentColor);
    root.style.setProperty('--bg-surface', branding.darkSurfaceColor);
    root.style.setProperty('--bg-blur', `${branding.backgroundBlur ?? 8}px`);
    root.style.setProperty('--bg-overlay-opacity', `${(branding.backgroundOverlayOpacity ?? 50) / 100}`);

    try {
      localStorage.setItem('minja_public_branding', JSON.stringify(branding));
    } catch (e) {
      console.warn('Gagal menyimpan tema ke localStorage', e);
    }
  }, [branding]);

  const updateBranding = (newBranding: Partial<PublicBrandingConfig>) => {
    setBranding((prev) => ({ ...prev, ...newBranding }));
  };

  const resetBranding = () => {
    try {
      localStorage.removeItem('minja_public_branding');
    } catch {}
    setBranding(defaultBranding);
  };

  return (
    <ThemeContext.Provider value={{ branding, updateBranding, resetBranding }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme harus digunakan di dalam ThemeProvider');
  }
  return context;
};
