// minja-cloud/frontend/src/pages/public/landing/views/RentEventView.tsx
// Halaman "Sewa Buat Acara" — Paket Sewa Booth, Resepsi Pernikahan, Pesta, & Booking Instan

import React from 'react';
import { LandingTranslations } from '../translations';

interface RentEventViewProps {
  t: LandingTranslations;
  whatsappUrl: string;
  onBackToHome: () => void;
}

export const RentEventView: React.FC<RentEventViewProps> = ({ t, whatsappUrl, onBackToHome }) => {
  return (
    <div className="w-full pt-24 md:pt-32 pb-20 max-w-6xl mx-auto px-6 md:px-8 animate-in fade-in duration-300">
      {/* Navigation Breadcrumb / Back Pill */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F3EE] hover:bg-[#E5DFD5] text-[#141312] text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>{t.rent_back_btn}</span>
        </button>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E5DFD5] shadow-xs text-xs text-[#635F59] font-['JetBrains_Mono']">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D5C] animate-pulse" />
          <span>{t.rent_badge_top}</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F3EE] text-[#141312] text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-[#3A7D5C]" />
          <span>{t.rent_badge_hero}</span>
        </div>
        <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl sm:text-5xl text-[#141312] font-normal leading-[1.15]">
          {t.rent_hero_title} <br />
          <span className="italic font-light">{t.rent_hero_title_highlight}</span>
        </h1>
        <p className="mt-4 text-[#635F59] text-base sm:text-lg leading-relaxed font-light">
          {t.rent_hero_desc}
        </p>
      </section>

      {/* 4 Keunggulan Sewa Minja */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        <div className="p-4 rounded-2xl bg-white border border-[#E5DFD5] shadow-xs flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#141312] mb-3">
            <span className="material-symbols-outlined text-[20px]">print</span>
          </div>
          <h3 className="text-sm font-semibold text-[#141312]">{t.rent_f1_title}</h3>
          <p className="text-[11px] text-[#635F59] mt-0.5">{t.rent_f1_sub}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E5DFD5] shadow-xs flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#141312] mb-3">
            <span className="material-symbols-outlined text-[20px]">photo_library</span>
          </div>
          <h3 className="text-sm font-semibold text-[#141312]">{t.rent_f2_title}</h3>
          <p className="text-[11px] text-[#635F59] mt-0.5">{t.rent_f2_sub}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E5DFD5] shadow-xs flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#141312] mb-3">
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          </div>
          <h3 className="text-sm font-semibold text-[#141312]">{t.rent_f3_title}</h3>
          <p className="text-[11px] text-[#635F59] mt-0.5">{t.rent_f3_sub}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E5DFD5] shadow-xs flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#141312] mb-3">
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
          </div>
          <h3 className="text-sm font-semibold text-[#141312]">{t.rent_f4_title}</h3>
          <p className="text-[11px] text-[#635F59] mt-0.5">{t.rent_f4_sub}</p>
        </div>
      </div>

      {/* Pricing Packages */}
      <section className="space-y-6 mb-16">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#635F59] font-bold">
            {t.rent_packages_tag}
          </span>
          <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl sm:text-3xl text-[#141312] font-normal mt-1">
            {t.rent_packages_title}
          </h2>
          <p className="text-xs sm:text-sm text-[#635F59] mt-1.5">
            {t.rent_packages_sub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Paket 1: Intimate */}
          <div className="flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-white border border-[#E5DFD5] shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F5F3EE] text-[#141312] font-semibold font-['JetBrains_Mono']">
                  {t.rent_p1_badge}
                </span>
                <span className="text-xs text-[#635F59]">{t.rent_p1_duration}</span>
              </div>
              <h3 className="font-['Playfair_Display',Georgia,serif] text-xl font-bold text-[#141312]">{t.rent_p1_name}</h3>
              <p className="text-xs text-[#635F59] leading-relaxed">
                {t.rent_p1_desc}
              </p>
              <div className="pt-2 pb-2">
                <span className="font-['JetBrains_Mono'] text-2xl font-bold text-[#141312]">{t.rent_p1_price}</span>
                <span className="block text-[11px] text-[#635F59] mt-0.5">{t.rent_p1_price_sub}</span>
              </div>
              <ul className="space-y-2 text-xs text-[#141312] pt-2">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p1_f1}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p1_f2}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p1_f3}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p1_f4}</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F5F3EE] hover:bg-[#E5DFD5] text-[#141312] text-xs font-semibold transition-all shadow-xs"
              >
                <span>{t.rent_p1_cta}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>
          </div>

          {/* Paket 2: Pesta Bahagia (Terpopuler) */}
          <div className="relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#141312] shadow-xl transform md:-translate-y-2">
            <div className="absolute -top-3.5 inset-x-0 mx-auto w-max px-3.5 py-1 rounded-full bg-[#141312] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 font-['JetBrains_Mono']">
              <span className="material-symbols-outlined text-[13px] text-amber-300">star</span>
              <span>{t.rent_p2_badge_top}</span>
            </div>
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#E1E0FF] text-[#07006C] font-semibold font-['JetBrains_Mono']">
                  {t.rent_p2_badge}
                </span>
                <span className="text-xs font-semibold text-[#4648D4]">{t.rent_p2_duration}</span>
              </div>
              <h3 className="font-['Playfair_Display',Georgia,serif] text-xl font-bold text-[#141312]">{t.rent_p2_name}</h3>
              <p className="text-xs text-[#635F59] leading-relaxed">
                {t.rent_p2_desc}
              </p>
              <div className="pt-2 pb-2">
                <span className="font-['JetBrains_Mono'] text-2xl font-bold text-[#141312]">{t.rent_p2_price}</span>
                <span className="block text-[11px] text-[#635F59] mt-0.5">{t.rent_p2_price_sub}</span>
              </div>
              <ul className="space-y-2 text-xs text-[#141312] pt-2">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p2_f1}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p2_f2}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p2_f3}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p2_f4}</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#141312] text-white hover:bg-zinc-800 text-xs font-semibold transition-all shadow-md active:scale-95"
              >
                <span>{t.rent_p2_cta}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>
          </div>

          {/* Paket 3: Grand Celebration */}
          <div className="flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-white border border-[#E5DFD5] shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F5F3EE] text-[#141312] font-semibold font-['JetBrains_Mono']">
                  {t.rent_p3_badge}
                </span>
                <span className="text-xs text-[#635F59]">{t.rent_p3_duration}</span>
              </div>
              <h3 className="font-['Playfair_Display',Georgia,serif] text-xl font-bold text-[#141312]">{t.rent_p3_name}</h3>
              <p className="text-xs text-[#635F59] leading-relaxed">
                {t.rent_p3_desc}
              </p>
              <div className="pt-2 pb-2">
                <span className="font-['JetBrains_Mono'] text-2xl font-bold text-[#141312]">{t.rent_p3_price}</span>
                <span className="block text-[11px] text-[#635F59] mt-0.5">{t.rent_p3_price_sub}</span>
              </div>
              <ul className="space-y-2 text-xs text-[#141312] pt-2">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p3_f1}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p3_f2}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{t.rent_p3_f3}</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F5F3EE] hover:bg-[#E5DFD5] text-[#141312] text-xs font-semibold transition-all shadow-xs"
              >
                <span>{t.rent_p3_cta}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
