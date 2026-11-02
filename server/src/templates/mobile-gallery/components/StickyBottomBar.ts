// server/src/templates/mobile-gallery/components/StickyBottomBar.ts
// Bilah Aksi Bawah Mengambang (Bagikan Link, Unduh Cepat Foto Jadi, Unduh Semua ZIP)

export function renderStickyBottomBar(
  sessionId: string,
  token: string | undefined,
  photoFramesCount: number
): string {
  return `
  <!-- Sticky Bottom Action Strip -->
  <aside class="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 pb-safe pt-2.5 px-4 shadow-xl">
    <div class="max-w-lg mx-auto flex items-center gap-2">
      <!-- Share / Copy Link Button -->
      <button
        type="button"
        id="btn-copy-link"
        onclick="shareOrCopyGalleryLink()"
        class="min-h-[46px] px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high active:scale-95 text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 border border-outline-variant/30"
        title="Bagikan atau Salin Tautan Galeri"
      >
        <span class="material-symbols-outlined text-[18px]">share</span>
        <span class="hidden sm:inline">Bagikan</span>
      </button>

      ${
        photoFramesCount > 0
          ? `
      <!-- Download Only Photo Frames (Fast & Low Mobile Data) -->
      <button
        type="button"
        onclick="downloadPhotoFramesOnly()"
        class="min-h-[46px] flex-1 px-3 rounded-xl bg-secondary-container hover:bg-secondary-container/80 active:scale-98 text-on-secondary-container text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
        title="Unduh cepat foto berbingkai siap cetak tanpa video"
      >
        <span class="material-symbols-outlined text-[18px]">photo_library</span>
        <span>Foto Jadi (${photoFramesCount})</span>
      </button>
      `
          : ''
      }

      <!-- Download All ZIP Button (One-Click Streaming) -->
      <a
        id="btn-download-all"
        href="/api/public/gallery/${encodeURIComponent(sessionId)}/download-zip?token=${encodeURIComponent(token || '')}"
        onclick="triggerZipDownload()"
        class="min-h-[46px] flex-1 px-3.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-98 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
        title="Unduh seluruh foto dan video dalam satu arsip ZIP"
      >
        <span class="material-symbols-outlined text-[18px]">folder_zip</span>
        <span>Semua (ZIP)</span>
      </a>
    </div>
  </aside>
  `;
}

