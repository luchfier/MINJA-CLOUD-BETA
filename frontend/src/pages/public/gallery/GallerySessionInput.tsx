// minja-cloud/frontend/src/pages/public/gallery/GallerySessionInput.tsx
// Halaman Input Galeri Mobile: Desain Simpel, Bersih, dan Minimalis (Nomor Sesi & PIN)

import React, { useState, useRef, useEffect } from 'react';

export interface GallerySessionInputProps {
  onSubmit: (sessionNumber: string, pin: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const GallerySessionInput: React.FC<GallerySessionInputProps> = ({
  onSubmit,
  isLoading = false,
  error = null,
}) => {
  const [sessionNumber, setSessionNumber] = useState('');
  const [pin, setPin] = useState('');
  const sessionInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionInputRef.current?.focus();
  }, []);

  const submitForm = () => {
    const sNum = sessionNumber.trim();
    const pVal = pin.trim();

    if (!sNum && !pVal) {
      sessionInputRef.current?.focus();
      return;
    }

    if (!sNum) {
      sessionInputRef.current?.focus();
      return;
    }

    if (!pVal) {
      pinInputRef.current?.focus();
      return;
    }

    onSubmit(sNum, pVal);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in duration-300">
      {/* Kartu Input Utama: Minimalis & Elegan */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-5">
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
            Akses Galeri
          </span>
          <h1 className="text-[22px] font-bold text-black tracking-tight mt-1">
            Buka Hasil Fotomu ✨
          </h1>
          <p className="text-[13px] text-zinc-500 mt-1 max-w-xs mx-auto">
            Masukkan Nomor Sesi dan PIN dari layar photobooth.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium flex items-center justify-center gap-1.5 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* 2 Input Sederhana: Nomor Sesi & PIN */}
        <div className="space-y-4 mb-4">
          <div>
            <label
              htmlFor="session-number"
              className="block text-xs font-bold text-zinc-600 mb-1.5 uppercase tracking-wider font-mono"
            >
              Nomor Sesi
            </label>
            <input
              id="session-number"
              ref={sessionInputRef}
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 0018"
              value={sessionNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                setSessionNumber(val);
                if (val.length === 4) {
                  pinInputRef.current?.focus();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (pin) submitForm();
                  else pinInputRef.current?.focus();
                }
              }}
              className="w-full h-12 px-4 rounded-xl bg-[#F8F7FC] border border-zinc-200/80 text-zinc-900 font-mono text-base font-semibold placeholder:text-zinc-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-xs"
            />
          </div>

          <div>
            <label
              htmlFor="pin-number"
              className="block text-xs font-bold text-zinc-600 mb-1.5 uppercase tracking-wider font-mono"
            >
              PIN
            </label>
            <input
              id="pin-number"
              ref={pinInputRef}
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 7821"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitForm();
                else if (e.key === 'Backspace' && !pin) sessionInputRef.current?.focus();
              }}
              className="w-full h-12 px-4 rounded-xl bg-[#F8F7FC] border border-zinc-200/80 text-zinc-900 font-mono text-base font-semibold placeholder:text-zinc-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Tombol Aksi */}
        <button
          id="btn-submit"
          type="button"
          onClick={submitForm}
          disabled={isLoading}
          className="w-full h-12 bg-black hover:bg-zinc-900 text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.18)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-80"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              <span className="text-[13px]">Memverifikasi...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>Buka Foto & Video ✨</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </span>
          )}
        </button>

        {/* Notifikasi Loading Minimalis */}
        {isLoading && (
          <div className="mt-3 p-3 rounded-xl bg-[#EEEDF7] border border-purple-100 flex items-center gap-2 text-zinc-900 font-bold text-[13px] animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 animate-spin shrink-0">sync</span>
            <span className="text-xs text-zinc-700 font-medium">Menghubungkan ke arsip foto Minja...</span>
          </div>
        )}
      </section>

      {/* Kartu Apresiasi Ringkas & Bersih */}
      <section className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] mb-5 text-center flex flex-col items-center">
        <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-3 shadow-xs">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            favorite
          </span>
        </div>
        <h3 className="text-[15px] font-bold text-zinc-900 mb-1">
          Makasih Udah Foto bareng Minja! ✨
        </h3>
        <p className="text-[12.5px] text-zinc-500 leading-relaxed max-w-xs mb-3.5">
          Simpan dan bagikan foto serumu bareng teman-teman ya!
        </p>
        <a
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-zinc-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          href="https://instagram.com/minjabooth"
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="material-symbols-outlined text-[16px] text-zinc-600">photo_library</span>
          <span>@minjabooth di Instagram</span>
          <span className="material-symbols-outlined text-[14px] text-zinc-400">arrow_forward</span>
        </a>
      </section>

      {/* Footer Trademark Minimalis */}
      <footer className="mt-auto pt-2 pb-6 flex flex-col items-center justify-center text-center">
        <p className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase font-mono">
          © 2026 Minja Studio
        </p>
      </footer>
    </div>
  );
};
