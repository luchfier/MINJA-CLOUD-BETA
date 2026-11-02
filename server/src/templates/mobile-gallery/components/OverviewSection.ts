// server/src/templates/mobile-gallery/components/OverviewSection.ts
// Ringkasan Ikhtisar Sesi Studio & Banner Masa Simpan 48 Jam

export function renderOverviewSection(
  safeSessionCode: string,
  safeBoothName: string,
  expiryFormatted: string
): string {
  return `
  <!-- Studio Session Header Overview -->
  <section class="pt-2 pb-4 flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase font-mono">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        ${safeSessionCode}
      </span>
      <span class="font-editorial text-xs text-secondary italic">Private Memory Collection</span>
    </div>

    <div class="mt-1">
      <h2 class="font-editorial text-2xl text-primary tracking-tight font-normal leading-tight">${safeBoothName}</h2>
      <p class="text-xs text-on-surface-variant mt-0.5">Seluruh soft file foto dan video Anda telah tersimpan dengan aman.</p>
    </div>

    <!-- Cloud Expiry Notice -->
    <div id="banner-expiry-card" class="mt-1 p-3.5 rounded-2xl bg-secondary-container/50 border border-secondary-container text-on-secondary-container flex items-center justify-between shadow-sm transition-all">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 text-primary shadow-xs">
          <span id="banner-expiry-icon" class="material-symbols-outlined text-[20px]">hourglass_top</span>
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-[10px] font-bold tracking-wider uppercase text-on-secondary-container">Masa Simpan Soft File</span>
          <span id="banner-countdown-live" class="text-xs font-bold text-primary truncate">Memuat hitung mundur...</span>
          <span class="text-[10px] text-on-surface-variant truncate">Batas unduh: ${expiryFormatted} WIB</span>
        </div>
      </div>
      <span class="material-symbols-outlined text-secondary shrink-0 text-[18px]">verified</span>
    </div>
  </section>
  `;
}

