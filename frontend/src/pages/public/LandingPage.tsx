// minja-cloud/frontend/src/pages/public/LandingPage.tsx
// Halaman Promosi & Informasi Publik Minja Studio (minja.my.id)
// Modular Architecture: LandingNavbar, HeroSection, ShowcaseSection, PillarsSection, FrameLayoutsSection, StatsSection, EventBannerSection, LandingFooter, dan Sub-Views (About, Rent, Partner)

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { photoboothApi } from '../../services/photoboothApi';

import { Language, TRANSLATIONS } from './landing/translations';
import { LandingNavbar, LandingView } from './landing/components/LandingNavbar';
import { HeroSection } from './landing/components/HeroSection';
import { ShowcaseSection } from './landing/components/ShowcaseSection';
import { PillarsSection } from './landing/components/PillarsSection';
import { FrameLayoutsSection } from './landing/components/FrameLayoutsSection';
import { StatsSection } from './landing/components/StatsSection';
import { EventBannerSection } from './landing/components/EventBannerSection';
import { LandingFooter } from './landing/components/LandingFooter';

import { AboutMinjaView } from './landing/views/AboutMinjaView';
import { RentEventView } from './landing/views/RentEventView';
import { PartnerCafeView } from './landing/views/PartnerCafeView';

export const LandingPage: React.FC = () => {
  const { branding, updateBranding } = useTheme();
  const [lang, setLang] = useState<Language>('id');

  // Resolusi view awal berdasarkan URL
  const getInitialView = (): LandingView => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (path.startsWith('/about') || path.startsWith('/tentang') || search.includes('view=about')) {
      return 'about';
    }
    if (path.startsWith('/sewa') || path.startsWith('/rent') || search.includes('view=sewa')) {
      return 'rent';
    }
    if (path.startsWith('/mitra') || path.startsWith('/partner') || search.includes('view=mitra')) {
      return 'partner';
    }
    return 'home';
  };

  const [currentView, setCurrentView] = useState<LandingView>(getInitialView);

  // Sinkronisasi navigasi popstate browser (tombol back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handler navigasi mulus tanpa reload
  const handleNavigate = (view: LandingView) => {
    setCurrentView(view);
    const pathMap: Record<LandingView, string> = {
      home: '/',
      about: '/about',
      rent: '/sewa',
      partner: '/mitra',
    };
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', pathMap[view]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    photoboothApi.getPublicSettings().then((res) => {
      if (res.success && res.data) {
        updateBranding(res.data);
      }
    });
  }, [updateBranding]);

  const t = TRANSLATIONS[lang];

  // Sinkronisasi SEO (title & meta description) bilingual dinamis
  useEffect(() => {
    document.title = t.page_title;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', t.hero_desc);
  }, [t]);
  const whatsappNumber = branding.whatsappNumber || '6281234567890';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    lang === 'id'
      ? 'Halo Minja Studio, saya ingin menanyakan layanan sewa photobooth untuk acara kami.'
      : 'Hello Minja Studio, I would like to inquire about photobooth rental for our upcoming event.'
  )}`;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const galleryUrl = isLocalhost ? '/gallery' : 'https://gallery.minja.my.id';

  return (
    <div className="bg-[#FAF9F6] text-[#1A1917] font-['Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-[#E7E3DC] selection:text-[#141312] relative overflow-x-hidden min-h-screen">
      {/* INJECT PRO CUSTOM CSS (CMS ENGINE) */}
      {branding.customCss && (
        <style id="minja-public-custom-css">{branding.customCss}</style>
      )}

      {/* DIFFUSED WARM AMBIENT LIGHTING BACKGROUND (STUDIO GLOW) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[650px] bg-gradient-to-b from-[#FAF1E3]/70 via-[#F3ECE2]/40 to-transparent rounded-full blur-3xl opacity-75" />
        <div className="absolute top-[38%] left-[-15%] w-[650px] h-[650px] bg-gradient-to-tr from-[#EAE4D9]/40 via-[#F5EFE6]/30 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[65%] right-[-15%] w-[700px] h-[700px] bg-gradient-to-bl from-[#EFE9DF]/50 via-[#F7F2EB]/30 to-transparent rounded-full blur-3xl opacity-60" />
      </div>

      {/* FLOATING MINIMAL GLASS NAVIGATION BAR */}
      <LandingNavbar
        currentView={currentView}
        onNavigate={handleNavigate}
        lang={lang}
        onToggleLang={setLang}
        t={t}
        whatsappUrl={whatsappUrl}
        galleryUrl={galleryUrl}
      />

      {/* DYNAMIC VIEW ROUTER */}
      <main className="w-full relative z-10">
        {currentView === 'home' && (
          <div className="pt-24 sm:pt-28 md:pt-32 animate-in fade-in duration-300">
            {/* 1. Hero Panggung Utama Minimalis */}
            <HeroSection
              t={t}
              lang={lang}
              whatsappUrl={whatsappUrl}
              galleryUrl={galleryUrl}
              onNavigate={handleNavigate}
            />

            {/* 2. Visual Showcase & Interactive Bento Highlights */}
            <ShowcaseSection t={t} />

            {/* 3. Tiga Pilar Kualitas Minja */}
            <PillarsSection t={t} />

            {/* 4. Pilihan Layout Cetak Lab (4R & Strip) */}
            <FrameLayoutsSection t={t} />

            {/* 5. Statistik & Metrik Kepuasan Pelanggan */}
            <StatsSection t={t} />

            {/* 6. Banner Sewa Acara & Pesta */}
            <EventBannerSection t={t} whatsappUrl={whatsappUrl} />
          </div>
        )}

        {currentView === 'about' && (
          <AboutMinjaView
            t={t}
            whatsappUrl={whatsappUrl}
            onBackToHome={() => handleNavigate('home')}
          />
        )}

        {currentView === 'rent' && (
          <RentEventView
            t={t}
            whatsappUrl={whatsappUrl}
            onBackToHome={() => handleNavigate('home')}
          />
        )}

        {currentView === 'partner' && (
          <PartnerCafeView
            t={t}
            whatsappUrl={whatsappUrl}
            onBackToHome={() => handleNavigate('home')}
          />
        )}
      </main>

      {/* FOOTER & CATATAN PENUTUP HANGAT */}
      <LandingFooter
        t={t}
        whatsappUrl={whatsappUrl}
        galleryUrl={galleryUrl}
        instagramHandle={branding.instagramHandle || '@minjabooth'}
        onNavigate={handleNavigate}
      />
    </div>
  );
};
