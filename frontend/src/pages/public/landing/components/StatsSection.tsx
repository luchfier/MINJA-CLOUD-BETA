// minja-cloud/frontend/src/pages/public/landing/components/StatsSection.tsx
// Statistik & Bukti Kepercayaan Pelanggan Minja Studio

import React from 'react';
import { LandingTranslations } from '../translations';

interface StatsSectionProps {
  t: LandingTranslations;
  builderConfig?: import('../../../../types/pageBuilder').PageBuilderLandingConfig['stats'];
}

export const StatsSection: React.FC<StatsSectionProps> = ({ t, builderConfig }) => {
  const statsList = builderConfig?.items && builderConfig.items.length > 0 ? builderConfig.items : [
    { id: '1', value: '18.500+', label: t.stat_smiles, sublabel: t.stat_smiles_sub },
    { id: '2', value: '42.000+', label: t.stat_sessions, sublabel: t.stat_sessions_sub },
    { id: '3', value: '99.8%', label: t.stat_quality, sublabel: t.stat_quality_sub },
    { id: '4', value: '15+', label: t.stat_spots, sublabel: t.stat_spots_sub },
  ];

  return (
    <section className="max-w-6xl mx-auto px-6 md:px-8 py-16 border-t border-[#E5DFD5]">
      <div className="bg-white/90 border border-zinc-200/80 rounded-3xl p-8 md:p-12 shadow-[0_12px_32px_-4px_rgba(24,24,27,0.06),0_2px_6px_rgba(24,24,27,0.03)]">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-[0.25em] text-[#635F59] block mb-2">
            {t.stats_tag}
          </span>
          <h3 className="font-['Playfair_Display',Georgia,serif] text-2xl md:text-3xl text-[#141312] font-normal">
            {t.stats_title}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-[#E5DFD5]/70">
          {statsList.map((st: any, idx: number) => (
            <div key={st.id || idx} className={`${idx > 0 ? 'pt-4 md:pt-0 md:px-4' : 'text-center'} text-center`}>
              <div className="font-['Playfair_Display',Georgia,serif] text-3xl md:text-4xl text-[#141312] tracking-tight">
                {st.value}
              </div>
              <p className="text-xs md:text-sm text-[#141312] font-medium mt-1.5">{st.label}</p>
              <p className="text-[11px] text-[#635F59] font-light mt-0.5 leading-relaxed">{st.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
