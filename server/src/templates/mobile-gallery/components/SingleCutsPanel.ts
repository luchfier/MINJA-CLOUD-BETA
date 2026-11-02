// server/src/templates/mobile-gallery/components/SingleCutsPanel.ts
// Tab Panel 2: Grid Foto Mentah Individual Resolusi Asli Kamera

import type { SessionGalleryItem } from '../../../services/storage.service.js';
import { escapeHtml } from '../types.js';

export function renderSingleCutsPanel(
  items: SessionGalleryItem[],
  defaultTab: string,
  sessionId: string
): string {
  return `
  <!-- ========================================== -->
  <!-- TAB PANEL 2: SINGLE CUT (Foto Mentah Individual) -->
  <!-- ========================================== -->
  <div id="panel-cuts" class="${defaultTab === 'cuts' ? '' : 'hidden'} pt-4 flex flex-col gap-4">
    <div class="flex items-baseline justify-between">
      <div>
        <h3 class="font-editorial text-xl text-primary font-normal">Foto Mentah Individual</h3>
        <p class="text-xs text-on-surface-variant mt-0.5">Resolusi asli kamera tanpa bingkai</p>
      </div>
      <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
        ${items.length} Foto
      </span>
    </div>

    ${
      items.length === 0
        ? `
      <div class="p-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-center flex flex-col items-center gap-2">
        <span class="material-symbols-outlined text-3xl text-secondary">photo_camera</span>
        <p class="text-xs text-on-surface-variant">Belum ada Single Cut foto mentah pada sesi ini.</p>
      </div>
    `
        : `
      <div class="grid grid-cols-2 gap-3">
        ${items
          .map(
            (item, idx) => `
          <div class="bg-surface-container-lowest p-2 rounded-xl shadow-xs border border-outline-variant/20 flex flex-col gap-2">
            <div
              onclick="openLightbox('cuts', ${idx})"
              class="relative aspect-[3/4] rounded-lg overflow-hidden bg-surface-container group cursor-pointer active:scale-[0.98] transition-transform"
              title="Ketuk untuk melihat foto mentah"
            >
              <img
                src="${item.url}"
                onerror="this.onerror=null; this.src='/storage/galleries/${encodeURIComponent(sessionId)}/${encodeURIComponent(item.fileName)}';"
                alt="Single Cut ${idx + 1}"
                loading="lazy"
                class="w-full h-full object-cover"
              />
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/80 backdrop-blur text-on-primary text-[10px] font-bold">
                Cut #${idx + 1}
              </span>
              <button
                type="button"
                onclick="event.stopPropagation(); openLightbox('cuts', ${idx})"
                class="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface-container-lowest/90 backdrop-blur text-primary flex items-center justify-center shadow-xs active:scale-95 transition-transform"
                title="Lihat Pratinjau Cut #${idx + 1}"
              >
                <span class="material-symbols-outlined text-[16px]">visibility</span>
              </button>
            </div>

            <div class="flex items-center justify-between pt-0.5 px-1">
              <span class="text-[11px] font-medium text-on-surface-variant truncate max-w-[85px]">
                ${escapeHtml(item.fileName)}
              </span>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  onclick="shareOrSaveItem('${item.url}', '${escapeHtml(item.fileName)}', 'Cut #${idx + 1}')"
                  title="Simpan / Bagikan Cut #${idx + 1}"
                  class="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high active:scale-95 text-primary flex items-center justify-center transition-colors"
                >
                  <span class="material-symbols-outlined text-[16px]">ios_share</span>
                </button>
                <a
                  href="${item.downloadUrl || item.url}"
                  download="${escapeHtml(item.fileName)}"
                  onclick="triggerDownload('${escapeHtml(item.fileName)}')"
                  title="Unduh Cut #${idx + 1}"
                  class="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high active:scale-95 text-primary flex items-center justify-center transition-colors"
                >
                  <span class="material-symbols-outlined text-[16px]">download</span>
                </a>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `
    }
  </div>
  `;
}

