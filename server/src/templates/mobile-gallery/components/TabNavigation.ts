// server/src/templates/mobile-gallery/components/TabNavigation.ts
// Pengalih Tab Interaktif (Photo Frame | Single Cut | Live Video)

export function renderTabNavigation(
  defaultTab: string,
  framesCount: number,
  cutsCount: number,
  liveCount: number
): string {
  return `
  <!-- Interactive Studio Tab Switcher -->
  <section class="sticky top-16 z-40 bg-surface/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-outline-variant/20">
    <div class="flex p-1 bg-surface-container rounded-xl gap-1" role="tablist">
      <!-- Tab 1: Photo Frame -->
      <button
        type="button"
        id="tab-btn-frames"
        onclick="switchStudioTab('frames')"
        class="flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
          defaultTab === 'frames'
            ? 'bg-surface-container-lowest shadow-sm text-primary'
            : 'text-on-surface-variant hover:text-primary'
        }"
      >
        <span>Photo Frame</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
          defaultTab === 'frames' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
        }">
          ${framesCount}
        </span>
      </button>

      <!-- Tab 2: Single Cut -->
      <button
        type="button"
        id="tab-btn-cuts"
        onclick="switchStudioTab('cuts')"
        class="flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
          defaultTab === 'cuts'
            ? 'bg-surface-container-lowest shadow-sm text-primary'
            : 'text-on-surface-variant hover:text-primary'
        }"
      >
        <span>Single Cut</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
          defaultTab === 'cuts' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
        }">
          ${cutsCount}
        </span>
      </button>

      <!-- Tab 3: Live Video -->
      <button
        type="button"
        id="tab-btn-live"
        onclick="switchStudioTab('live')"
        class="flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
          defaultTab === 'live'
            ? 'bg-surface-container-lowest shadow-sm text-primary'
            : 'text-on-surface-variant hover:text-primary'
        }"
      >
        <span>Live & Slideshow</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
          defaultTab === 'live' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
        }">
          ${liveCount}
        </span>
      </button>
    </div>
  </section>
  `;
}

