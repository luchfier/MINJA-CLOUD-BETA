// server/src/templates/mobileGalleryPage.ts
// Re-export dari arsitektur modular mobile-gallery untuk menjaga kompatibilitas route & tests

export {
  renderMobileGalleryHtml,
  type MobileGalleryPageOptions,
  type AlbumSlideItem,
  escapeHtml,
} from './mobile-gallery/index.js';
