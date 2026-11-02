// minja-cloud/frontend/src/pages/public/landing/views/PartnerCafeView.tsx
// Halaman "Jadi Mitra Minja" — Kemitraan Kafe, Kedai Kopi & Ruang Komersial Publik

import React from 'react';
import { LandingTranslations } from '../translations';

interface PartnerCafeViewProps {
  t: LandingTranslations;
  whatsappUrl: string;
  onBackToHome: () => void;
}

export const PartnerCafeView: React.FC<PartnerCafeViewProps> = ({ t, whatsappUrl, onBackToHome }) => {
  return (
    <div className="w-full pt-24 md:pt-32 pb-20 max-w-6xl mx-auto px-6 md:px-8 animate-in fade-in duration-300">
      {/* Navigation Breadcrumb / Back Pill */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F3EE] hover:bg-[#E5DFD5] text-[#141312] text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>{t.partner_back_btn}</span>
        </button>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E5DFD5] shadow-xs text-xs text-[#635F59] font-['JetBrains_Mono']">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D5C] animate-pulse" />
          <span>{t.partner_badge_top}</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-[#E5DFD5] p-6 sm:p-10 md:p-12 shadow-[0_20px_50px_-10px_rgba(26,25,23,0.08)] mb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F3EE] text-[#141312] text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#3A7D5C]" />
              <span>{t.partner_badge_hero}</span>
            </div>

            <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl sm:text-5xl text-[#141312] font-normal leading-[1.15]">
              {t.partner_hero_title} <br />
              <span className="italic font-light text-[#4648D4]">{t.partner_hero_title_highlight}</span>
            </h1>

            <p className="text-[#635F59] text-base sm:text-lg leading-relaxed font-light">
              {t.partner_hero_desc}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-white text-[13px] font-medium bg-[#1F2022] hover:bg-[#162d4c] transition-all shadow-md active:scale-95"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{t.partner_cta_apply}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
              <button
                onClick={onBackToHome}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-[#F5F3EE] hover:bg-[#E5DFD5] text-[#141312] text-[13px] font-medium border border-[#E5DFD5] transition-all cursor-pointer"
              >
                <span>{t.partner_cta_learn}</span>
              </button>
            </div>

            {/* Quick Stat Pill */}
            <div className="pt-4 grid grid-cols-3 gap-3 border-t border-[#E5DFD5]/80">
              <div className="p-3 rounded-2xl bg-[#F7F5F0]">
                <span className="font-['JetBrains_Mono'] text-xl font-bold text-[#141312]">38+</span>
                <span className="block text-[11px] text-[#635F59] mt-0.5">{t.partner_stat_spots}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F7F5F0]">
                <span className="font-['JetBrains_Mono'] text-xl font-bold text-[#4648D4]">0 Rp</span>
                <span className="block text-[11px] text-[#635F59] mt-0.5">{t.partner_stat_cost}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F7F5F0]">
                <span className="font-['JetBrains_Mono'] text-xl font-bold text-emerald-600">100%</span>
                <span className="block text-[11px] text-[#635F59] mt-0.5">{t.partner_stat_maintenance}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-[#FAF9F6]">
              <img
                src="/images/landing/partner-cafe.jpg"
                alt="Suasana Kafe dengan Photobooth Minja"
                className="w-full aspect-[4/5] object-cover"
              />
              <div className="p-4 bg-white/95 backdrop-blur-sm border-t border-[#E5DFD5]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#141312]">{t.partner_card_title}</span>
                  <span className="text-emerald-600 font-bold font-['JetBrains_Mono']">{t.partner_card_slot}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Keunggulan Asymmetric Bento Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#635F59] font-bold">
            {t.partner_features_tag}
          </span>
          <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl sm:text-3xl text-[#141312] font-normal mt-1">
            {t.partner_features_title}
          </h2>
          <p className="text-xs sm:text-sm text-[#635F59] mt-1.5">
            {t.partner_features_sub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E5DFD5] shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E1E0FF] text-[#4648D4] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">groups_3</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-[#635F59] font-semibold font-['JetBrains_Mono']">
                {t.partner_f1_tag}
              </span>
              <h3 className="font-['Playfair_Display',Georgia,serif] text-lg font-bold text-[#141312]">
                {t.partner_f1_title}
              </h3>
              <p className="text-xs text-[#635F59] leading-relaxed">
                {t.partner_f1_desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E5DFD5] text-[11px] text-[#4648D4] font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>{t.partner_f1_highlight}</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E5DFD5] shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E1E0FF] text-[#4648D4] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">sell</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-[#635F59] font-semibold font-['JetBrains_Mono']">
                {t.partner_f2_tag}
              </span>
              <h3 className="font-['Playfair_Display',Georgia,serif] text-lg font-bold text-[#141312]">
                {t.partner_f2_title}
              </h3>
              <p className="text-xs text-[#635F59] leading-relaxed">
                {t.partner_f2_desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E5DFD5] text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 font-['JetBrains_Mono']">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>{t.partner_f2_highlight}</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E5DFD5] shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E1E0FF] text-[#4648D4] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-[#635F59] font-semibold font-['JetBrains_Mono']">
                {t.partner_f3_tag}
              </span>
              <h3 className="font-['Playfair_Display',Georgia,serif] text-lg font-bold text-[#141312]">
                {t.partner_f3_title}
              </h3>
              <p className="text-xs text-[#635F59] leading-relaxed">
                {t.partner_f3_desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E5DFD5] text-[11px] text-[#4648D4] font-medium flex items-center gap-1.5 font-['JetBrains_Mono']">
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span>{t.partner_f3_highlight}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
