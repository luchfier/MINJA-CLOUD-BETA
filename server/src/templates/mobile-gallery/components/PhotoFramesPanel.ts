// server/src/templates/mobile-gallery/components/PhotoFramesPanel.ts
// Tab Panel 1: Koleksi Desain Frame Siap Cetak (Photostrip Physical Mimic)

import type { SessionGalleryItem } from '../../../services/storage.service.js';
import { escapeHtml } from '../types.js';

export function renderPhotoFramesPanel(
  items: SessionGalleryItem[],
  defaultTab: string,
  sessionId: string,
  safeBoothName: string
): string {
  return `
  <!-- ========================================== -->
  <!-- TAB PANEL 1: PHOTO FRAME (Koleksi Desain Frame) -->
  <!-- ========================================== -->
  <div id="panel-frames" class="${defaultTab === 'frames' ? '' : 'hidden'} pt-4 flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3 class="font-editorial text-xl text-primary font-normal">Koleksi Desain Frame</h3>
      <span class="font-editorial text-xs text-secondary italic">Studio High Resolution</span>
    </div>

    ${
      items.length === 0
        ? `
      <div class="p-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-center flex flex-col items-center gap-2">
        <span class="material-symbols-outlined text-3xl text-secondary">image_not_supported</span>
        <p class="text-xs text-on-surface-variant">Belum ada Photo Frame tersimpan pada sesi ini.</p>
      </div>
    `
        : items
            .map(
              (item, idx) => `
      <article class="bg-surface-container-lowest rounded-2xl p-4 photostrip-shadow border border-outline-variant/20 flex flex-col gap-3.5">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold tracking-wider uppercase text-secondary font-mono">FRAME 0${idx + 1}</span>
            <h4 class="text-sm font-bold text-primary">${escapeHtml(item.fileName.replace(/\.[^/.]+$/, ''))}</h4>
          </div>
          <span class="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
            High-Res Print
          </span>
        </div>

        <!-- Photostrip Physical Mimic Container -->
        <div
          onclick="openLightbox('frames', ${idx})"
          class="bg-surface-container-low p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center border border-outline-variant/20 cursor-pointer active:scale-[0.99] transition-transform"
          title="Ketuk untuk melihat foto beresolusi tinggi"
        >
          <div class="max-w-[280px] w-full bg-white p-2 rounded-lg shadow-md flex flex-col items-center">
            <img
              src="${item.url}"
              onerror="this.onerror=null; this.src='/storage/galleries/${encodeURIComponent(sessionId)}/${encodeURIComponent(item.fileName)}';"
              alt="Photo Frame ${idx + 1}"
              loading="eager"
              class="w-full h-auto rounded object-contain max-h-[460px] bg-black/5"
            />
            <div class="pt-2 pb-0.5 text-center">
              <p class="font-editorial text-xs italic text-secondary tracking-wider">${safeBoothName} • Archive</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-1">
          <button
            type="button"
            onclick="openLightbox('frames', ${idx})"
            class="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high active:scale-98 text-primary text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            title="Buka pratinjau foto penuh"
          >
            <span class="material-symbols-outlined text-[18px]">zoom_in</span>
            <span>Lihat</span>
          </button>
          <button
            type="button"
            onclick="shareOrSaveItem('${item.url}', '${escapeHtml(item.fileName)}', 'Photo Frame ${safeBoothName}')"
            class="flex-1 py-2.5 px-3.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-98 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            title="Simpan langsung ke Galeri Foto HP atau bagikan ke WhatsApp / IG"
          >
            <span class="material-symbols-outlined text-[18px]">ios_share</span>
            <span>Simpan / Bagikan</span>
          </button>
          <a
            href="${item.downloadUrl || item.url}"
            download="${escapeHtml(item.fileName)}"
            onclick="triggerDownload('${escapeHtml(item.fileName)}')"
            class="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high active:scale-98 text-primary flex items-center justify-center transition-all"
            title="Unduh Berkas Langsung"
          >
            <span class="material-symbols-outlined text-[18px]">download</span>
          </a>
        </div>
      </article>
    `
            )
            .join('')
    }
  </div>
  `;
}

