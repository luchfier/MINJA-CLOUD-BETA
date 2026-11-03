// minja-cloud/frontend/src/pages/public/gallery/GalleryReadyView.tsx
// State 3: Galeri Siap Unduh 1:1 Presisi dari Desain Resmi Stitch: "Portal Galeri Handphone - Tombol Simpan Interaktif Dinamis"
// Menampilkan Segmented Control 3 Tab, Frame Asli Kiosk, Single Cut 3:2, Video Klip Momen, Countdown 48 Jam Realtime, dan Master ZIP

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { formatSessionDigits } from '../../../services/sessionHelper';

export interface GalleryItem {
  id?: string;
  fileType: 'layout_4r' | 'raw_photo' | 'live_video' | string;
  url: string;
  fileName?: string;
  sizeBytes?: number;
}

export interface GalleryReadyViewProps {
  sessionId: string;
  sessionCode?: string;
  token: string;
  expiresAt: string;
  createdAt?: string;
  studioAddress?: string;
  items: GalleryItem[];
}

export const GalleryReadyView: React.FC<GalleryReadyViewProps> = ({
  sessionId,
  sessionCode,
  token,
  expiresAt,
  createdAt,
  studioAddress,
  items,
}) => {
  const [activeTab, setActiveTab] = useState<'strip' | 'single' | 'live'>('strip');
  const [currentStripIndex, setCurrentStripIndex] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Filter items
  const frameItems = items.filter((i) => i.fileType === 'layout_4r');
  const rawPhotos = items.filter((i) => i.fileType === 'raw_photo');
  const videoItems = items.filter((i) => i.fileType === 'live_video');

  // Daftar frame aktif riil (fallback ke item pertama jika belum terklasifikasi)
  const displayFrames = frameItems.length > 0 ? frameItems : (items.length > 0 ? [items[0]] : []);
  const isMultiFrame = displayFrames.length > 1;

  // Countdown mundur realtime 48 jam (berdetik setiap 1 detik)
  const [countdown, setCountdown] = useState({ hours: 47, minutes: 59, seconds: 59 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 };
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { hours, minutes, seconds };
    };

    setCountdown(calculateTimeLeft());
    const timer = setInterval(() => {
      setCountdown(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

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

  const scrollToIndex = (index: number) => {
    if (!isMultiFrame) return;
    let nextIdx = index;
    if (nextIdx < 0) nextIdx = displayFrames.length - 1;
    if (nextIdx >= displayFrames.length) nextIdx = 0;
    setCurrentStripIndex(nextIdx);

    if (trackRef.current) {
      const containerWidth = trackRef.current.offsetWidth;
      trackRef.current.scrollTo({
        left: nextIdx * containerWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleTrackScroll = () => {
    if (trackRef.current && isMultiFrame) {
      const scrollLeft = trackRef.current.scrollLeft;
      const width = trackRef.current.offsetWidth;
      if (width > 0) {
        const newIndex = Math.round(scrollLeft / width);
        if (newIndex >= 0 && newIndex < displayFrames.length && newIndex !== currentStripIndex) {
          setCurrentStripIndex(newIndex);
        }
      }
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveCurrentStrip = () => {
    const selectedItem = displayFrames[currentStripIndex] || displayFrames[0];
    const downloadUrl = selectedItem?.url || '#';
    triggerDownload(downloadUrl, `Minja_Foto_Frame_${currentStripIndex + 1}_${sessionId}.jpg`);

    setSaveSuccess(`Download Frame ${currentStripIndex + 1} Berhasil!`);
    setTimeout(() => {
      setSaveSuccess(null);
    }, 1800);
  };

  const handleSaveSinglePose = (poseItem: GalleryItem, index: number) => {
    triggerDownload(poseItem.url, `Minja_Pose_Raw_${index + 1}_${sessionId}.jpg`);
  };

  const handleSaveLiveVideo = () => {
    const videoItem = videoItems[0] || items.find((i) => i.url.endsWith('.mp4'));
    if (videoItem) {
      triggerDownload(videoItem.url, `Minja_Live_Motion_${sessionId}.mp4`);
    }
  };

  const handleCopyGalleryLink = () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }).catch(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    } else {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownloadZip = () => {
    setIsZipping(true);
    const zipUrl = `/api/public/gallery/${encodeURIComponent(sessionId)}/download-zip?token=${encodeURIComponent(token)}`;
    triggerDownload(zipUrl, `Minja_Semua_Foto_${sessionId}.zip`);

    setTimeout(() => {
      setIsZipping(false);
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 2500);
    }, 1200);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-3.5 animate-in fade-in duration-300 pb-10">
      {/* 1. Informasi Subheader: Alamat > No Resi > Tanggal Sesi (Sesuai Urutan Standar Minja) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left px-0.5 mt-0.5 mb-1.5">
        <div className="flex items-center gap-1 min-w-0">
          <span className="material-symbols-outlined text-[15px] text-[#47464b] shrink-0">location_on</span>
          <span className="text-[11.5px] text-[#1a1b22] font-semibold font-['JetBrains_Mono'] truncate">
            {studioAddress || 'Lokasi Booth Minja Studio'}
          </span>
        </div>
        <span className="text-zinc-300 text-[10px] shrink-0">•</span>
        <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-200/80 px-1.5 py-0.5 rounded font-['JetBrains_Mono'] shrink-0">
          #{sessionCode ? sessionCode.replace(/^#+/, '') : formatSessionDigits(sessionId)}
        </span>
        <span className="text-zinc-300 text-[10px] shrink-0">•</span>
        <div className="flex items-center gap-1 text-[#47464b] shrink-0">
          <span className="material-symbols-outlined text-[13px] shrink-0">calendar_today</span>
          <span className="text-[11px] text-[#47464b] font-medium font-['JetBrains_Mono']">
            {formattedDate}
          </span>
        </div>
      </div>

      {/* 2. Banner Countdown Mundur Realtime 48 Jam (Tersimpan Aman 48 Jam dengan Detik Live) */}
      <div className="w-full bg-[#f4f2fd] rounded-2xl p-3.5 border border-zinc-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#e1e0ff] text-[#4648d4] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">timer</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase tracking-wider text-[#47464b] font-bold font-['JetBrains_Mono']">
              Sisa Waktu Unduh
            </span>
            <span className="text-[12px] text-[#1a1b22] font-semibold">
              Tersimpan aman 48 jam
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 font-['JetBrains_Mono']">
          <div className="flex flex-col items-center bg-white px-2 py-1 rounded-lg border border-zinc-200/70 min-w-[36px]">
            <span className="text-[14px] font-bold text-[#1a1b22] leading-none">
              {String(countdown.hours).padStart(2, '0')}
            </span>
            <span className="text-[8px] text-[#47464b] uppercase mt-0.5 font-medium">Jam</span>
          </div>
          <span className="text-[#1a1b22] font-bold text-[14px] pb-3">:</span>
          <div className="flex flex-col items-center bg-white px-2 py-1 rounded-lg border border-zinc-200/70 min-w-[36px]">
            <span className="text-[14px] font-bold text-[#1a1b22] leading-none">
              {String(countdown.minutes).padStart(2, '0')}
            </span>
            <span className="text-[8px] text-[#47464b] uppercase mt-0.5 font-medium">Mnt</span>
          </div>
          <span className="text-[#1a1b22] font-bold text-[14px] pb-3">:</span>
          <div className="flex flex-col items-center bg-white px-2 py-1 rounded-lg border border-zinc-200/70 min-w-[36px]">
            <span className="text-[14px] font-bold text-[#4648d4] leading-none">
              {String(countdown.seconds).padStart(2, '0')}
            </span>
            <span className="text-[8px] text-[#47464b] uppercase mt-0.5 font-medium">Dtk</span>
          </div>
        </div>
      </div>

      {/* Segmented Control Navigation Tabs (3 Tabs: Foto Frame, Single Cut, Live) */}
      <div className="w-full mb-3">
        <div className="grid grid-cols-3 p-1.5 rounded-2xl bg-[#eeedf7] gap-1 shadow-inner" role="tablist">
          <button
            onClick={() => setActiveTab('strip')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] transition-all duration-150 cursor-pointer ${
              activeTab === 'strip'
                ? 'bg-white text-[#1a1b22] shadow-sm font-semibold'
                : 'text-[#47464b] font-medium hover:text-[#1a1b22]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">photo_library</span>
            <span>Foto Frame</span>
          </button>
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] transition-all duration-150 cursor-pointer ${
              activeTab === 'single'
                ? 'bg-white text-[#1a1b22] shadow-sm font-semibold'
                : 'text-[#47464b] font-medium hover:text-[#1a1b22]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">filter</span>
            <span>Single Cut</span>
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] transition-all duration-150 cursor-pointer ${
              activeTab === 'live'
                ? 'bg-white text-[#1a1b22] shadow-sm font-semibold'
                : 'text-[#47464b] font-medium hover:text-[#1a1b22]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">videocam</span>
            <span>Live</span>
          </button>
        </div>
      </div>

      {/* Tab Content Panels */}
      <div className="w-full flex flex-col">
        {/* PANEL 1: PHOTO STRIP / FRAME CETAK DENGAN TAMPILAN NYATA */}
        {activeTab === 'strip' && (
          <div className="flex-col items-center w-full mb-4 flex animate-in fade-in duration-200">
            <div className="w-full bg-[#f4f2fd] rounded-2xl p-4 shadow-sm flex flex-col items-center relative border border-zinc-200/60">
              {/* Header Informasi Frame Riil */}
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#1a1b22]">
                    {isMultiFrame ? 'photo_library' : 'auto_awesome'}
                  </span>
                  <span className="text-[13px] text-[#1a1b22] font-semibold">
                    {isMultiFrame ? `Desain Frame #${currentStripIndex + 1}` : 'Hasil Foto Frame Cetak'}
                  </span>
                </div>
                {isMultiFrame ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#e8e7f1] text-[#47464b] font-semibold font-['JetBrains_Mono']">
                    {currentStripIndex + 1} / {displayFrames.length} Frame
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold font-['JetBrains_Mono']">
                    Kualitas Cetak Studio
                  </span>
                )}
              </div>

              {/* Viewport Frame Citra Asli */}
              {isMultiFrame ? (
                <div className="relative w-full flex items-center justify-center">
                  <button
                    type="button"
                    aria-label="Frame Sebelumnya"
                    onClick={() => scrollToIndex(currentStripIndex - 1)}
                    className="absolute -left-2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur shadow-md flex items-center justify-center text-[#1a1b22] active:scale-90 transition-all hover:bg-white border border-zinc-200/80 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>

                  {/* Carousel Track untuk Multi-Frame */}
                  <div
                    ref={trackRef}
                    onScroll={handleTrackScroll}
                    className="w-full overflow-x-auto no-scrollbar flex snap-x snap-mandatory scroll-smooth py-1 px-1 gap-4 items-center"
                  >
                    {displayFrames.map((frame, idx) => (
                      <div key={idx} className="snap-center shrink-0 w-full flex justify-center py-1" data-strip-index={idx}>
                        <div
                          onClick={() => setZoomPhotoUrl(frame.url)}
                          className="relative cursor-pointer group transition-transform duration-200 active:scale-[0.99] flex justify-center"
                          title="Ketuk untuk perbesar"
                        >
                          <img
                            src={frame.url}
                            alt={`Foto Frame ${idx + 1}`}
                            className="w-auto max-h-[380px] sm:max-h-[420px] rounded-xl shadow-lg border border-zinc-200/80 object-contain bg-white"
                          />
                          <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-[12px]">zoom_in</span>
                            <span>Perbesar</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-label="Frame Selanjutnya"
                    onClick={() => scrollToIndex(currentStripIndex + 1)}
                    className="absolute -right-2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur shadow-md flex items-center justify-center text-[#1a1b22] active:scale-90 transition-all hover:bg-white border border-zinc-200/80 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              ) : displayFrames.length > 0 ? (
                /* Frame Tunggal Bersih: Tanpa Panah & Tanpa Dots Mengganggu */
                <div className="w-full flex justify-center py-1">
                  <div
                    onClick={() => setZoomPhotoUrl(displayFrames[0]?.url || '')}
                    className="relative cursor-pointer group transition-transform duration-200 active:scale-[0.99] flex justify-center"
                    title="Ketuk untuk perbesar"
                  >
                    <img
                      src={displayFrames[0].url}
                      alt="Foto Frame Minja"
                      className="w-auto max-h-[400px] sm:max-h-[440px] rounded-xl shadow-lg border border-zinc-200/80 object-contain bg-white"
                    />
                    <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-[12px]">zoom_in</span>
                      <span>Perbesar</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                  <span className="material-symbols-outlined text-[36px] mb-2 text-zinc-300">photo_library</span>
                  <p className="text-xs font-medium">Belum ada file foto frame cetak untuk sesi ini.</p>
                </div>
              )}

              {/* Dot Indicators: HANYA TAMPIL JIKA MULTI-FRAME (> 1 Frame) */}
              {isMultiFrame && (
                <div className="flex flex-col items-center justify-center gap-1 mt-3.5">
                  <div className="flex items-center gap-2">
                    {displayFrames.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Frame ${idx + 1}`}
                        onClick={() => scrollToIndex(idx)}
                        className={`transition-all duration-300 rounded-full cursor-pointer ${
                          currentStripIndex === idx ? 'w-6 h-2 bg-black' : 'w-2 h-2 bg-zinc-300 hover:bg-zinc-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Simpan Frame Terpilih */}
              <div className="w-full mt-4">
                <button
                  type="button"
                  onClick={handleSaveCurrentStrip}
                  className={`w-full h-11 rounded-xl border border-zinc-200/80 flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 text-[13px] font-semibold cursor-pointer shadow-sm ${
                    saveSuccess
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                      : 'bg-white hover:bg-zinc-50 text-[#1a1b22]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {saveSuccess ? 'check_circle' : 'download'}
                  </span>
                  <span>
                    {saveSuccess || `Download Frame ${currentStripIndex + 1}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: SINGLE CUT (RAW POSES) */}
        {activeTab === 'single' && (
          <div className="flex-col w-full mb-4 flex animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#1a1b22] text-[18px]">aspect_ratio</span>
                <span className="text-[14px] font-bold text-[#1a1b22]">Pose Asli Kualitas Penuh</span>
              </div>
              <span className="text-[11px] text-[#47464b] font-medium font-['JetBrains_Mono']">
                {rawPhotos.length} Foto Asli
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              {rawPhotos.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center text-zinc-400 bg-[#f4f2fd] rounded-xl border border-zinc-200/60">
                  <span className="material-symbols-outlined text-[32px] mb-1.5 text-zinc-300">aspect_ratio</span>
                  <p className="text-xs font-medium">Belum ada file pose asli (single cut) untuk sesi ini.</p>
                </div>
              ) : (
                rawPhotos.map((photo, pIdx) => (
                  <div key={pIdx} className="flex flex-col bg-[#f4f2fd] rounded-xl p-2 shadow-sm border border-zinc-200/60">
                    <div
                      onClick={() => setZoomPhotoUrl(photo.url)}
                      className="relative w-full aspect-[3/2] rounded-lg overflow-hidden bg-white cursor-pointer group"
                      title="Ketuk untuk perbesar"
                    >
                      <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" alt={`Pose Raw ${pIdx + 1}`} src={photo.url} />
                      <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-white font-['JetBrains_Mono'] text-[9px] font-bold">
                        RAW 0{pIdx + 1}
                      </span>
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveSinglePose(photo, pIdx)}
                      className="w-full mt-2 h-9 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200/80 flex items-center justify-center gap-1 text-[#1a1b22] active:scale-95 transition-transform duration-100 text-[12px] font-semibold cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      <span>Download</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PANEL 3: LIVE VIDEO MOMEN */}
        {activeTab === 'live' && (
          <div className="flex-col w-full mb-4 flex animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#1a1b22] text-[18px]">videocam</span>
                <span className="text-[14px] font-bold text-[#1a1b22]">Video Momen Pilihan</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c] font-semibold font-['JetBrains_Mono'] tracking-wide">
                Video Klip
              </span>
            </div>
            <div className="w-full bg-[#f4f2fd] rounded-2xl p-4 shadow-sm flex flex-col border border-zinc-200/60">
              {videoItems[0] ? (
                <>
                  <div className="relative w-full aspect-[9/16] max-h-[360px] rounded-xl overflow-hidden bg-black mx-auto flex items-center justify-center shadow-inner group">
                    <video
                      src={videoItems[0].url}
                      controls
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-white pointer-events-none">
                      <span className="material-symbols-outlined text-[12px]">hd</span>
                      <span className="text-[10px] font-bold font-['JetBrains_Mono']">HD</span>
                    </div>
                  </div>
                  <div className="flex flex-col mt-3.5 px-0.5">
                    <p className="text-[12px] text-[#47464b] leading-relaxed mb-3">
                      Dilengkapi musik latar santai dan audio rana kamera, pas untuk diunggah langsung ke Instagram Reels, TikTok, atau WhatsApp Story.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveLiveVideo}
                      className="w-full h-11 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/80 flex items-center justify-center gap-2 text-[#1a1b22] active:scale-95 transition-transform duration-100 text-[13px] font-semibold cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      <span>Download</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full py-12 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-[36px] text-zinc-400 mb-2">videocam_off</span>
                  <p className="text-xs text-zinc-500 font-medium">Video klip momen tidak tersedia untuk sesi ini.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MASTER ACTION 1: UNDUH SEMUA FOTO & VIDEO (ZIP) */}
      <div className="w-full space-y-2.5">
        <button
          type="button"
          id="btn-download-all"
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="w-full h-12 rounded-xl bg-black text-white flex items-center justify-center gap-2 shadow-md hover:bg-zinc-900 active:scale-[0.98] transition-all duration-150 text-[14px] font-bold cursor-pointer disabled:opacity-80"
        >
          {isZipping ? (
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
              <span>Menyiapkan Berkas ZIP Semua Foto...</span>
            </div>
          ) : zipSuccess ? (
            <div className="flex items-center gap-2.5 text-emerald-400">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span className="text-white">Unduhan ZIP Dimulai!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">folder_zip</span>
              <span>Unduh Semua Foto &amp; Video (ZIP)</span>
            </div>
          )}
        </button>

        {/* MASTER ACTION 2: SALIN TAUTAN GALERI (Sesuai Desain Asli Stitch) */}
        <button
          type="button"
          onClick={handleCopyGalleryLink}
          className="w-full h-11 rounded-xl bg-white border border-zinc-200/90 text-[#1a1b22] flex items-center justify-center gap-2 shadow-xs hover:bg-zinc-50 active:scale-[0.98] transition-all duration-150 text-[13px] font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">
            {copySuccess ? 'check' : 'link'}
          </span>
          <span>{copySuccess ? 'Tautan Galeri Berhasil Disalin!' : 'Salin Tautan Galeri'}</span>
        </button>
      </div>

      {/* LEMBAR INFORMASI & APRESIASI */}
      <div className="w-full flex flex-col items-center gap-3 mt-4 mb-3">
        <div className="w-full bg-[#f4f2fd] rounded-2xl p-4 border border-zinc-200/60 flex flex-col items-center text-center shadow-xs">
          <div className="flex items-center gap-1.5 mb-1 text-[#4648d4]">
            <span className="material-symbols-outlined text-[16px]">favorite</span>
            <span className="text-[13px] font-bold text-[#1a1b22] tracking-tight">
              Terima kasih sudah berfoto bersama Minja! ✨
            </span>
          </div>
          <p className="text-[11.5px] text-[#47464b] leading-relaxed mb-3 max-w-[340px]">
            Momen bahagiamu tersimpan aman. Follow akun kami dan jangan lupa tag hasil fotomu di Instagram!
          </p>
          <a
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-zinc-200 text-[#1a1b22] text-[11px] font-semibold shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all"
            href="https://instagram.com/minjabooth"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[14px] text-[#4648d4]">photo_camera</span>
            <span>Follow &amp; Tag @minjabooth</span>
          </a>
        </div>
        <div className="text-center pb-2 pt-1">
          <p className="text-[11px] text-[#47464b]/70 font-['JetBrains_Mono']">
            © 2026 Minja Studio SELF-SERVE PHOTOBOOTH
          </p>
        </div>
      </div>

      {/* LIGHTBOX MODAL FULLSCREEN ZOOM PREVIEW */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <div className="relative max-w-sm w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomPhotoUrl(null)}
              className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <img
              src={zoomPhotoUrl}
              alt="Pratinjau Foto"
              className="max-h-[75vh] w-auto rounded-xl shadow-2xl object-contain bg-white"
            />
            <button
              type="button"
              onClick={() => triggerDownload(zoomPhotoUrl, `Minja_Foto_HD_${sessionId}.jpg`)}
              className="mt-3.5 px-6 py-2.5 rounded-full bg-white text-black font-semibold text-[13px] flex items-center gap-2 shadow-lg active:scale-95 transition-transform cursor-pointer hover:bg-zinc-100"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
