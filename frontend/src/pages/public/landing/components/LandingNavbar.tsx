// minja-cloud/frontend/src/pages/public/landing/components/LandingNavbar.tsx
// Floating Minimal Glass Navigation Bar — Mendukung Navigasi Mulus & Active Tab Indicator

import React, { useState, useEffect } from 'react';
import { Language, LandingTranslations } from '../translations';

export type LandingView = 'home' | 'about' | 'rent' | 'partner';

interface LandingNavbarProps {
  currentView: LandingView;
  onNavigate: (view: LandingView) => void;
  lang: Language;
  onToggleLang: (lang: Language) => void;
  t: LandingTranslations;
  whatsappUrl: string;
  galleryUrl: string;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  currentView,
  onNavigate,
  lang,
  onToggleLang,
  t,
  galleryUrl,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (view: LandingView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-4 md:top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div
          className={`pointer-events-auto max-w-6xl w-full mx-auto px-4 sm:px-6 py-2.5 rounded-full bg-[#FAF9F6]/90 backdrop-blur-md border border-[#E5DFD5]/90 shadow-[0_12px_32px_rgba(20,19,18,0.07),0_2px_6px_rgba(20,19,18,0.03)] flex items-center justify-between transition-all gap-4 ${isScrolled ? 'bg-[#FAF9F6]/95 border-[#D8D2C7] shadow-[0_16px_36px_rgba(20,19,18,0.12)]' : ''
            }`}
        >
          {/* Logo Brand */}
          <button
            onClick={() => handleLinkClick('home')}
            className="flex items-center gap-3 group shrink-0 text-left cursor-pointer transition-transform hover:opacity-90 active:scale-[0.98]"
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img src="/icons/minja-icon.png" alt="Minja Icon" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-['Playfair_Display',Georgia,serif] tracking-[0.16em] text-sm font-semibold uppercase text-[#141312]">
                  MINJA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D5C]"></span>
              </div>
              <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-[0.2em] text-[#635F59] -mt-0.5">
                Self-Serve PhotoBooth
              </span>
            </div>
          </button>

          {/* Desktop Nav Links (3 Halaman Stitch Dedikasi) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-[13px] tracking-wide text-[#635F59]">
            <button
              onClick={() => handleLinkClick('about')}
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer font-medium ${currentView === 'about'
                  ? 'bg-[#141312] text-[#FAF9F6] font-semibold shadow-xs'
                  : 'text-[#635F59] hover:text-[#141312] hover:bg-[#F5F3EE]'
                }`}
            >
              {t.nav_about}
            </button>
            <button
              onClick={() => handleLinkClick('rent')}
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer font-medium ${currentView === 'rent'
                  ? 'bg-[#141312] text-[#FAF9F6] font-semibold shadow-xs'
                  : 'text-[#635F59] hover:text-[#141312] hover:bg-[#F5F3EE]'
                }`}
            >
              {t.nav_rent}
            </button>
            <button
              onClick={() => handleLinkClick('partner')}
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer font-medium ${currentView === 'partner'
                  ? 'bg-[#141312] text-[#FAF9F6] font-semibold shadow-xs'
                  : 'text-[#635F59] hover:text-[#141312] hover:bg-[#F5F3EE]'
                }`}
            >
              {t.nav_partner}
            </button>
          </nav>

          {/* Action Tools: Admin Status, Language Switcher, Open Gallery Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F3EE] border border-[#E5DFD5]/70 text-[11px] text-[#635F59] shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D5C] animate-pulse"></span>
              <span className="tracking-wide">{t.admin_status}</span>
            </div>

            {/* Language Switcher */}
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-[#F5F3EE] border border-[#E5DFD5]/70 font-['JetBrains_Mono'] text-[11px] shadow-inner">
              <button
                className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${lang === 'id' ? 'bg-white text-[#141312] font-medium shadow-sm' : 'text-[#635F59] hover:text-[#141312]'
                  }`}
                onClick={() => onToggleLang('id')}
                type="button"
              >
                ID
              </button>
              <button
                className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${lang === 'en' ? 'bg-white text-[#141312] font-medium shadow-sm' : 'text-[#635F59] hover:text-[#141312]'
                  }`}
                onClick={() => onToggleLang('en')}
                type="button"
              >
                EN
              </button>
            </div>

            {/* Link ke Mobile Gallery */}
            <a
              className="hidden sm:inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-white text-[12px] tracking-wide font-medium border border-white/25 shadow-[0_4px_14px_rgba(30,58,95,0.32),0_1px_3px_rgba(0,0,0,0.1)] hover:bg-[#162d4c] hover:shadow-[0_6px_20px_rgba(30,58,95,0.4)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all bg-[#1F2022]"
              href={galleryUrl}
            >
              <span className="material-symbols-outlined text-[15px]">photo_library</span>
              <span>{t.chat_admin_btn}</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </a>

            {/* Hamburger Button for Mobile */}
            <button
              aria-label={lang === 'en' ? 'Open Menu' : 'Buka Menu'}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-[#F5F3EE] border border-[#E5DFD5]/80 text-[#141312] hover:bg-[#E5DFD5] transition-colors active:scale-95 shadow-sm cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#141312]/40 backdrop-blur-sm pointer-events-auto transition-opacity animate-in fade-in duration-200">
          <div className="absolute top-4 left-4 right-4 bg-[#FAF9F6] border border-[#E5DFD5] rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5DFD5]/70 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <img src="/icons/minja-icon.png" alt="Minja Icon" className="w-full h-full object-contain" />
                </div>
                <span className="font-['Playfair_Display',Georgia,serif] tracking-[0.16em] text-sm font-semibold uppercase text-[#141312]">
                  MINJA
                </span>
              </div>
              <button
                aria-label={lang === 'en' ? 'Close Menu' : 'Tutup Menu'}
                className="w-8 h-8 rounded-full bg-[#F5F3EE] border border-[#E5DFD5] flex items-center justify-center text-[#141312] hover:bg-[#E5DFD5] transition-colors cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F3EE] border border-[#E5DFD5]/70 text-[11px] text-[#635F59]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D5C] animate-pulse"></span>
                <span>{t.admin_status}</span>
              </div>
              <div className="inline-flex items-center p-0.5 rounded-full bg-[#F5F3EE] border border-[#E5DFD5]/70 font-['JetBrains_Mono'] text-[11px]">
                <button
                  className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${lang === 'id' ? 'bg-white text-[#141312] font-medium shadow-sm' : 'text-[#635F59]'
                    }`}
                  onClick={() => onToggleLang('id')}
                  type="button"
                >
                  ID
                </button>
                <button
                  className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${lang === 'en' ? 'bg-white text-[#141312] font-medium shadow-sm' : 'text-[#635F59]'
                    }`}
                  onClick={() => onToggleLang('en')}
                  type="button"
                >
                  EN
                </button>
              </div>
            </div>

            <nav className="flex flex-col space-y-2 pt-2 text-[15px] font-medium text-[#141312]">
              <button
                className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors text-left cursor-pointer ${currentView === 'home' ? 'bg-[#F5F3EE] font-semibold text-[#141312]' : 'hover:bg-[#F5F3EE]/60'
                  }`}
                onClick={() => handleLinkClick('home')}
              >
                <span>{t.nav_home}</span>
                <span className="material-symbols-outlined text-[18px] text-[#635F59]">chevron_right</span>
              </button>
              <button
                className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors text-left cursor-pointer ${currentView === 'about' ? 'bg-[#F5F3EE] font-semibold text-[#141312]' : 'hover:bg-[#F5F3EE]/60'
                  }`}
                onClick={() => handleLinkClick('about')}
              >
                <span>{t.nav_about}</span>
                <span className="material-symbols-outlined text-[18px] text-[#635F59]">chevron_right</span>
              </button>
              <button
                className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors text-left cursor-pointer ${currentView === 'rent' ? 'bg-[#F5F3EE] font-semibold text-[#141312]' : 'hover:bg-[#F5F3EE]/60'
                  }`}
                onClick={() => handleLinkClick('rent')}
              >
                <span>{t.nav_rent}</span>
                <span className="material-symbols-outlined text-[18px] text-[#635F59]">chevron_right</span>
              </button>
              <button
                className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors text-left cursor-pointer ${currentView === 'partner' ? 'bg-[#F5F3EE] font-semibold text-[#141312]' : 'hover:bg-[#F5F3EE]/60'
                  }`}
                onClick={() => handleLinkClick('partner')}
              >
                <span>{t.nav_partner}</span>
                <span className="material-symbols-outlined text-[18px] text-[#635F59]">chevron_right</span>
              </button>
            </nav>

            <div className="pt-2">
              <a
                className="flex items-center justify-center gap-2 h-11 w-full rounded-full text-white text-[13px] font-medium shadow-[0_4px_16px_rgba(30,58,95,0.35)] active:translate-y-0.5 transition-all bg-[#1F2022]"
                href={galleryUrl}
              >
                <span className="material-symbols-outlined text-[18px]">photo_library</span>
                <span>{t.chat_admin_btn}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
