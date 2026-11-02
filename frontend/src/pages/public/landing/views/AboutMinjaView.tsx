// minja-cloud/frontend/src/pages/public/landing/views/AboutMinjaView.tsx
// Halaman "Tentang Minja" — Catatan Kurator Studio, Filosofi, & Atmosfer Bilik Bunga Matahari

import React from 'react';
import { LandingTranslations } from '../translations';

interface AboutMinjaViewProps {
  t: LandingTranslations;
  whatsappUrl: string;
  onBackToHome: () => void;
}

export const AboutMinjaView: React.FC<AboutMinjaViewProps> = ({ t, whatsappUrl, onBackToHome }) => {
  return (
    <div className="w-full pt-24 md:pt-32 pb-20 max-w-6xl mx-auto px-6 md:px-8 animate-in fade-in duration-300">
      {/* Navigation Breadcrumb / Back Pill */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F3EE] hover:bg-[#E5DFD5] text-[#141312] text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>{t.about_back_btn}</span>
        </button>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E5DFD5] shadow-xs text-xs text-[#635F59] font-['JetBrains_Mono']">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D5C] animate-pulse" />
          <span>{t.about_badge_top}</span>
        </div>
      </div>

      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-[#E5DFD5] p-6 sm:p-10 md:p-12 shadow-[0_20px_50px_-10px_rgba(26,25,23,0.08)] mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F3EE] text-[#141312] text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#3A7D5C] animate-pulse" />
              <span>{t.about_badge_hero}</span>
            </div>

            <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl sm:text-5xl text-[#141312] font-normal leading-[1.15]">
              {t.about_hero_title} <br />
              <span className="italic font-light">{t.about_hero_title_highlight}</span>
            </h1>

            <p className="text-[#635F59] text-base sm:text-lg leading-relaxed font-light">
              {t.about_hero_desc}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-white text-[13px] font-medium bg-[#1F2022] hover:bg-[#162d4c] transition-all shadow-md active:scale-95"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{t.about_cta_consult}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </a>
              <button
                onClick={onBackToHome}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-[#F5F3EE] hover:bg-[#E5DFD5] text-[#141312] text-[13px] font-medium border border-[#E5DFD5] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">layers</span>
                <span>{t.about_cta_explore}</span>
              </button>
            </div>

            <div className="pt-4 flex items-center gap-3 text-xs text-[#635F59] italic border-t border-[#E5DFD5]/80">
              <span className="material-symbols-outlined text-rose-500 text-[18px] shrink-0">favorite</span>
              <span>{t.about_quote_heart}</span>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform rotate-1 hover:rotate-0 transition-transform duration-500 bg-[#FAF9F6]">
              <img
                src="/images/landing/showcase-candid-1.jpg"
                alt="Suasana Bilik Minja"
                className="w-full aspect-[4/5] object-cover"
              />
              <div className="p-3 bg-white flex items-center justify-between text-[10px] font-['JetBrains_Mono'] text-[#635F59]">
                <span className="font-semibold text-[#141312]">{t.about_photo_badge_1}</span>
                <span>{t.about_photo_badge_2}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filosofi & Titik Mula */}
      <section className="rounded-3xl bg-[#F7F5F0] border border-[#E5DFD5] p-6 sm:p-10 md:p-12 mb-12">
        <div className="max-w-3xl space-y-5 text-left">
          <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#635F59] font-bold">
            {t.about_story_tag}
          </span>
          <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl sm:text-4xl text-[#141312] font-normal leading-snug">
            {t.about_story_title}
          </h2>
          <div className="space-y-4 text-sm sm:text-base text-[#635F59] leading-relaxed font-light">
            <p>{t.about_story_p1}</p>
            <p>{t.about_story_p2}</p>
            <p>{t.about_story_p3}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
