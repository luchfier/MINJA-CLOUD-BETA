// server/src/templates/mobile-gallery/components/LiveVideosPanel.ts
// Tab Panel 3: Pemutar Video Estetik (Live Photo & Slideshow Beat Cut)

import type { SessionGalleryItem } from '../../../services/storage.service.js';
import { escapeHtml } from '../types.js';

export function renderLiveVideosPanel(
  items: SessionGalleryItem[],
  defaultTab: string,
  sessionId: string
): string {
  return `
  <!-- ========================================== -->
  <!-- TAB PANEL 3: LIVE & SLIDESHOW (Output Video) -->
  <!-- ========================================== -->
  <div id="panel-live" class="${defaultTab === 'live' ? '' : 'hidden'} pt-4 flex flex-col gap-4">
    <div class="flex items-baseline justify-between">
      <div>
        <h3 class="font-editorial text-xl text-primary font-normal">Video Output Momen</h3>
        <p class="text-xs text-on-surface-variant mt-0.5">Video gerak otomatis rekaman momen pemotretan</p>
      </div>
      <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
        ${items.length} Video
      </span>
    </div>

    ${
      items.length === 0
        ? `
      <div class="p-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-center flex flex-col items-center gap-2">
        <span class="material-symbols-outlined text-3xl text-secondary">videocam_off</span>
        <p class="text-xs text-on-surface-variant">Belum ada video tersimpan pada sesi ini.</p>
      </div>
    `
        : items
            .map((item, idx) => {
              const isSlideshow = item.fileName.toLowerCase().includes('slideshow');
              let itemTitle = 'Video Output';
              let badgeText = 'Video HD';
              let subText = 'Video Klip Gerak';

              if (isSlideshow) {
                itemTitle = 'Video Slideshow Semua Momen';
                badgeText = 'Slideshow Momen';
                subText = 'Video Momen Pilihan (Siap Story & Status)';
              } else {
                const matchNum = item.fileName.match(/(?:layout_live|live_layout|live_photo|frame|design)[-_](\d+)/i);
                const frameNum =
                  matchNum && matchNum[1] && matchNum[1] !== '4'
                    ? matchNum[1]
                    : item.fileName.toLowerCase().includes('4r') || (matchNum && matchNum[1] === '1')
                    ? '1'
                    : String(idx + 1);
                itemTitle = `Live Photo Desain Frame #${frameNum}`;
                badgeText = 'Live Frame';
                subText = `Animasi gerak foto berbingkai Desain #${frameNum}`;
              }
              const aspectClass = isSlideshow ? 'aspect-[9/16] max-h-[520px]' : 'aspect-auto max-h-[520px]';

              return `
      <article class="bg-surface-container-lowest rounded-2xl p-4 photostrip-shadow border border-outline-variant/20 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${isSlideshow ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-pulse'}"></span>
            <h4 class="text-sm font-bold text-primary">${escapeHtml(itemTitle)}</h4>
          </div>
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isSlideshow
              ? 'bg-amber-500/20 text-amber-900 border border-amber-500/30'
              : 'bg-secondary-container text-on-secondary-container'
          }">
            ${badgeText}
          </span>
        </div>

        <!-- Aesthetic Studio Video Player -->
        <div class="relative ${aspectClass} mx-auto w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-outline-variant/20 shadow-inner group select-none">
          <video
            id="video-player-${idx}"
            playsinline
            loop
            preload="metadata"
            onclick="toggleVideoPlay('video-player-${idx}')"
            class="w-full h-full object-contain cursor-pointer"
          >
            <source src="${item.url}" type="video/mp4">
            <source src="/storage/galleries/${encodeURIComponent(sessionId)}/${encodeURIComponent(item.fileName)}" type="video/mp4">
            <source src="/api/public/gallery/${encodeURIComponent(sessionId)}/download/${encodeURIComponent(item.fileName)}" type="video/mp4">
            Browser Anda tidak mendukung pemutar video MP4.
          </video>

          <!-- Floating Centered Play/Pause Button Overlay -->
          <button
            type="button"
            id="video-play-btn-${idx}"
            onclick="toggleVideoPlay('video-player-${idx}')"
            class="absolute z-10 w-14 h-14 rounded-full bg-primary/75 hover:bg-primary backdrop-blur-md text-white flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90"
            title="Putar Video"
          >
            <span id="video-play-icon-${idx}" class="material-symbols-outlined text-[32px] ml-0.5">play_arrow</span>
          </button>

          <!-- Top Right Audio Mute / Unmute Toggle -->
          <button
            type="button"
            id="video-audio-btn-${idx}"
            onclick="toggleVideoAudio('video-player-${idx}', this)"
            class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-95 shadow-md border border-white/10"
            title="Nyalakan / Matikan Suara"
          >
            <span class="material-symbols-outlined text-[16px]">volume_off</span>
          </button>

          <!-- Bottom Progress Bar Indicator -->
          <div class="absolute bottom-0 inset-x-0 h-1 bg-white/20 overflow-hidden pointer-events-none">
            <div id="video-progress-${idx}" class="h-full bg-amber-400 w-0 transition-all duration-100 ease-linear"></div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <div class="flex flex-col">
            <span class="font-editorial text-xs italic text-secondary">${subText}</span>
            <span class="text-[11px] text-on-surface-variant font-mono">${escapeHtml(item.fileName)}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick="shareOrSaveItem('${item.url}', '${escapeHtml(item.fileName)}', '${escapeHtml(itemTitle)}')"
              class="py-2 px-3 rounded-xl bg-secondary-container hover:bg-secondary-container/80 active:scale-98 text-on-secondary-container text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
              title="Bagikan Video ke WhatsApp / Instagram Story"
            >
              <span class="material-symbols-outlined text-[18px]">ios_share</span>
              <span>Bagikan</span>
            </button>
            <a
              href="${item.downloadUrl || item.url}"
              download="${escapeHtml(item.fileName)}"
              onclick="triggerDownload('${escapeHtml(item.fileName)}')"
              class="py-2 px-3.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-98 text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Unduh MP4</span>
            </a>
          </div>
        </div>
      </article>
    `;
            })
            .join('')
    }
  </div>
  `;
}

