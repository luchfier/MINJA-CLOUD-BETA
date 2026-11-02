// server/src/templates/mobile-gallery/styles.ts
// Kumpulan CSS Terkompilasi, Reset Tipografi Studio, Anti-FOUT Shield & Modal Lightbox Presisi

import { GALLERY_COMPILED_CSS } from '../galleryCss.js';

export function renderGalleryStyles(): string {
  return `
  <style>
    /* 1. Pre-compiled Minimal Tailwind Styles (Zero-Runtime CDN, ~19.8 KB) */
    ${GALLERY_COMPILED_CSS}

    /* 2. Base Typography & Mobile Resets */
    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    html, body {
      width: 100%;
      min-height: 100vh;
      margin: 0;
      padding: 0;
      background-color: #FAF9F6;
      color: #1A1C1A;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      overscroll-behavior-y: none;
    }
    ::-webkit-scrollbar {
      display: none;
    }
    .font-editorial {
      font-family: 'Newsreader', serif;
    }
    .pb-safe {
      padding-bottom: env(safe-area-inset-bottom, 16px);
    }
    .pt-safe {
      padding-top: env(safe-area-inset-top, 0px);
    }
    .photostrip-shadow {
      box-shadow: 0 4px 20px -2px rgba(31, 32, 34, 0.08), 0 2px 6px -1px rgba(31, 32, 34, 0.04);
    }

    /* 3. Anti-FOUT & Icon Stabilizer Shield (Mencegah Bocor Teks Ligatur Material Symbols) */
    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined';
      font-weight: normal;
      font-style: normal;
      font-size: 20px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      vertical-align: middle;
      user-select: none;
      width: 1.25em;
      height: 1.25em;
      overflow: hidden;
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }

    /* 4. Instant Hidden Utility */
    .hidden {
      display: none !important;
    }

    /* 5. Smooth Body Reveal Curtain (Transisi Lembut Bebas FOUC) */
    body {
      opacity: 0;
      animation: revealStudioBody 0.1s cubic-bezier(0, 0, 0.2, 1) forwards;
    }
    @keyframes revealStudioBody {
      to { opacity: 1; }
    }

    /* 6. Cinema Dark Stage Lightbox Modal (Apple Photos / VSCO Studio HUD) */
    #preview-modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      width: 100%;
      height: 100%;
      background: rgba(8, 9, 11, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: env(safe-area-inset-top, 12px) 16px env(safe-area-inset-bottom, 16px) 16px;
      margin: 0;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s cubic-bezier(0, 0, 0.2, 1);
      overflow: hidden;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
    }
    #preview-modal.is-open {
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    /* Floating Top Bar HUD */
    #cinema-topbar {
      width: 100%;
      max-width: 640px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 6px;
      z-index: 30;
    }
    .cinema-info-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 6px 14px;
      border-radius: 9999px;
      min-width: 0;
      max-width: calc(100% - 95px);
    }
    .cinema-counter-badge {
      font-family: ui-monospace, monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #F59E0B;
      color: #07080A;
      flex-shrink: 0;
    }
    .cinema-icon-btn {
      width: 40px;
      height: 40px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
    }
    .cinema-icon-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .cinema-icon-btn:active {
      transform: scale(0.92);
    }
    .cinema-icon-btn.close-btn:hover {
      background: rgba(239, 68, 68, 0.8);
      border-color: rgba(239, 68, 68, 0.9);
    }

    /* Central Cinema Stage */
    #cinema-stage {
      position: relative;
      flex: 1;
      width: 100%;
      max-width: 800px;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 0;
      z-index: 20;
    }
    #modal-image-box {
      width: 100%;
      height: 100%;
      max-height: 74vh;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: zoom-in;
    }
    #modal-img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.75);
      transition: transform 0.2s cubic-bezier(0, 0, 0.2, 1);
      user-select: none;
      -webkit-user-select: none;
      pointer-events: none;
    }

    /* Floating Navigation Chevrons */
    .cinema-nav-btn {
      position: absolute;
      z-index: 25;
      width: 44px;
      height: 44px;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
      transition: transform 0.15s ease, background-color 0.15s ease;
    }
    .cinema-nav-btn:hover {
      background: rgba(0, 0, 0, 0.8);
      transform: scale(1.06);
    }
    .cinema-nav-btn:active {
      transform: scale(0.92);
    }
    .cinema-nav-btn.prev {
      left: 6px;
    }
    .cinema-nav-btn.next {
      right: 6px;
    }
    @media (min-width: 640px) {
      .cinema-nav-btn.prev { left: -14px; }
      .cinema-nav-btn.next { right: -14px; }
    }

    /* Helper Pill */
    .cinema-helper-pill {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: rgba(255, 255, 255, 0.85);
      font-size: 10px;
      font-weight: 500;
      pointer-events: none;
      white-space: nowrap;
      transition: opacity 0.25s ease;
      z-index: 15;
    }

    /* Floating Bottom Action Dock */
    #cinema-bottom-dock {
      width: 100%;
      max-width: 440px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px;
      background: rgba(20, 22, 26, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 20px;
      box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6);
      z-index: 30;
      box-sizing: border-box;
      margin-bottom: 2px;
    }
    .cinema-action-btn {
      flex: 1;
      min-height: 44px;
      padding: 10px 16px;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .cinema-action-btn:active {
      transform: scale(0.97);
    }
    .cinema-action-btn.secondary {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .cinema-action-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.18);
    }
    .cinema-action-btn.primary {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #07080A;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
    }
    .cinema-action-btn.primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 6px 18px rgba(245, 158, 11, 0.45);
    }
  </style>
  `;
}
