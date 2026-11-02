// minja-cloud/frontend/src/pages/public/gallery/GalleryExpired.tsx
// State 4: Halaman Kedaluwarsa 1:1 Presisi dari Desain Resmi Stitch Lumina
// Menampilkan Jam Pasir Bertumpuk, Subheader Terstandarisasi (Venue > Resi > Tanggal), Kartu Apresiasi Abadi, Tombol Cari Sesi Lain, dan Instagram

import React, { useMemo } from 'react';

export interface GalleryExpiredProps {
  sessionCode?: string;
  studioAddress?: string;
  createdAt?: string;
  onBackToInput?: () => void;
  builderConfig?: import('../../../types/pageBuilder').PageBuilderGalleryConfig['expired'];
}

export const GalleryExpired: React.FC<GalleryExpiredProps> = ({
  sessionCode,
  studioAddress,
  createdAt,
  onBackToInput,
  builderConfig,
}) => {
  // Format tanggal sesi (hanya tampilkan tanggal saja, misal: 3 Nov 2026)
  const formattedDate = useMemo(() => {
    try {
      const d = createdAt ? new Date(createdAt) : new Date();
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Hari ini';
    }
  }, [createdAt]);

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-300 text-center pb-8">
      {/* Icon Jam Pasir Bertumpuk */}
      <div className="flex flex-col w-full items-center text-center pt-2">
        <div className="relative w-16 h-16 rounded-full bg-[#eeedf7] flex items-center justify-center mb-3 shadow-sm">
          <div className="w-11 h-11 rounded-full bg-[#e3e1ec]/80 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px] text-[#47464b]">
              hourglass_disabled
            </span>
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
          </span>
        </div>

        <h1 className="text-[20px] text-[#1a1b22] font-bold tracking-tight mb-1.5">
          {builderConfig?.headline || 'Masa Simpan Foto Berakhir ⏳'}
        </h1>
        <p className="text-[13px] text-[#47464b] max-w-[320px] leading-relaxed mb-3">
          {builderConfig?.subheadline || 'Foto sesi digital otomatis dihapus setelah 48 jam demi keamanan dan privasi Anda.'}
        </p>

        {/* Informasi Subheader Terstandarisasi: Alamat > No Resi > Tanggal Sesi */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center px-0.5 mt-0.5 mb-4">
          <div className="flex items-center gap-1 min-w-0">
            <span className="material-symbols-outlined text-[15px] text-[#47464b] shrink-0">location_on</span>
            <span className="text-[11.5px] text-[#1a1b22] font-semibold font-['JetBrains_Mono'] truncate">
              {studioAddress || 'Lokasi Booth Minja Studio'}
            </span>
          </div>
          <span className="text-zinc-300 text-[10px] shrink-0">•</span>
          <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-200/80 px-1.5 py-0.5 rounded font-['JetBrains_Mono'] shrink-0">
            #{sessionCode || 'PASS-7821'}
          </span>
          <span className="text-zinc-300 text-[10px] shrink-0">•</span>
          <div className="flex items-center gap-1 text-[#47464b] shrink-0">
            <span className="material-symbols-outlined text-[13px] shrink-0">calendar_today</span>
            <span className="text-[11px] text-[#47464b] font-medium font-['JetBrains_Mono']">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Kartu Pesan Apresiasi */}
        <div className="w-full bg-white rounded-2xl p-5 mb-5 shadow-sm border border-zinc-200/80 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-[#eeedf7] flex items-center justify-center mb-3 text-black">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </div>
          <h2 className="text-[16px] font-bold text-[#1a1b22] mb-1.5">
            Terima Kasih Sudah Mengukir Kenangan Bareng Kami! 🤍
          </h2>
          <p className="text-[12px] text-[#47464b] leading-relaxed max-w-[310px]">
            Meskipun masa simpan digitalnya sudah selesai, tawa dan cerita serumu hari ini bakal selalu abadi di lembar foto fisikmu. Jangan lupa simpan cetakannya di tempat terbaik ya! Kalau mau cerita atau pamer hasil foto, tag kami di Instagram 🥰
          </p>
        </div>

        {/* Action Buttons: Tombol Aksi Jelas & Nyaman Disentuh */}
        <div className="w-full flex flex-col items-center gap-2.5 pt-1">
          {onBackToInput && (
            <button
              type="button"
              onClick={onBackToInput}
              className="w-full h-11 rounded-xl bg-black text-white hover:bg-zinc-800 flex items-center justify-center gap-2 text-[13px] font-semibold active:scale-[0.98] transition-all duration-150 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span>Cari Nomor Sesi Lain</span>
            </button>
          )}

          <a
            className="w-full h-11 rounded-xl bg-white text-[#1a1b22] hover:bg-zinc-50 border border-zinc-200/90 flex items-center justify-center gap-2 text-[13px] font-semibold active:scale-[0.98] transition-all duration-150 shadow-xs"
            href="https://instagram.com/minjabooth"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[17px] text-[#4648d4]">photo_camera</span>
            <span>Follow &amp; Tag @minjabooth</span>
          </a>

          <p className="text-[11.5px] text-[#47464b] mt-1.5 leading-relaxed max-w-[320px]">
            Salah ketik nomor resi atau butuh bantuan foto cetak? Silakan tanyakan ke operator di lokasi booth ya.
          </p>
        </div>

        {/* Footer Minimalis */}
        <footer className="w-full pt-6 mt-4 text-center border-t border-zinc-200/80">
          <p className="text-[11px] text-[#47464b]/70 tracking-wide font-['JetBrains_Mono']">
            © 2026 Minja Studio SELF-SERVE PHOTOBOOTH
          </p>
        </footer>
      </div>
    </div>
  );
};

