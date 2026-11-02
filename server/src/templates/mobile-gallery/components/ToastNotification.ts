// server/src/templates/mobile-gallery/components/ToastNotification.ts
// Notifikasi Toast Mengambang Responsif

export function renderToastNotification(): string {
  return `
  <!-- Floating Toast Notification -->
  <div id="toast" class="fixed top-20 inset-x-4 z-50 mx-auto max-w-xs bg-primary text-on-primary px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 transition-all duration-300 opacity-0 pointer-events-none translate-y-[-8px]">
    <span id="toast-icon" class="material-symbols-outlined text-[20px] text-secondary-container">check_circle</span>
    <span id="toast-msg" class="text-xs font-medium">Pesan</span>
  </div>
  `;
}

