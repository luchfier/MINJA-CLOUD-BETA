// minja-cloud/frontend/src/pages/public/gallery/GalleryUnlocking.tsx
// Tampilan Animasi Pembuka Galeri Foto Interaktif (Zero Input Flash & Smooth Reveal)
// Dirancang elegan dengan Framer Motion: Polaroid Card Fan-out, Shimmering Aperture, & Monospace Session Badge

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Camera, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export interface GalleryUnlockingProps {
  sessionCode?: string;
  onAnimationComplete?: () => void;
}

export const GalleryUnlocking: React.FC<GalleryUnlockingProps> = ({
  sessionCode,
  onAnimationComplete,
}) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Progres bar halus 15% -> 100% dalam durasi ~1.2 detik
    const timer1 = setTimeout(() => setProgress(55), 250);
    const timer2 = setTimeout(() => setProgress(88), 650);
    const timer3 = setTimeout(() => setProgress(100), 1050);

    const finishTimer = setTimeout(() => {
      onAnimationComplete?.();
    }, 1300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(finishTimer);
    };
  }, [onAnimationComplete]);

  const formattedCode = sessionCode ? `#${sessionCode.replace(/^#+/, '')}` : '#SESI';

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[65vh] text-center px-4 animate-in fade-in duration-300">
      {/* 1. Visual Stage: Kartu Foto Polaroid Melayang & Mekar (Spring Fan-out) */}
      <div className="relative w-44 h-36 flex items-center justify-center mb-6">
        {/* Kartu Kiri */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 0, x: 0 }}
          animate={{ opacity: 0.85, scale: 0.95, rotate: -14, x: -38, y: -4 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.15 }}
          className="absolute w-22 h-28 bg-white rounded-2xl shadow-md border border-zinc-200/90 p-2 flex flex-col justify-between"
        >
          <div className="w-full h-18 bg-gradient-to-tr from-[#ede9fe] to-[#f4f2fd] rounded-xl flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-[#818cf8]" />
          </div>
          <div className="w-8 h-1 bg-zinc-200 rounded-full mx-auto mb-0.5" />
        </motion.div>

        {/* Kartu Kanan */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 0, x: 0 }}
          animate={{ opacity: 0.85, scale: 0.95, rotate: 14, x: 38, y: -4 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.2 }}
          className="absolute w-22 h-28 bg-white rounded-2xl shadow-md border border-zinc-200/90 p-2 flex flex-col justify-between"
        >
          <div className="w-full h-18 bg-gradient-to-tr from-[#fce7f3] to-[#fdf4ff] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#f472b6]" />
          </div>
          <div className="w-8 h-1 bg-zinc-200 rounded-full mx-auto mb-0.5" />
        </motion.div>

        {/* Kartu Utama Tengah (Active Camera Aperture Card) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative z-10 w-26 h-32 bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-2.5 flex flex-col justify-between"
        >
          <div className="w-full h-22 bg-gradient-to-br from-[#4648d4] to-[#6366f1] rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_#ffffff_15%,_transparent_20%)] bg-[length:12px_12px]"
            />
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="relative z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-sm"
            >
              <Camera className="w-5 h-5 text-white" />
            </motion.div>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <div className="w-9 h-1 bg-zinc-200 rounded-full" />
          </div>
        </motion.div>
      </div>

      {/* 2. Badge Sesi Terverifikasi */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f2fd] border border-[#e1e0ff] mb-3 shadow-xs"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-[#4648d4]" />
        <span className="text-[12px] font-bold text-[#4648d4] font-['JetBrains_Mono']">
          {formattedCode}
        </span>
        <span className="text-[10px] text-zinc-400">•</span>
        <span className="text-[11px] font-semibold text-zinc-600">Terverifikasi</span>
      </motion.div>

      {/* 3. Teks Headline & Subtitle */}
      <motion.h2
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-[20px] font-bold text-[#1a1b22] tracking-tight mb-1"
      >
        Membuka Galeri Foto Anda
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="text-[13px] text-zinc-500 max-w-xs leading-relaxed mb-6"
      >
        Menyiapkan seluruh foto studio resolusi tinggi dan klip video momen...
      </motion.p>

      {/* 4. Progress Bar Minimalis */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="w-56 h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/70"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-[#4648d4] to-[#6366f1] rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeInOut', duration: 0.4 }}
        />
      </motion.div>
    </div>
  );
};

