// server/src/templates/mobile-gallery/components/Header.ts
// Header Tetap Bagian Atas dengan Session Code & Live Countdown Pill

export function renderHeader(safeSessionCode: string, safeBoothName: string, remainingHours: number, remainingMinutes: number): string {
  return `
  <!-- Fixed Top Header -->
  <header class="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 pt-safe">
    <div class="h-16 px-4 max-w-lg mx-auto flex items-center justify-between">
      <div class="flex flex-col">
        <div class="flex items-center gap-1.5">
          <span class="font-editorial text-xs italic tracking-wider text-secondary">Studio Archive</span>
          <span class="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
          <span class="text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant font-mono">${safeSessionCode}</span>
        </div>
        <h1 class="text-base font-bold text-primary tracking-tight">${safeBoothName}</h1>
      </div>
      <div class="flex items-center gap-2">
        <div id="header-countdown-badge" class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/80 text-on-secondary-container text-xs font-bold transition-all">
          <span class="material-symbols-outlined text-[15px]">schedule</span>
          <span id="header-countdown-text">${remainingHours}h ${remainingMinutes}m</span>
        </div>
      </div>
    </div>
  </header>
  `;
}
