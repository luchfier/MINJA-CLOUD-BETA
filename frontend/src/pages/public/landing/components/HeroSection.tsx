// minja-cloud/frontend/src/pages/public/landing/components/HeroSection.tsx
// Panggung Utama (Hero Section) Minimalis & Elegan — Tema Warm Studio Lumina
// Mengikuti standar frontend-expert: Strict TypeScript, zero layout shift, performa optimal

import React, { useMemo } from 'react';
import { Language, LandingTranslations } from '../translations';
import { LandingView } from './LandingNavbar';

export interface HeroSectionProps {
  t: LandingTranslations;
  lang: Language;
  whatsappUrl: string;
  galleryUrl?: string;
  onNavigate?: (view: LandingView) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  t,
  lang,
  whatsappUrl,
  galleryUrl = 'https://gallery.minja.my.id',
  onNavigate,
}) => {
  // Memoized subtle studio sparkles untuk performa render 60fps tanpa kalkulasi ulang
  const sparkleStars = useMemo(
    () => [
      { top: '8%', left: '12%', size: 14, delay: '0.2s', dur: '4.2s', color: '#D4AF37', opacity: 0.75 },
      { top: '14%', right: '15%', size: 16, delay: '1.2s', dur: '4.8s', color: '#C5A059', opacity: 0.8 },
      { top: '48%', left: '8%', size: 13, delay: '2.1s', dur: '5.0s', color: '#E5C378', opacity: 0.7 },
      { top: '52%', right: '10%', size: 15, delay: '0.8s', dur: '4.5s', color: '#D4AF37', opacity: 0.85 },
    ],
    []
  );

  const sparkleDrifts = useMemo(
    () => [
      { top: '6%', left: '34%', size: 4, delay: '0.5s', dur: '5.2s', color: '#E5C378' },
      { top: '38%', left: '18%', size: 4, delay: '2.6s', dur: '4.9s', color: '#F3E5AB' },
      { top: '42%', right: '22%', size: 4.5, delay: '1.1s', dur: '5.4s', color: '#E5C378' },
    ],
    []
  );

  const trustPillars = useMemo(
    () =>
      lang === 'id'
        ? [
          { icon: 'photo_camera', text: 'Sensor Kamera Studio Lab' },
          { icon: 'water_drop', text: 'Cetak Kertas Lab Tahan Air' },
          { icon: 'cloud_sync', text: 'Galeri Cloud Privat 48 Jam' },
        ]
        : [
          { icon: 'photo_camera', text: 'Lab Studio Camera Sensor' },
          { icon: 'water_drop', text: 'Waterproof Photo Paper' },
          { icon: 'cloud_sync', text: '48-Hour Private Cloud' },
        ],
    [lang]
  );

  return (
    <section className="relative w-full max-w-6xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 md:pt-12 pb-16 sm:pb-20 md:pb-24 overflow-hidden">
      {/* SOFT WARM AMBIENT GLOW BACKDROP */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[750px] h-[350px] sm:h-[450px] bg-gradient-to-b from-[#FAF1E3]/80 via-[#F5EFE6]/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10"
      />

      {/* FLOATING STUDIO GOLD SPARKLES (SUBTLE & LIGHTWEIGHT) */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none -z-0 overflow-hidden">
        {sparkleStars.map((s, idx) => (
          <svg
            key={`star-${idx}`}
            className="sparkle-particle"
            fill="none"
            style={{
              top: s.top,
              left: (s as any).left,
              right: (s as any).right,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.dur,
            }}
            viewBox="0 0 24 24"
          >
            <path
              d="M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z"
              fill={s.color}
              opacity={s.opacity}
            />
          </svg>
        ))}

        {sparkleDrifts.map((d, idx) => (
          <div
            key={`drift-${idx}`}
            className="sparkle-particle-drift rounded-full"
            style={{
              top: d.top,
              left: (d as any).left,
              right: (d as any).right,
              width: `${d.size}px`,
              height: `${d.size}px`,
              background: d.color,
              boxShadow: `${d.color} 0px 0px 8px 1.5px`,
              animationDelay: d.delay,
              animationDuration: d.dur,
            }}
          />
        ))}
      </div>

      {/* MAIN EDITORIAL HERO CONTENT */}
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Minimalist Eyebrow Capsule */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E5DFD5] shadow-xs mb-6 sm:mb-8 transition-transform hover:scale-[1.02]">
          <span className="w-2 h-2 rounded-full bg-[#3A7D5C] animate-pulse ring-4 ring-[#3A7D5C]/20 shrink-0" />
          <span className="font-['JetBrains_Mono'] text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[#635F59] font-medium">
            {t.hero_badge}
          </span>
        </div>

        {/* Editorial Serif Display Headline */}
        <h1 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl md:text-6xl lg:text-[66px] text-[#141312] leading-[1.14] font-normal tracking-[-0.015em] max-w-3xl">
          {lang === 'id' ? (
            <>
              Momen Bahagia Bareng Sahabat,{' '}
              <br className="hidden sm:inline" />
              <span className="italic font-light text-[#5C564B]">
                {t.hero_title_highlight}
              </span>
            </>
          ) : (
            <>
              Joyful Moments with Friends,{' '}
              <br className="hidden sm:inline" />
              <span className="italic font-light text-[#5C564B]">
                {t.hero_title_highlight}
              </span>
            </>
          )}
        </h1>

        {/* Minimalist Subtitle */}
        <p className="mt-5 sm:mt-7 text-[#635F59] text-base sm:text-lg md:text-[18px] leading-relaxed font-light max-w-2xl">
          {t.hero_desc}
        </p>

        {/* Action Button Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10 w-full sm:w-auto">
          {/* Primary Action Button (Obsidian Pill) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-12 px-7 rounded-full text-[#FAF9F6] text-[13px] font-medium tracking-wide bg-[#141312] hover:bg-[#252321] shadow-[0_8px_20px_-3px_rgba(20,19,18,0.25)] hover:shadow-[0_12px_28px_-4px_rgba(20,19,18,0.35)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all border border-white/10"
          >
            <span>{t.hero_cta_primary}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </a>

          {/* Secondary Action Button (Warm Paper Pill) */}
          {galleryUrl && (
            <a
              href={galleryUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-[#141312] text-[13px] font-medium tracking-wide bg-white/80 hover:bg-white border border-[#E5DFD5] shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined text-[17px] text-[#635F59]">photo_library</span>
              <span>{t.chat_admin_btn}</span>
            </a>
          )}

          {/* Quick Rent Navigation (if onNavigate provided) */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('rent')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full text-[#635F59] hover:text-[#141312] text-[13px] font-medium tracking-wide hover:bg-[#F5F3EE] transition-all cursor-pointer"
            >
              <span>{t.nav_rent}</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          )}
        </div>

        {/* Minimalist Trust Features Row */}
        <div className="mt-12 sm:mt-14 pt-6 sm:pt-7 border-t border-[#E5DFD5]/70 w-full max-w-2xl flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] font-['JetBrains_Mono'] text-[#635F59]">
          {trustPillars.map((item, idx) => (
            <div
              key={`pillar-${idx}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#E5DFD5]/80 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[14px] text-[#3A7D5C]">
                {item.icon}
              </span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
