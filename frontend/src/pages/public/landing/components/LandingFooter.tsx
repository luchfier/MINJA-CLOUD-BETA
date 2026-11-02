// minja-cloud/frontend/src/pages/public/landing/components/LandingFooter.tsx
// Footer & Catatan Penutup Hangat Minja Studio

import React from 'react';
import { LandingTranslations } from '../translations';
import { LandingView } from './LandingNavbar';

interface LandingFooterProps {
  t: LandingTranslations;
  whatsappUrl: string;
  galleryUrl: string;
  instagramHandle?: string;
  onNavigate?: (view: LandingView) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  t,
  whatsappUrl,
  galleryUrl,
  instagramHandle = '@minjabooth',
  onNavigate,
}) => {
  return (
    <footer className="w-full bg-[#FAF9F6] border-t border-[#E5DFD5] pt-14 pb-10 text-[#1F2022]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#E5DFD5]">
          {/* Brand Column */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <img src="/icons/minja-icon.png" alt="Minja Icon" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold tracking-tight text-lg font-['Playfair_Display',Georgia,serif]">MINJA</span>
              <span className="text-xs uppercase tracking-widest text-[#8C857B] font-['JetBrains_Mono']">
                SELF-SERVE PHOTOBOOTH
              </span>
            </div>
            <p className="text-sm font-['Playfair_Display',Georgia,serif] italic text-[#8C857B] max-w-md leading-relaxed">
              {t.footer_quote}
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-[#8C857B]">
              <a
                className="hover:text-[#1F2022] transition-colors flex items-center gap-1.5"
                href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                <span>{instagramHandle}</span>
              </a>
              <a
                className="hover:text-[#1F2022] transition-colors flex items-center gap-1.5"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[15px]">chat</span>
                <span>{t.footer_whatsapp}</span>
              </a>
            </div>
          </div>

          {/* Navigation Studio */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider text-[#8C857B]">{t.footer_nav_title}</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('about')}
                  className="hover:text-[#141312] text-[#8C857B] transition-colors cursor-pointer text-left"
                >
                  {t.nav_about}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('rent')}
                  className="hover:text-[#141312] text-[#8C857B] transition-colors cursor-pointer text-left"
                >
                  {t.nav_rent}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('partner')}
                  className="hover:text-[#141312] text-[#8C857B] transition-colors cursor-pointer text-left"
                >
                  {t.nav_partner}
                </button>
              </li>
              <li>
                <a className="hover:text-[#141312] text-[#8C857B] transition-colors" href={galleryUrl}>
                  {t.footer_gallery}
                </a>
              </li>
            </ul>
          </div>

          {/* Operating Hours */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider text-[#8C857B]">{t.footer_hours_title}</h4>
            <div className="space-y-1.5 text-xs text-[#8C857B]">
              <div className="flex justify-between">
                <span>{t.footer_days_weekday}</span>
                <span className="text-[#1F2022] font-['JetBrains_Mono']">{t.footer_hours_weekday}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.footer_days_weekend}</span>
                <span className="text-[#1F2022] font-['JetBrains_Mono']">{t.footer_hours_weekend}</span>
              </div>
              <div className="pt-2 text-[11px] text-[#8C857B] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t.footer_event_247}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C857B] gap-4">
          <p>{t.footer_copyright}</p>
          <div className="flex items-center gap-4 text-xs">
            <a className="hover:text-[#1F2022] transition-colors" href="mailto:admin@minja.my.id">
              admin@minja.my.id
            </a>
            <span>•</span>
            <span className="text-[#8C857B]">minja.my.id</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
