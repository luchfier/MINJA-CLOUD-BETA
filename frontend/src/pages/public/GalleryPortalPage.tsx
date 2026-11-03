// minja-cloud/frontend/src/pages/public/GalleryPortalPage.tsx
// Halaman Utama Portal Galeri Foto Pelanggan (gallery.minja.my.id)
// Dibuat 1:1 Presisi dari Desain Resmi Stitch Lumina Studio Engine (Project 13241664617056403135)
// Mengatur 4 Siklus Hidup:
// 1. Input Sesi (PASS-XXXX 4 Digit) -> 2. Sedang Diproses (Circular Ring) -> 3. File Siap Unduh (3 Edisi Frame, Single Cut, Live Video) -> 4. Kedaluwarsa (48 Jam)

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_PAGE_BUILDER_GALLERY } from '../../types/pageBuilder';
import { formatSessionDigits } from '../../services/sessionHelper';
import { GallerySessionInput } from './gallery/GallerySessionInput';
import { GalleryProcessing } from './gallery/GalleryProcessing';
import { GalleryReadyView, GalleryItem } from './gallery/GalleryReadyView';
import { GalleryExpired } from './gallery/GalleryExpired';

type GalleryViewState = 'input' | 'processing' | 'ready' | 'expired';

export const GalleryPortalPage: React.FC = () => {
  const { branding } = useTheme();
  const builderGallery: any = branding.pageBuilderGallery || DEFAULT_PAGE_BUILDER_GALLERY;

  const [viewState, setViewState] = useState<GalleryViewState>('input');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [studioAddress, setStudioAddress] = useState<string>(
    builderGallery.elements?.header?.locationSubtitle ||
    builderGallery.header?.locationSubtitle ||
    'Lokasi Booth Minja Studio'
  );
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const title = builderGallery?.elements?.header?.customTitle || builderGallery?.header?.customTitle;
    if (title) {
      document.title = `${title} — Galeri Digital`;
    }
    const sub = builderGallery?.elements?.header?.locationSubtitle || builderGallery?.header?.locationSubtitle;
    if (sub) {
      setStudioAddress(sub);
    }
  }, [builderGallery]);

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
        if (d.studioAddress) setStudioAddress(d.studioAddress);

        if (d.status === 'expired') {
          setViewState('expired');
        } else if (d.status === 'processing') {
          setViewState('processing');
        } else if (d.status === 'ready') {
          setItems(d.items || []);
          setViewState('ready');
        }
        return;
      }

      setErrorMessage(data?.error?.message || 'Sesi galeri foto tidak ditemukan atau token tidak valid.');
      setItems([]);
      setViewState('input');
    } catch {
      setErrorMessage('Terjadi gangguan saat menghubungkan ke server galeri. Mohon coba sesaat lagi.');
      setItems([]);
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
          setViewState('expired');
        } else if (d.status === 'processing') {
          setViewState('processing');
        } else if (d.status === 'ready') {
          if (d.createdAt) setCreatedAt(d.createdAt);
          if (d.studioAddress) setStudioAddress(d.studioAddress);
          setItems(d.items || []);
          setViewState('ready');
        }
        return;
      }

      // Jika ada respon error dari backend API
      if (data?.error?.message) {
        setErrorMessage(data.error.message);
        return;
      }

      setErrorMessage('Nomor sesi atau PIN tidak ditemukan di database.');
    } catch {
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
              {viewState === 'ready' ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-zinc-200/80 shadow-xs text-[#1A1B22]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-zinc-700 tracking-normal leading-none">
                    Siap Unduh
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
            studioAddress={studioAddress}
            items={items}
          />
        )}

        {viewState === 'expired' && (
          <GalleryExpired
            sessionCode={sessionCode}
            studioAddress={studioAddress}
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
