// minja-cloud/frontend/src/pages/public/gallery/GalleryProcessing.tsx
// State 2: Sedang Diproses (Dihubungkan ke Dedicated GalleryProgressEngine di VPS)
// Menampilkan Circular SVG Ring Progress riil, 3 Checklist Mikro dinamis, Petunjuk Dispenser Cetak, dan Banner Penyimpanan 48 Jam

import React, { useEffect, useState } from 'react';
import { formatSessionDigits } from '../../../services/sessionHelper';

export interface GalleryProcessingProps {
  sessionId: string;
  sessionCode?: string;
  token?: string;
  onReady: () => void;
}

interface StepItemState {
  status: 'done' | 'processing' | 'waiting';
  label: string;
  count?: number;
}

export const GalleryProcessing: React.FC<GalleryProcessingProps> = ({
  sessionId,
  sessionCode,
  token,
  onReady,
}) => {
  const [progress, setProgress] = useState<number>(35);
  const [displayProgress, setDisplayProgress] = useState<number>(35);
  const [phaseLabel, setPhaseLabel] = useState<string>('Menyiapkan Galeri');
  const [message, setMessage] = useState<string>(
    'Mohon tunggu sebentar, file foto dan video dari photobooth sedang dikirim ke cloud.'
  );
  const [steps, setSteps] = useState<{
    studioPhotos: StepItemState;
    frameLayouts: StepItemState;
    liveVideo: StepItemState;
  }>({
    studioPhotos: { status: 'processing', label: 'Lagi disiapin...' },
    frameLayouts: { status: 'waiting', label: 'Menunggu foto...' },
    liveVideo: { status: 'waiting', label: 'Menunggu giliran...' },
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Timer elapsed seconds untuk mendeteksi jaringan lambat (Smart Circuit Breaker)
  useEffect(() => {
    const t = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleCopyLink = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      }).catch(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      });
    } else {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  // Animasi angka progres meluncur mulus (smooth counter ticker)
  useEffect(() => {
    if (displayProgress === progress) return;
    const diff = progress - displayProgress;
    const step = diff > 0 ? 1 : -1;
    const intervalTime = Math.max(12, Math.min(40, Math.floor(400 / Math.abs(diff))));
    const timer = setTimeout(() => {
      setDisplayProgress((prev) => prev + step);
    }, intervalTime);
    return () => clearTimeout(timer);
  }, [progress, displayProgress]);

  // Auto-polling status ke backend setiap 2 detik
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const queryToken = token ? `?token=${encodeURIComponent(token)}` : '';
        const res = await fetch(`/api/public/gallery/${encodeURIComponent(sessionId)}/status${queryToken}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data?.success && data?.data) {
          const d = data.data;

          if (d.status === 'ready') {
            setProgress(100);
            if (d.steps) {
              setSteps(d.steps);
            } else {
              setSteps({
                studioPhotos: { status: 'done', label: 'Beres ✨' },
                frameLayouts: { status: 'done', label: 'Beres ✨' },
                liveVideo: { status: 'done', label: 'Beres ✨' },
              });
            }
            setTimeout(() => {
              if (isMounted) onReady();
            }, 600);
            return;
          }

          if (typeof d.progress === 'number') {
            setProgress((prev) => Math.max(prev, d.progress));
          }
          if (d.currentPhaseLabel) {
            setPhaseLabel(d.currentPhaseLabel);
          }
          if (d.message) {
            setMessage(d.message);
          }
          if (d.steps) {
            setSteps(d.steps);
          }
        }
      } catch (err) {
        console.warn('[GalleryProcessing] Polling error:', err);
      }
    };

    // Polling pertama seketika
    checkStatus();

    // Polling berkala setiap 2 detik
    const interval = setInterval(() => {
      // Jika mode demo / offline preview, berikan progres visual bertahap
      if (sessionId.includes('MJA-20261102-0018') || sessionId.includes('7821')) {
        setProgress((prev) => {
          if (prev < 90) return prev + 12;
          return 90;
        });
      }
      checkStatus();
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, token, onReady]);

  // Circumference 2 * PI * 26 ≈ 163.36
  const strokeOffset = 163.36 - (163.36 * displayProgress) / 100;

  const renderStepIcon = (status: 'done' | 'processing' | 'waiting') => {
    if (status === 'done') {
      return (
        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[14px]">check</span>
        </div>
      );
    }
    if (status === 'processing') {
      return (
        <div className="w-5 h-5 rounded-full bg-[#e1e0ff] text-[#4648d4] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
        </div>
      );
    }
    return (
      <div className="w-5 h-5 rounded-full bg-zinc-200/70 text-zinc-400 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[12px]">schedule</span>
      </div>
    );
  };

  const renderStepBadge = (status: 'done' | 'processing' | 'waiting', label: string) => {
    if (status === 'done') {
      return <span className="text-[11px] text-emerald-600 font-semibold">{label}</span>;
    }
    if (status === 'processing') {
      return <span className="text-[11px] text-[#4648d4] font-bold">{label}</span>;
    }
    return <span className="text-[11px] text-zinc-400 font-medium">{label}</span>;
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Info Sesi & Lokasi Booth Singkat */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#eeedf7] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] text-[#47464b]">storefront</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] tracking-tight text-[#1a1b22] truncate font-semibold">
              Minja Photobooth
            </span>
            <span className="text-[12px] text-[#47464b] font-['JetBrains_Mono']">
              Sesi #{sessionCode ? sessionCode.replace(/^#+/, '') : formatSessionDigits(sessionId)}
            </span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e1e0ff] text-[#07006c] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4648d4] animate-pulse"></span>
          <span className="text-[11px] font-semibold">{phaseLabel}</span>
        </div>
      </div>

      {/* Hero Card: Status Utama Ringkas & Progres Bersih */}
      <div className="bg-white rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col space-y-4 border border-zinc-200/80">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c]">
              <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider font-['JetBrains_Mono']">
                {phaseLabel}
              </span>
            </div>
            <h1 className="text-[18px] sm:text-[20px] font-bold text-[#1a1b22] pt-0.5 leading-tight">
              Foto &amp; videomu hampir siap ✨
            </h1>
            <p className="text-[12px] text-[#47464b] leading-relaxed">
              {message}
            </p>
          </div>
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle
                className="text-[#eeedf7]"
                cx="32"
                cy="32"
                fill="none"
                r="26"
                stroke="currentColor"
                strokeWidth="4.5"
              />
              <circle
                className="text-[#4648d4] stroke-current transition-all duration-700 ease-out"
                cx="32"
                cy="32"
                fill="none"
                r="26"
                stroke="currentColor"
                strokeDasharray="163.36"
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                strokeWidth="4.5"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[13px] font-bold text-[#1a1b22] leading-none font-['JetBrains_Mono']">
                {displayProgress}%
              </span>
              <span className="text-[8px] text-[#47464b] uppercase mt-0.5 font-semibold">proses</span>
            </div>
          </div>
        </div>

        {/* Checklist Progres Riil Terhubung ke Backend Engine */}
        <div className="space-y-1 bg-[#f4f2fd] p-3 rounded-xl">
          <div className="flex items-center gap-2 py-0.5">
            {renderStepIcon(steps.studioPhotos.status)}
            <span className="flex-1 text-[13px] font-medium text-[#1a1b22]">📸 Foto hasil studio</span>
            {renderStepBadge(steps.studioPhotos.status, steps.studioPhotos.label)}
          </div>
          <div className="flex items-center gap-2 py-0.5">
            {renderStepIcon(steps.frameLayouts.status)}
            <span className="flex-1 text-[13px] font-medium text-[#1a1b22]">🖼️ Pasang bingkai foto</span>
            {renderStepBadge(steps.frameLayouts.status, steps.frameLayouts.label)}
          </div>
          <div className="flex items-center gap-2 py-0.5">
            {renderStepIcon(steps.liveVideo.status)}
            <span className="flex-1 text-[13px] font-medium text-[#1a1b22]">🎬 Klip video momen seru</span>
            {renderStepBadge(steps.liveVideo.status, steps.liveVideo.label)}
          </div>
        </div>
      </div>

      {/* SMART CIRCUIT BREAKER: Bantuan Darurat saat Jaringan Lambat (> 35 Detik) */}
      {elapsedSeconds >= 35 && (
        <div className="bg-amber-50/95 border border-amber-300/90 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[18px]">wifi_tethering_error</span>
            </div>
            <div className="flex-1">
              <h4 className="text-[13px] font-bold text-amber-900 leading-snug">
                Sinkronisasi Membutuhkan Waktu
              </h4>
              <p className="text-[11.5px] text-amber-800/90 leading-relaxed mt-0.5">
                Koneksi di mesin booth sedang lambat. Tenang, foto tersimpan aman selama 48 jam. Anda bisa membuka galeri sekarang atau menyimpan link sesi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={onReady}
              className="h-10 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Buka Galeri Tetap</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="h-10 px-3 rounded-xl bg-white hover:bg-amber-100/60 active:scale-95 transition-all border border-amber-300 text-amber-900 text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copySuccess ? 'check_circle' : 'content_copy'}
              </span>
              <span>{copySuccess ? 'Tersalin ✓' : 'Simpan Link Sesi'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Kartu Panduan Selagi Menunggu */}
      <div className="bg-[#f4f2fd] rounded-2xl p-4 space-y-2 border border-zinc-200/80">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#1a1b22]">tips_and_updates</span>
          <h2 className="text-[13px] font-bold text-[#1a1b22]">💡 Petunjuk di Booth:</h2>
        </div>
        <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
          <div className="w-6 h-6 rounded-full bg-[#eeedf7] text-[#1a1b22] flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[14px] text-[#47464b]">print</span>
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-[#1a1b22]">🖨️ Ambil cetakan foto fisik Anda</p>
            <p className="text-[11.5px] text-[#47464b] leading-relaxed mt-0.5">
              Kertas foto keluar dari dispenser bawah mesin booth dalam ~30 detik. Tetap di halaman ini untuk mengunduh versi digital.
            </p>
          </div>
        </div>
      </div>

      {/* Informasi Penyimpanan 48 Jam */}
      <div className="p-3 rounded-xl bg-white border border-zinc-200/80 flex items-center gap-2.5 shadow-2xs">
        <span className="material-symbols-outlined text-[18px] text-[#47464b] shrink-0">lock_clock</span>
        <p className="text-[11px] text-[#47464b] leading-tight">
          <span className="font-semibold text-[#1a1b22]">⏳ Penyimpanan Aman 48 Jam:</span> Seluruh file foto &amp; video dapat diunduh tanpa batas sebelum dihapus otomatis.
        </p>
      </div>

      {/* Footer Minimalis */}
      <div className="py-2 text-center flex flex-col items-center justify-center space-y-1">
        <div className="w-full h-px bg-zinc-200/80 mb-3"></div>
        <span className="text-[10px] text-[#47464b] opacity-75 font-['JetBrains_Mono']">
          © 2026 Minja Studio SELF-SERVE PHOTOBOOTH
        </span>
      </div>
    </div>
  );
};
