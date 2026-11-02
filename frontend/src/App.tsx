// minja-cloud/frontend/src/App.tsx
// Minja Cloud Platform — Multi-Domain & Management Hub
// ATURAN MUTLAK ARSITEKTUR DOMAIN:
// 1. minja.my.id        -> Domain utama yang berisi Landing Page
// 2. gallery.minja.my.id -> Mobile gallery user (hasil foto 48 jam)
// 3. rich.minja.my.id   -> Subdomain management (default tanpa route -> /partner)
//    - rich.minja.my.id/owner    -> Panel admin utama
//    - rich.minja.my.id/partner  -> Portal mitra / partner (rute utama)
//    - rich.minja.my.id/operator -> Portal kasir

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ToastProvider } from './components/common/Toast';
import { ThemeProvider } from './contexts/ThemeContext';

const OwnerPortal = lazy(() =>
  import('./pages/owner/OwnerPortal').then((m) => ({ default: m.OwnerPortal }))
);

const PartnerPortal = lazy(() =>
  import('./pages/partner/PartnerPortal').then((m) => ({ default: m.PartnerPortal }))
);

const OperatorPortal = lazy(() =>
  import('./pages/operator/OperatorPortal').then((m) => ({ default: m.OperatorPortal }))
);

const GalleryPortalPage = lazy(() =>
  import('./pages/public/GalleryPortalPage').then((m) => ({ default: m.GalleryPortalPage }))
);

const LandingPage = lazy(() =>
  import('./pages/public/LandingPage').then((m) => ({ default: m.LandingPage }))
);

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname.toLowerCase());
  const [currentHost, setCurrentHost] = useState(window.location.hostname.toLowerCase());
  const [currentSearch, setCurrentSearch] = useState(window.location.search.toLowerCase());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
      setCurrentHost(window.location.hostname.toLowerCase());
      setCurrentSearch(window.location.search.toLowerCase());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Deteksi Host Domain
  const isGalleryHost = currentHost.startsWith('gallery.');
  const isRichHost = currentHost.startsWith('rich.');

  // 2. Resolusi Komponen Berdasarkan Aturan Mutlak
  let ActivePortal: React.ComponentType;

  if (isGalleryHost) {
    // gallery.minja.my.id -> Mobile gallery user
    ActivePortal = GalleryPortalPage;
  } else if (isRichHost) {
    // rich.minja.my.id -> Subdomain management
    if (currentPath.startsWith('/owner') || currentSearch.includes('view=owner')) {
      ActivePortal = OwnerPortal; // rich.minja.my.id/owner (Admin Utama)
    } else if (
      currentPath.startsWith('/operator') ||
      currentPath.startsWith('/kasir') ||
      currentSearch.includes('view=operator')
    ) {
      ActivePortal = OperatorPortal; // rich.minja.my.id/operator (Portal Kasir)
    } else {
      // rich.minja.my.id dibuka tanpa route (atau /partner) -> otomatis ke Partner Portal
      ActivePortal = PartnerPortal; // rich.minja.my.id/partner (Rute Utama)
    }
  } else {
    // minja.my.id (Domain Utama) atau Localhost Development
    if (currentPath.startsWith('/owner') || currentSearch.includes('view=owner')) {
      ActivePortal = OwnerPortal;
    } else if (currentPath.startsWith('/partner') || currentSearch.includes('view=partner')) {
      ActivePortal = PartnerPortal;
    } else if (
      currentPath.startsWith('/operator') ||
      currentPath.startsWith('/kasir') ||
      currentSearch.includes('view=operator')
    ) {
      ActivePortal = OperatorPortal;
    } else if (
      currentPath.startsWith('/gallery') ||
      currentPath.startsWith('/s/') ||
      currentSearch.includes('view=gallery')
    ) {
      ActivePortal = GalleryPortalPage;
    } else {
      // minja.my.id default -> Landing Page
      ActivePortal = LandingPage;
    }
  }

  // 3. Sinkronisasi Tema: Public Pages (Landing & Gallery) Lumina Light (#FAF9F6), Admin Portals Dark Mode (#07090E)
  useEffect(() => {
    const isPublic = ActivePortal === LandingPage || ActivePortal === GalleryPortalPage;
    if (isPublic) {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-[#0A0D14]', 'text-white');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-[#0A0D14]', 'text-white');
    }
  }, [ActivePortal]);


  return (
    <ThemeProvider>
      <ToastProvider>
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center text-white">
              <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 text-sm font-medium animate-pulse">Memuat Minja Cloud Platform...</p>
            </div>
          }
        >
          <ActivePortal />
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
