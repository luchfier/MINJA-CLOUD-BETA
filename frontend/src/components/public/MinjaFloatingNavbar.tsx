import React, { useState, useEffect } from 'react';
import { Camera, ArrowRight, Menu, X } from 'lucide-react';

interface MinjaNavbarProps {
  currentPath?: string;
  galleryUrl?: string;
  whatsappNumber?: string;
  onLanguageChange?: (lang: 'id' | 'en') => void;
  defaultLang?: 'id' | 'en';
}

export const MinjaFloatingNavbar: React.FC<MinjaNavbarProps> = ({
  currentPath = '/',
  galleryUrl = 'https://gallery.minja.my.id',
  whatsappNumber = '6281234567890',
  onLanguageChange,
  defaultLang = 'id',
}) => {
  const [lang, setLang] = useState<'id' | 'en'>(defaultLang);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLangToggle = (selectedLang: 'id' | 'en') => {
    setLang(selectedLang);
    if (onLanguageChange) {
      onLanguageChange(selectedLang);
    }
  };

  const navLinks = [
    {
      label: lang === 'id' ? 'Tentang Minja' : 'About Minja',
      href: '#cerita-kami',
    },
    {
      label: lang === 'id' ? 'Koleksi Bingkai' : 'Frame Gallery',
      href: '#pilihan-bingkai',
    },
    {
      label: lang === 'id' ? 'Sewa Buat Acara' : 'Event Rental',
      href: '#hadirkan-di-acara',
    },
  ];

  return (
    <>
      {/* Floating Header Container */}
      <header className="fixed top-4 md:top-6 left-0 right-0 z-50 px-4 sm:px-6 flex justify-center pointer-events-none">
        <nav
          className={`pointer-events-auto w-full max-w-5xl transition-all duration-300 rounded-full border border-[#E5DFD5]/90 bg-[#FAF9F6]/85 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
            isScrolled ? 'shadow-[0_12px_32px_rgba(31,32,34,0.08)] bg-[#FAF9F6]/95 border-[#D8D2C7]' : ''
          }`}
        >
          {/* Logo & Brand Mark */}
          <a
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-80 shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1F2022] text-[#FAF9F6] flex items-center justify-center shadow-sm">
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:scale-110" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm sm:text-base font-serif tracking-wider text-[#1F2022]">
                MINJA
              </span>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[#8C857B]" />
              <span className="hidden sm:inline-block text-[10px] tracking-widest uppercase font-medium text-[#8C857B]">
                SELF-SERVE BOOTH
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-[#5F5A52]">
            {navLinks.map((link) => {
              const isActive = currentPath === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`transition-colors py-1 relative hover:text-[#1F2022] ${
                    isActive ? 'text-[#1F2022] font-semibold' : ''
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1F2022] rounded-full" />
                  )}
                </a>
              );
            })}
          </div>

          {/* Actions: Admin Status, Language Switcher, Gallery CTA */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Admin Siaga Pill (Desktop only) */}
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8ECE9] text-[#2D5A43] text-[11px] font-medium border border-[#D5DDD7] hover:bg-[#DCE3DD] transition-colors"
              title="WhatsApp Admin Siaga Online"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>{lang === 'id' ? 'Admin Siaga' : 'Online Support'}</span>
            </a>

            {/* Language Switcher Segmented Control */}
            <div className="flex items-center bg-[#F0EAE1] p-0.5 rounded-full border border-[#E5DFD5] text-[11px] font-medium text-[#7A746B]">
              <button
                type="button"
                onClick={() => handleLangToggle('id')}
                className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  lang === 'id'
                    ? 'bg-[#FFFFFF] text-[#1F2022] font-semibold shadow-xs'
                    : 'hover:text-[#1F2022]'
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => handleLangToggle('en')}
                className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#FFFFFF] text-[#1F2022] font-semibold shadow-xs'
                    : 'hover:text-[#1F2022]'
                }`}
              >
                EN
              </button>
            </div>

            {/* Gallery Portal CTA Button (Deep Studio Navy: #1E3A5F) */}
            <a
              href={galleryUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#1E3A5F] hover:bg-[#152B47] text-[#FAF9F6] text-xs font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all shadow-sm active:scale-95 group cursor-pointer"
            >
              <span>{lang === 'id' ? 'Buka Gallery kamu' : 'Access Your Gallery'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-full text-[#1F2022] hover:bg-[#F0EAE1] transition-colors focus:outline-hidden cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-[#1F2022]" />
              ) : (
                <Menu className="w-5 h-5 text-[#1F2022]" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer / Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden pointer-events-auto">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Floating Dropdown Card */}
          <div className="fixed top-20 left-4 right-4 bg-[#FAF9F6] border border-[#E5DFD5] rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5]">
              <span className="text-xs uppercase tracking-widest text-[#8C857B] font-semibold">
                {lang === 'id' ? 'Navigasi Studio' : 'Studio Navigation'}
              </span>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 text-xs text-[#2D5A43] font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{lang === 'id' ? 'Admin Siaga Online' : 'Online Support'}</span>
              </a>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-base font-serif transition-colors py-1.5 px-2 rounded-lg hover:bg-[#F4F1EA] ${
                    currentPath === link.href
                      ? 'text-[#1E3A5F] font-bold bg-[#F0EAE1]'
                      : 'text-[#1F2022]'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Mobile Primary Button */}
            <div className="pt-2">
              <a
                href={galleryUrl}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#152B47] text-[#FAF9F6] text-sm font-semibold py-3 px-5 rounded-full transition-all shadow-md active:scale-98"
              >
                <span>{lang === 'id' ? 'Buka Gallery kamu' : 'Open Photo Gallery'}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MinjaFloatingNavbar;
