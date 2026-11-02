// minja-cloud/frontend/src/pages/public/landing/components/PillarsSection.tsx
// Tiga Nilai Kasih & Keunggulan Utama Minja Photobooth

import React from 'react';
import { LandingTranslations } from '../translations';

interface PillarsSectionProps {
  t: LandingTranslations;
}

export const PillarsSection: React.FC<PillarsSectionProps> = ({ t }) => {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-8 py-20 border-t border-[#E5DFD5]" id="cerita-kami">
      <div className="max-w-2xl mb-14">
        <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-[0.25em] text-[#635F59] block mb-2">
          {t.pillars_tag}
        </span>
        <h2 className="font-['Playfair_Display',Georgia,serif] text-3xl md:text-4xl text-[#141312] font-normal leading-snug">
          {t.pillars_title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kartu 1: Cetak Foto Tahan Lama */}
        <div className="bg-white/95 p-8 rounded-2xl border border-zinc-200/80 shadow-[0_12px_32px_-4px_rgba(24,24,27,0.06),0_2px_6px_rgba(24,24,27,0.03)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="w-10 h-10 rounded-full bg-[#F5F3EE] border border-[#E5DFD5]/60 flex items-center justify-center text-[#141312] mb-6 shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">water_drop</span>
            </div>
            <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#635F59]">
              {t.p1_number}
            </span>
            <h3 className="font-['Playfair_Display',Georgia,serif] text-xl text-[#141312] mt-2 mb-3">
              {t.p1_title}
            </h3>
            <p className="text-[13px] text-[#635F59] leading-relaxed font-light">
              {t.p1_desc}
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-[#E5DFD5]/70 flex items-center justify-between text-[11px] font-['JetBrains_Mono'] text-[#635F59]">
            <span>{t.p1_badge_left}</span>
            <span className="text-[#141312] font-semibold">{t.p1_badge_right}</span>
          </div>
        </div>

        {/* Kartu 2: Scan QR Langsung Masuk HP */}
        <div className="bg-white/95 p-8 rounded-2xl border border-zinc-200/80 shadow-[0_12px_32px_-4px_rgba(24,24,27,0.06),0_2px_6px_rgba(24,24,27,0.03)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="w-10 h-10 rounded-full bg-[#F5F3EE] border border-[#E5DFD5]/60 flex items-center justify-center text-[#141312] mb-6 shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            </div>
            <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#635F59]">
              {t.p2_number}
            </span>
            <h3 className="font-['Playfair_Display',Georgia,serif] text-xl text-[#141312] mt-2 mb-3">
              {t.p2_title}
            </h3>
            <p className="text-[13px] text-[#635F59] leading-relaxed font-light">
              {t.p2_desc}
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-[#E5DFD5]/70 flex items-center justify-between text-[11px] font-['JetBrains_Mono'] text-[#635F59]">
            <span>{t.p2_badge_left}</span>
            <span className="text-[#141312] font-semibold">{t.p2_badge_right}</span>
          </div>
        </div>

        {/* Kartu 3: Desain Frame Sesuai Visi Kamu */}
        <div className="bg-white/95 p-8 rounded-2xl border border-zinc-200/80 shadow-[0_12px_32px_-4px_rgba(24,24,27,0.06),0_2px_6px_rgba(24,24,27,0.03)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="w-10 h-10 rounded-full bg-[#F5F3EE] border border-[#E5DFD5]/60 flex items-center justify-center text-[#141312] mb-6 shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">crop_portrait</span>
            </div>
            <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#635F59]">
              {t.p3_number}
            </span>
            <h3 className="font-['Playfair_Display',Georgia,serif] text-xl text-[#141312] mt-2 mb-3">
              {t.p3_title}
            </h3>
            <p className="text-[13px] text-[#635F59] leading-relaxed font-light">
              {t.p3_desc}
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-[#E5DFD5]/70 flex items-center justify-between text-[11px] font-['JetBrains_Mono'] text-[#635F59]">
            <span>{t.p3_badge_left}</span>
            <span className="text-[#141312] font-semibold">{t.p3_badge_right}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
