// minja-cloud/frontend/src/pages/public/landing/components/FrameLayoutsSection.tsx
// Ragam Pilihan Format & Tata Letak Cetak Foto Favorit

import React from 'react';
import { LandingTranslations } from '../translations';

interface FrameLayoutsSectionProps {
  t: LandingTranslations;
}

export const FrameLayoutsSection: React.FC<FrameLayoutsSectionProps> = ({ t }) => {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-8 py-16 border-t border-[#E5DFD5]" id="pilihan-bingkai">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
        <div>
          <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-[0.25em] text-[#635F59] block mb-2">
            {t.layouts_tag}
          </span>
          <h2 className="font-['Playfair_Display',Georgia,serif] text-3xl text-[#141312] font-normal">
            {t.layouts_title}
          </h2>
        </div>
        <p className="text-[13px] text-[#635F59] max-w-sm">
          {t.layouts_sub}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {/* Format 1: Foto Strip */}
        <div className="bg-gradient-to-b from-[#F7F5F0] to-[#EFECE6] rounded-2xl p-6 border border-zinc-200/80 shadow-[0_12px_32px_-4px_rgba(24,24,27,0.06),0_2px_6px_rgba(24,24,27,0.03)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-center flex flex-col justify-between">
          <div>
            <div className="w-full aspect-[3/4] bg-white rounded-xl p-3.5 shadow-[0_16px_36px_-8px_rgba(26,25,23,0.14)] mx-auto flex flex-col justify-between border-2 border-white mb-5 transform -rotate-1 hover:rotate-0 transition-transform duration-300 ring-1 ring-[#141312]/5">
              <div className="flex gap-2.5 h-full">
                <div className="w-1/2 flex flex-col gap-2">
                  <div className="h-1/3 rounded overflow-hidden bg-[#FAF9F6] shadow-sm">
                    <img
                      src="/images/landing/layout-strip-1.jpg"
                      alt="Dua sahabat tertawa lepas di photobooth"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="h-1/3 rounded overflow-hidden bg-[#FAF9F6] shadow-sm">
                    <img
                      src="/images/landing/layout-strip-2.jpg"
                      alt="Tiga sahabat ceria berangkulan"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="h-1/3 rounded overflow-hidden bg-[#FAF9F6] shadow-sm">
                    <img
                      src="/images/landing/layout-strip-3.jpg"
                      alt="Empat sahabat pose heboh seru"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="w-1/2 flex flex-col gap-2">
                  <div className="h-1/3 rounded overflow-hidden bg-[#FAF9F6] shadow-sm">
                    <img
                      src="/images/landing/layout-strip-1.jpg"
                      alt="Dua sahabat tertawa lepas monokrom"
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                  <div className="h-1/3 rounded overflow-hidden bg-[#FAF9F6] shadow-sm">
                    <img
                      src="/images/landing/layout-strip-4.jpg"
                      alt="Tiga pemuda tertawa pegang clicker"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="h-1/3 rounded overflow-hidden bg-[#FAF9F6] shadow-sm">
                    <img
                      src="/images/landing/layout-strip-5.jpg"
                      alt="Pose kompak sahabat"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-2 text-[8px] font-['JetBrains_Mono'] text-[#635F59] tracking-widest border-t border-[#E5DFD5]/60 flex justify-between">
                <span>{t.layout_strip_badge}</span>
                <span className="text-[#141312] font-medium">MINJA STUDIO</span>
              </div>
            </div>
            <h4 className="font-['Playfair_Display',Georgia,serif] text-base text-[#141312] font-medium">{t.f1_title}</h4>
            <p className="text-xs text-[#635F59] mt-1.5 leading-relaxed font-light">{t.f1_desc}</p>
          </div>
        </div>

        {/* Format 2: Single Cut */}
        <div className="bg-gradient-to-b from-[#F7F5F0] to-[#EFECE6] rounded-2xl p-6 border border-zinc-200/80 shadow-[0_12px_32px_-4px_rgba(24,24,27,0.06),0_2px_6px_rgba(24,24,27,0.03)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-center flex flex-col justify-between">
          <div>
            <div className="w-full aspect-[3/4] bg-white rounded-xl p-3.5 shadow-[0_16px_36px_-8px_rgba(26,25,23,0.14)] mx-auto flex flex-col justify-between border-2 border-white mb-5 transform rotate-1 hover:rotate-0 transition-transform duration-300 ring-1 ring-[#141312]/5">
              <div className="h-full flex flex-col justify-between py-1">
                <div className="w-full h-[68%] rounded-lg overflow-hidden bg-[#FAF9F6] shadow-sm">
                  <img
                    src="/images/landing/layout-4r-single.jpg"
                    alt="Pasangan Pengantin Wedding Minja"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="pt-3 text-left">
                  <p className="font-['Playfair_Display',Georgia,serif] italic text-sm text-[#141312]">{t.f2_quote}</p>
                  <p className="text-[10px] text-[#635F59] font-['JetBrains_Mono'] mt-0.5">{t.f2_date}</p>
                </div>
              </div>
              <div className="pt-2 text-[8px] font-['JetBrains_Mono'] text-[#635F59] tracking-widest border-t border-[#E5DFD5]/60 flex justify-between">
                <span>{t.layout_single_badge_1}</span>
                <span>{t.layout_single_badge_2}</span>
              </div>
            </div>
            <h4 className="font-['Playfair_Display',Georgia,serif] text-base text-[#141312] font-medium">{t.f2_title}</h4>
            <p className="text-xs text-[#635F59] mt-1.5 leading-relaxed font-light">{t.f2_desc}</p>
          </div>
        </div>

        {/* Format 3: Kolase Cerita */}
        <div className="bg-gradient-to-b from-[#F7F5F0] to-[#EFECE6] rounded-2xl p-6 border border-zinc-200/80 shadow-[0_12px_32px_-4px_rgba(24,24,27,0.06),0_2px_6px_rgba(24,24,27,0.03)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-center flex flex-col justify-between sm:col-span-2 md:col-span-1">
          <div>
            <div className="w-full aspect-[3/4] bg-white rounded-xl p-3.5 shadow-[0_16px_36px_-8px_rgba(26,25,23,0.14)] mx-auto flex flex-col justify-between border-2 border-white mb-5 transform -rotate-1 hover:rotate-0 transition-transform duration-300 ring-1 ring-[#141312]/5">
              <div className="grid grid-cols-2 gap-2 h-full">
                <div className="bg-[#FAF9F6] rounded-lg overflow-hidden shadow-sm">
                  <img
                    src="/images/landing/layout-grid-1.jpg"
                    alt="Empat sahabat berpelukan"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-[#FAF9F6] rounded-lg overflow-hidden shadow-sm">
                  <img
                    src="/images/landing/layout-grid-2.jpg"
                    alt="Tiga sahabat kacamata unik"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-[#FAF9F6] rounded-lg overflow-hidden shadow-sm">
                  <img
                    src="/images/landing/layout-grid-3.jpg"
                    alt="Dua sahabat pose lucu"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-[#FAF9F6] rounded-lg overflow-hidden shadow-sm">
                  <img
                    src="/images/landing/layout-grid-4.jpg"
                    alt="Empat sahabat tertawa ceria"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="pt-2 text-[8px] font-['JetBrains_Mono'] text-[#635F59] tracking-widest border-t border-[#E5DFD5]/60 flex justify-between">
                <span>{t.layout_grid_badge_1}</span>
                <span>{t.layout_grid_badge_2}</span>
              </div>
            </div>
            <h4 className="font-['Playfair_Display',Georgia,serif] text-base text-[#141312] font-medium">{t.f3_title}</h4>
            <p className="text-xs text-[#635F59] mt-1.5 leading-relaxed font-light">{t.f3_desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
