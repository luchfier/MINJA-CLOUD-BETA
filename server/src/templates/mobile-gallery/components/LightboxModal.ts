// server/src/templates/mobile-gallery/components/LightboxModal.ts
// Opsi A: Cinema Dark Stage Lightbox Modal (Full Immersive Floating HUD Studio)

export function renderLightboxModal(): string {
  return `
  <!-- Cinema Dark Stage Lightbox Modal (Full Immersive Floating HUD) -->
  <div
    id="preview-modal"
    role="dialog"
    aria-modal="true"
    aria-label="Pratinjau Foto Studio Sinematik"
  >
    <!-- 1. Floating Top Bar HUD -->
    <header id="cinema-topbar">
      <div class="cinema-info-pill">
        <span id="modal-counter" class="cinema-counter-badge">1 / 1</span>
        <div class="cinema-meta truncate">
          <h4 id="modal-title" class="text-xs sm:text-sm font-bold text-white truncate leading-tight">Detail Foto</h4>
          <span id="modal-subtitle" class="text-[10px] sm:text-[11px] text-white/60 block truncate font-editorial italic">Minja Studio High-Res Archive</span>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <!-- Zoom Toggle Button -->
        <button
          type="button"
          id="modal-zoom-btn"
          onclick="toggleLightboxZoom()"
          class="cinema-icon-btn"
          title="Perbesar / Perkecil Foto"
        >
          <span id="modal-zoom-icon" class="material-symbols-outlined text-[20px]">zoom_in</span>
        </button>

        <!-- Close Button -->
        <button
          type="button"
          onclick="closePreviewModal()"
          class="cinema-icon-btn close-btn"
          title="Tutup Pratinjau (Esc)"
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </header>

    <!-- 2. Central Cinema Stage & Nav Chevrons -->
    <main id="cinema-stage">
      <!-- Floating Prev Button -->
      <button
        type="button"
        id="modal-prev-btn"
        onclick="prevLightboxSlide(event)"
        class="cinema-nav-btn prev"
        title="Foto Sebelumnya"
      >
        <span class="material-symbols-outlined text-[22px]">chevron_left</span>
      </button>

      <!-- Central Image Container -->
      <div id="modal-image-box" onclick="toggleLightboxZoom()">
        <img
          id="modal-img"
          src=""
          alt="Pratinjau Foto"
          draggable="false"
        />
      </div>

      <!-- Floating Next Button -->
      <button
        type="button"
        id="modal-next-btn"
        onclick="nextLightboxSlide(event)"
        class="cinema-nav-btn next"
        title="Foto Selanjutnya"
      >
        <span class="material-symbols-outlined text-[22px]">chevron_right</span>
      </button>

      <!-- Swipe & Zoom Helper Pill -->
      <div id="modal-helper-pill" class="cinema-helper-pill">
        Ketuk / cubit untuk zoom • Geser foto
      </div>
    </main>

    <!-- 3. Floating Bottom Action Dock -->
    <footer id="cinema-bottom-dock">
      <button
        type="button"
        id="modal-share-btn"
        class="cinema-action-btn secondary"
      >
        <span class="material-symbols-outlined text-[19px]">ios_share</span>
        <span>Simpan / Bagikan</span>
      </button>

      <a
        id="modal-download-btn"
        href="#"
        download=""
        class="cinema-action-btn primary"
      >
        <span class="material-symbols-outlined text-[19px]">download</span>
        <span>Unduh Kualitas Asli</span>
      </a>
    </footer>
  </div>
  `;
}
