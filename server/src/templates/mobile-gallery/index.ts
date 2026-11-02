// server/src/templates/mobile-gallery/index.ts
// Orkestrator Utama Mobile Gallery V2 — Warm Studio Minimal Aesthetic (Modular Architecture)

import { MobileGalleryPageOptions, escapeHtml } from './types.js';
import { renderGalleryStyles } from './styles.js';
import { renderHeader } from './components/Header.js';
import { renderOverviewSection } from './components/OverviewSection.js';
import { renderTabNavigation } from './components/TabNavigation.js';
import { renderPhotoFramesPanel } from './components/PhotoFramesPanel.js';
import { renderSingleCutsPanel } from './components/SingleCutsPanel.js';
import { renderLiveVideosPanel } from './components/LiveVideosPanel.js';
import { renderSocialCommunityCard } from './components/SocialCommunityCard.js';
import { renderStudioPolicySection } from './components/StudioPolicySection.js';
import { renderStickyBottomBar } from './components/StickyBottomBar.js';
import { renderLightboxModal } from './components/LightboxModal.js';
import { renderToastNotification } from './components/ToastNotification.js';
import { renderGalleryScripts } from './scripts.js';

export * from './types.js';

export function renderMobileGalleryHtml(opts: MobileGalleryPageOptions): string {
  const { boothName, sessionId, sessionCode, expiresAt, items, token } = opts;

  const safeBoothName = escapeHtml(boothName || 'Minja Photobooth');
  const safeSessionCode = escapeHtml(
    sessionCode ? (sessionCode.startsWith('MJA-') ? sessionCode : 'MJA-' + sessionCode.replace(/^#/, '')) : 'MJA-BOOTH'
  );

  // Pisahkan item berdasarkan 3 Kategori Utama
  const photoFrameItems = items.filter((it) => it.fileType === 'layout_4r');
  const singleCutItems = items.filter((it) => it.fileType === 'raw_photo' || it.fileType === 'other');
  const liveMotionItems = items.filter((it) => it.fileType === 'live_video');

  // Hitung sisa waktu penyimpanan
  const expiresDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiresDate.getTime() - now.getTime();
  const remainingHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const remainingMinutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  const expiryFormatted = expiresDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Tentukan tab aktif pertama yang memiliki konten
  let defaultTab = 'frames';
  if (photoFrameItems.length === 0 && singleCutItems.length > 0) {
    defaultTab = 'cuts';
  } else if (photoFrameItems.length === 0 && singleCutItems.length === 0 && liveMotionItems.length > 0) {
    defaultTab = 'live';
  }

  // Buat daftar download semua file dalam format JSON untuk script
  const allDownloadUrls = items.map((it) => ({
    name: it.fileName,
    url: it.downloadUrl || it.url,
  }));

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport"/>
  <title>${safeBoothName} • Gallery Collection</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet"/>
  ${renderGalleryStyles()}
</head>
<body class="bg-surface text-on-surface antialiased flex flex-col min-h-screen selection:bg-secondary-container selection:text-on-secondary-container">

  ${renderHeader(safeSessionCode, safeBoothName, remainingHours, remainingMinutes)}

  <!-- Main Content Wrapper -->
  <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto pt-20 pb-28 px-4">
    ${renderOverviewSection(safeSessionCode, safeBoothName, expiryFormatted)}
    ${renderTabNavigation(defaultTab, photoFrameItems.length, singleCutItems.length, liveMotionItems.length)}
    ${renderPhotoFramesPanel(photoFrameItems, defaultTab, sessionId, safeBoothName)}
    ${renderSingleCutsPanel(singleCutItems, defaultTab, sessionId)}
    ${renderLiveVideosPanel(liveMotionItems, defaultTab, sessionId)}
    ${renderSocialCommunityCard(safeBoothName)}
    ${renderStudioPolicySection()}
  </main>

  ${renderStickyBottomBar(sessionId, token, photoFrameItems.length)}
  ${renderLightboxModal()}
  ${renderToastNotification()}
  ${renderGalleryScripts(sessionId, safeBoothName, expiresAt, token, allDownloadUrls, photoFrameItems, singleCutItems)}
</body>
</html>`;
}
