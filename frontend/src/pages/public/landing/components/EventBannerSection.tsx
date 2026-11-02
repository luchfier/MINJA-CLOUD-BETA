// minja-cloud/frontend/src/pages/public/landing/components/EventBannerSection.tsx
// Hadirkan di Ruang Anda — Pernikahan, Pesta & Kafe

import React from 'react';
import { LandingTranslations } from '../translations';

interface EventBannerSectionProps {
  t: LandingTranslations;
  whatsappUrl: string;
  builderConfig?: import('../../../../types/pageBuilder').PageBuilderLandingConfig['events'];
}

export const EventBannerSection: React.FC<EventBannerSectionProps> = ({ t, whatsappUrl, builderConfig }) => {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-8 py-20 border-t border-[#E5DFD5]" id="hadirkan-di-acara">
      <div
        className="rounded-3xl bg-gradient-to-br from-[#F7F5F0] via-[#F2EFE8] to-[#ECE7DD] border border-zinc-200/90 shadow-[0_20px_50px_-10px_rgba(26,25,23,0.08),0_4px_12px_rgba(26,25,23,0.03)] p-8 md:p-14 relative overflow-hidden"
        id="kolaborasi"
      >
        <div className="max-w-2xl relative z-10">
          <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-[0.25em] text-[#635F59] block mb-2">
            {builderConfig?.badge || t.event_tag}
          </span>
          <h2 className="font-['Playfair_Display',Georgia,serif] text-3xl md:text-4xl text-[#141312] font-normal leading-snug">
            {builderConfig?.headline || t.event_title}
          </h2>
          <p className="mt-4 text-[#635F59] text-[14px] leading-relaxed font-light">
            {builderConfig?.description || t.event_desc}
          </p>
        </div>
        <div className="mt-10 md:mt-0 md:absolute md:right-12 md:bottom-12 flex flex-col gap-3 relative z-10">
          <a
            className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full text-[#FAF9F6] text-[13px] font-medium border border-white/20 shadow-[0_10px_24px_-4px_rgba(30,58,95,0.42),0_3px_8px_rgba(30,58,95,0.2)] hover:bg-[#162d4c] hover:shadow-[0_16px_32px_-4px_rgba(30,58,95,0.5)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all w-full bg-[#1F2022]"
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>{builderConfig?.ctaButtonText || t.event_cta}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
          </a>
        </div>
      </div>
    </section>
  );
};
