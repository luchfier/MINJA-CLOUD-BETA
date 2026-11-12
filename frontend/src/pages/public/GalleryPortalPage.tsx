// minja-cloud/frontend/src/pages/public/GalleryPortalPage.tsx
// Halaman Utama Portal Galeri Foto Pelanggan (gallery.minja.my.id)
// Dibuat 1:1 Presisi dari Desain Resmi Stitch Lumina Studio Engine (Project 13241664617056403135)
// Mengatur 4 Siklus Hidup:
// 1. Input Sesi (PASS-XXXX 4 Digit) -> 2. Sedang Diproses (Circular Ring) -> 3. File Siap Unduh (3 Edisi Frame, Single Cut, Live Video) -> 4. Kedaluwarsa (48 Jam)

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_PAGE_BUILDER_GALLERY } from '../../types/pageBuilder';
import { formatSessionDigits } from '../../services/sessionHelper';
import { GallerySessionInput } from './gallery/GallerySessionInput';
import { GalleryProcessing } from './gallery/GalleryProcessing';
import { GalleryReadyView, GalleryItem } from './gallery/GalleryReadyView';
import { GalleryExpired } from './gallery/GalleryExpired';
import { GalleryUnlocking } from './gallery/GalleryUnlocking';

type GalleryViewState = 'input' | 'unlocking' | 'processing' | 'ready' | 'expired';

export const GalleryPortalPage: React.FC = () => {
  const { branding } = useTheme();
  const builderGallery: any = branding.pageBuilderGallery || DEFAULT_PAGE_BUILDER_GALLERY;

  // Inisialisasi State: Jika URL memiliki parameter sesi (direct link / QR), langsung masuk ke 'unlocking' (Zero Input Flash)
  const [viewState, setViewState] = useState<GalleryViewState>(() => {
    if (typeof window === 'undefined') return 'input';
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const sessionMatch = pathname.match(/^\/(?:s|gallery)\/([^/?#]+)/i);
    const hasSession = Boolean(sessionMatch || searchParams.get('session'));
    return hasSession ? 'unlocking' : 'input';
  });

  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const sessionMatch = pathname.match(/^\/(?:s|gallery)\/([^/?#]+)/i);
    return sessionMatch ? decodeURIComponent(sessionMatch[1]) : searchParams.get('session') || '';
  });

  const [sessionCode, setSessionCode] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const sessionMatch = pathname.match(/^\/(?:s|gallery)\/([^/?#]+)/i);
    const raw = sessionMatch ? decodeURIComponent(sessionMatch[1]) : searchParams.get('session') || '';
    return raw ? formatSessionDigits(raw) : '';
  });

  const [token, setToken] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('token') || '';
  });

  const [expiresAt, setExpiresAt] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sinkronisasi target status & durasi animasi interaktif (min 1.2 detik)
  const isAnimationFinishedRef = useRef<boolean>(false);
  const pendingTargetRef = useRef<GalleryViewState | null>(null);

  const handleAnimationComplete = () => {
    isAnimationFinishedRef.current = true;
    if (pendingTargetRef.current) {
      setViewState(pendingTargetRef.current);
      pendingTargetRef.current = null;
    }
  };

  const applyResolvedStatus = (target: GalleryViewState) => {
    if (isAnimationFinishedRef.current) {
      setViewState(target);
      pendingTargetRef.current = null;
    } else {
      pendingTargetRef.current = target;
    }
  };

  useEffect(() => {
    const title = builderGallery?.elements?.header?.customTitle || builderGallery?.header?.customTitle;
    if (title && !sessionId) {
      document.title = `${title} — Galeri Digital`;
    }
  }, [builderGallery, sessionId]);

  // Sinkronisasi OpenGraph & Document Title dinamis untuk sharing sosial / WhatsApp
  useEffect(() => {
    if (!sessionId) return;
    const formattedCode = sessionCode ? `#${sessionCode.replace(/^#+/, '')}` : `#${formatSessionDigits(sessionId)}`;
    const pageTitle = `Foto Sesi ${formattedCode} — Galeri Minja Studio`;
    document.title = pageTitle;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      `Lihat dan unduh foto studio tahan air serta video momen sesi ${formattedCode} dari Minja Photobooth.`
    );

    // Update OpenGraph Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);

    // Update OpenGraph Description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute(
        'content',
        `Lihat dan unduh foto studio tahan air serta video momen sesi ${formattedCode} dari Minja Photobooth.`
      );
    }

    // Update OpenGraph Image jika ada foto frame cetak
    const firstFrame = items.find((i) => i.fileType === 'layout_4r') || items[0];
    if (firstFrame?.url) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', firstFrame.url);
      let twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) twitterImage.setAttribute('content', firstFrame.url);
    }

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && typeof window !== 'undefined') {
      ogUrl.setAttribute('content', window.location.href);
    }
  }, [sessionId, sessionCode, items]);

  // 1. Deteksi URL saat dibuka via QR Code (misal: /s/:sessionId?token=xxxx atau /gallery/:sessionId)
  useEffect(() => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('token') || '';

    // Cek apakah URL berbentuk /s/:sessionId atau /gallery/:sessionId
    const sessionMatch = pathname.match(/^\/(?:s|gallery)\/([^/?#]+)/i);
    const urlSessionId = sessionMatch ? decodeURIComponent(sessionMatch[1]) : searchParams.get('session') || '';

    if (urlSessionId) {
      setSessionId(urlSessionId);
      setToken(urlToken);
      fetchSessionStatus(urlSessionId, urlToken);
    }
  }, []);

  // Fetch status saat dibuka via URL langsung
  const fetchSessionStatus = async (sId: string, tok: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const qToken = tok ? `?token=${encodeURIComponent(tok)}` : '';
      const res = await fetch(`/api/public/gallery/${encodeURIComponent(sId)}/status${qToken}`);
      const data = await res.json().catch(() => null);

      if (data?.success && data?.data) {
        const d = data.data;
        setSessionId(d.sessionId || sId);
        setSessionCode(d.sessionCode || formatSessionDigits(sId));
        setToken(d.token || tok);
        setExpiresAt(d.expiresAt || '');
        if (d.createdAt) setCreatedAt(d.createdAt);

        if (d.status === 'expired') {
          applyResolvedStatus('expired');
        } else if (d.status === 'processing') {
          applyResolvedStatus('processing');
        } else if (d.status === 'ready') {
          setItems(d.items || []);
          applyResolvedStatus('ready');
        }
        return;
      }

      setErrorMessage(data?.error?.message || 'Sesi galeri foto tidak ditemukan atau token tidak valid.');
      setItems([]);
      isAnimationFinishedRef.current = false;
      pendingTargetRef.current = null;
      setViewState('input');
    } catch {
      setErrorMessage('Terjadi gangguan saat menghubungkan ke server galeri. Mohon coba sesaat lagi.');
      setItems([]);
      isAnimationFinishedRef.current = false;
      pendingTargetRef.current = null;
      setViewState('input');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Form Submit Input Manual (State 1)
  const handleLookupSubmit = async (inputSession: string, inputPin: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const sNum = inputSession.trim();
    const pVal = inputPin.trim();

    // Sembunyikan 2 box input seketika dan jalankan animasi pembuka interaktif
    isAnimationFinishedRef.current = false;
    pendingTargetRef.current = null;
    setSessionCode(formatSessionDigits(sNum));
    setViewState('unlocking');

    try {
      const res = await fetch('/api/public/gallery/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionNumber: sNum, pin: pVal }),
      });

      const data = await res.json().catch(() => null);

      if (data?.success && data?.data) {
        const d = data.data;
        setSessionId(d.sessionId);
        setSessionCode(d.sessionCode || formatSessionDigits(sNum || d.sessionId));
        setToken(d.token || pVal);
        setExpiresAt(d.expiresAt || '');

        if (d.status === 'expired') {
          applyResolvedStatus('expired');
        } else if (d.status === 'processing') {
          applyResolvedStatus('processing');
        } else if (d.status === 'ready') {
          if (d.createdAt) setCreatedAt(d.createdAt);
          setItems(d.items || []);
          applyResolvedStatus('ready');
        }
        return;
      }

      // Jika ada respon error dari backend API
      isAnimationFinishedRef.current = false;
      pendingTargetRef.current = null;
      setViewState('input');
      if (data?.error?.message) {
        setErrorMessage(data.error.message);
        return;
      }

      setErrorMessage('Nomor sesi atau PIN tidak ditemukan di database.');
    } catch {
      isAnimationFinishedRef.current = false;
      pendingTargetRef.current = null;
      setViewState('input');
      setErrorMessage('Terjadi gangguan saat menghubungkan ke server. Mohon coba sesaat lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col antialiased selection:bg-zinc-200 transition-colors"
      style={{
        backgroundColor: builderGallery.theme?.backgroundColor || '#FBF8FF',
        color: builderGallery.theme?.textColor || '#1A1B22',
        fontFamily: builderGallery.theme?.fontFamily || 'Plus Jakarta Sans',
      }}
    >
      {/* INJECT PRO CUSTOM CSS (CMS ENGINE) */}
      {branding.customCss && (
        <style id="minja-public-custom-css">{branding.customCss}</style>
      )}

      {/* Top Header Minimalist Navigation (Presisi Sesuai Stitch Lumina) */}
      <header className="sticky top-0 w-full z-40 bg-[#FBF8FF]/90 backdrop-blur-md border-b border-black/[0.04]">
        <div className="pt-safe">
          <div className="h-14 px-5 max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[17px] tracking-tight text-[#1A1B22] leading-none">
                MINJA
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-400" />
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-['JetBrains_Mono']">
                {viewState === 'ready' ? 'STUDIO GALLERY' : 'SELF-SERVE PHOTOBOOTH'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {(viewState === 'ready' || viewState === 'processing' || viewState === 'expired') && (
                <button
                  type="button"
                  onClick={() => {
                    setViewState('input');
                    setSessionId('');
                    setSessionCode('');
                    setToken('');
                    setItems([]);
                    setErrorMessage(null);
                    isAnimationFinishedRef.current = false;
                    pendingTargetRef.current = null;
                    if (typeof window !== 'undefined') {
                      window.history.replaceState({}, '', '/');
                    }
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                  title="Buka sesi foto lainnya"
                >
                  Ganti Sesi
                </button>
              )}

              {viewState === 'ready' ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-zinc-200/80 shadow-xs text-[#1A1B22]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-zinc-700 tracking-normal leading-none">
                    Siap Unduh
                  </span>
                </div>
              ) : viewState === 'unlocking' ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f2fd] border border-[#e1e0ff] shadow-xs text-[#4648d4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4648d4] animate-pulse" />
                  <span className="text-[11px] font-semibold tracking-normal leading-none">
                    Membuka
                  </span>
                </div>
              ) : viewState === 'processing' ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eeedf7] border border-zinc-200/80 shadow-xs text-[#1A1B22]">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-700 tracking-normal leading-none">
                    Proses
                  </span>
                </div>
              ) : viewState === 'expired' ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-semibold tracking-normal leading-none uppercase font-['JetBrains_Mono']">
                    Kedaluwarsa
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-zinc-200/80 shadow-xs text-[#1A1B22]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-zinc-700 tracking-normal leading-none">
                    Siap Akses
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Dynamic Viewport */}
      <main className="flex flex-col relative w-full px-5 pt-3 pb-safe flex-1 max-w-md mx-auto">
        {viewState === 'input' && (
          <GallerySessionInput
            onSubmit={handleLookupSubmit}
            isLoading={isLoading}
            error={errorMessage}
          />
        )}

        {viewState === 'unlocking' && (
          <GalleryUnlocking
            sessionCode={sessionCode}
            onAnimationComplete={handleAnimationComplete}
          />
        )}

        {viewState === 'processing' && (
          <GalleryProcessing
            sessionId={sessionId}
            sessionCode={sessionCode}
            token={token}
            onReady={() => fetchSessionStatus(sessionId, token)}
          />
        )}

        {viewState === 'ready' && (
          <GalleryReadyView
            sessionId={sessionId}
            sessionCode={sessionCode}
            token={token}
            expiresAt={expiresAt}
            createdAt={createdAt}
            items={items}
          />
        )}

        {viewState === 'expired' && (
          <GalleryExpired
            sessionCode={sessionCode}
            createdAt={createdAt}
            builderConfig={builderGallery.expired}
            onBackToInput={() => {
              setViewState('input');
              setErrorMessage(null);
            }}
          />
        )}
      </main>
    </div>
  );
};
