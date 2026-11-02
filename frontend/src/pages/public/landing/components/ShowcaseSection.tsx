// minja-cloud/frontend/src/pages/public/landing/components/ShowcaseSection.tsx
// Visual Showcase Hero & Interactive Bento Highlights

import React from 'react';
import { LandingTranslations } from '../translations';

interface ShowcaseSectionProps {
  t: LandingTranslations;
}

export const ShowcaseSection: React.FC<ShowcaseSectionProps> = ({ t }) => {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-8 pb-16 relative">
      <div className="max-w-5xl mx-auto relative">
        <div className="absolute -inset-4 bg-gradient-to-b from-[#FAF1E3]/90 via-[#F7F2EB]/50 to-[#ECE7DD]/40 rounded-[2.5rem] blur-xl opacity-70 -z-0 pointer-events-none" />
        <div className="relative bg-gradient-to-b from-[#F7F5F0]/95 via-[#F5EFE6]/30 to-[#EFECE5]/90 backdrop-blur-sm border border-[#E5DFD5] rounded-3xl p-5 sm:p-7 md:p-10 shadow-[0_24px_48px_-12px_rgba(26,25,23,0.18),0_8px_16px_rgba(26,25,23,0.06)] overflow-hidden">
          {/* Studio Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#E5DFD5]/80">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5DFD5] text-[10px] font-['JetBrains_Mono'] uppercase tracking-[0.2em] text-[#141312] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#3A7D5C] animate-pulse ring-2 ring-[#3A7D5C]/30" />
                <span className="font-medium">{t.showcase_badge}</span>
              </div>
              <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-[0.16em] text-[#635F59] hidden sm:inline">
                • {t.showcase_sub}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#E5DFD5]/90 shadow-sm text-[11px] font-['JetBrains_Mono'] text-[#635F59]">
                <span className="material-symbols-outlined text-[14px] text-[#3A7D5C]">auto_awesome</span>
                <span className="font-medium text-[#141312]">{t.showcase_studio_vibes}</span>
              </div>
            </div>
          </div>

          {/* Showcase Grid Layout */}
          <div className="grid grid-cols-12 gap-4 sm:gap-6 md:gap-8 items-center py-4 sm:py-7">
            {/* Left Column: Aesthetic Photostrip */}
            <div className="col-span-12 sm:col-span-5 flex flex-col items-center justify-center relative">
              <div className="absolute w-28 sm:w-44 h-40 sm:h-72 bg-[#FAF1E3]/80 rounded-full blur-2xl -z-0 pointer-events-none" />
              <div className="relative z-10 w-full max-w-[200px] sm:max-w-[240px] md:max-w-[270px] mx-auto bg-white p-2.5 sm:p-4 pb-3 sm:pb-6 rounded-xl sm:rounded-2xl border border-[#E5DFD5] shadow-[0_20px_50px_-10px_rgba(26,25,23,0.16),0_4px_12px_rgba(26,25,23,0.06)] transform -rotate-1 hover:rotate-0 hover:-translate-y-1.5 transition-all duration-500 ring-1 ring-[#141312]/5 group">
                {/* Tape Header Accent */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#FAF1E3]/90 border border-[#E5DFD5] rounded shadow-sm text-[8px] font-['JetBrains_Mono'] tracking-widest text-[#635F59] uppercase pointer-events-none">
                  SWEET CANDID MOMENTS
                </div>
                {/* 3 Aesthetic Candid Frames */}
                <div className="space-y-1.5 sm:space-y-3 pt-1">
                  <div className="aspect-[4/3] rounded sm:rounded-lg overflow-hidden bg-[#FAF9F6] border border-[#E5DFD5]/50 relative group-hover:scale-[1.01] transition-transform duration-300 shadow-sm">
                    <img
                      src="/images/landing/showcase-candid-1.jpg"
                      alt="Dua sahabat pose ceria di bilik studio Minja"
                      className="w-full h-full object-cover contrast-105"
                    />
                  </div>
                  <div className="aspect-[4/3] rounded sm:rounded-lg overflow-hidden bg-[#FAF9F6] border border-[#E5DFD5]/50 relative group-hover:scale-[1.01] transition-transform duration-300 shadow-sm">
                    <img
                      src="/images/landing/showcase-candid-2.jpg"
                      alt="Tiga sahabat pose seru dan tertawa di studio Minja"
                      className="w-full h-full object-cover contrast-105"
                    />
                  </div>
                  <div className="aspect-[4/3] rounded sm:rounded-lg overflow-hidden bg-[#FAF9F6] border border-[#E5DFD5]/50 relative group-hover:scale-[1.01] transition-transform duration-300 shadow-sm">
                    <img
                      src="/images/landing/showcase-candid-3.jpg"
                      alt="Empat sahabat huddle seru di bilik foto Minja"
                      className="w-full h-full object-cover contrast-105"
                    />
                  </div>
                </div>
                {/* Bottom Stamp */}
                <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-[#E5DFD5]/80 flex items-center justify-between text-[8px] sm:text-[9px] font-['JetBrains_Mono'] text-[#635F59]">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D5C]" />
                    <span className="font-semibold tracking-wider text-[#141312]">MINJA MEMORIES</span>
                  </div>
                  <span className="tracking-widest uppercase text-[#8C857B]">#FOTODIMINJA</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Experience Highlights */}
            <div className="col-span-12 sm:col-span-7 flex flex-col gap-3 sm:gap-4 text-left">
              <div className="bg-white/95 p-4 sm:p-6 rounded-2xl border border-zinc-200/90 shadow-[0_12px_32px_-4px_rgba(24,24,27,0.06),0_2px_6px_rgba(24,24,27,0.03)] space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D5C]" />
                    <span className="text-[9px] sm:text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#635F59]">
                      {t.showcase_experience_tag}
                    </span>
                  </div>
                  <h3 className="font-['Playfair_Display',Georgia,serif] text-lg sm:text-2xl md:text-3xl text-[#141312] font-normal leading-snug">
                    {t.showcase_title}
                  </h3>
                </div>

                {/* Feature Highlights Bento */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF9F6] border border-[#E5DFD5]/70 hover:bg-[#F5F3EE] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#E5DFD5] flex items-center justify-center shrink-0 shadow-sm text-[#141312]">
                      <span className="material-symbols-outlined text-[17px] text-[#3A7D5C]">face_retouching_natural</span>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-[#141312]">{t.f1_highlight_title}</h4>
                      <p className="text-[11px] sm:text-xs text-[#635F59] mt-0.5 leading-relaxed font-light">
                        {t.f1_highlight_desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF9F6] border border-[#E5DFD5]/70 hover:bg-[#F5F3EE] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#E5DFD5] flex items-center justify-center shrink-0 shadow-sm text-[#141312]">
                      <span className="material-symbols-outlined text-[17px] text-[#3A7D5C]">movie</span>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-[#141312]">{t.f2_highlight_title}</h4>
                      <p className="text-[11px] sm:text-xs text-[#635F59] mt-0.5 leading-relaxed font-light">
                        {t.f2_highlight_desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF9F6] border border-[#E5DFD5]/70 hover:bg-[#F5F3EE] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#E5DFD5] flex items-center justify-center shrink-0 shadow-sm text-[#141312]">
                      <span className="material-symbols-outlined text-[17px] text-[#3A7D5C]">style</span>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-[#141312]">{t.f3_highlight_title}</h4>
                      <p className="text-[11px] sm:text-xs text-[#635F59] mt-0.5 leading-relaxed font-light">
                        {t.f3_highlight_desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Service Footnote */}
          <div className="flex flex-row items-center justify-between gap-2 text-[10px] sm:text-xs md:text-sm pt-3 sm:pt-4 border-t border-[#E5DFD5]/80 mt-3 sm:mt-5 font-['JetBrains_Mono'] text-[#635F59]">
            <div className="flex items-center gap-1.5 text-[#141312]">
              <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-[#3A7D5C]">sentiment_satisfied</span>
              <span>{t.service_crew}</span>
            </div>
            <div className="flex items-center gap-1 text-[#635F59]">
              <span className="material-symbols-outlined text-[14px] text-[#3A7D5C]">local_shipping</span>
              <span>{t.service_setup}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
