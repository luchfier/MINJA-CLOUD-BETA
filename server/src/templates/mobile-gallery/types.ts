// server/src/templates/mobile-gallery/types.ts
// Definisi Tipe & Kontrak Data untuk Mobile Gallery V2

import type { SessionGalleryItem } from '../../services/storage.service.js';

export interface MobileGalleryPageOptions {
  boothName: string;
  sessionId: string;
  sessionCode: string;
  expiresAt: string;
  items: SessionGalleryItem[];
  token?: string;
}

export interface AlbumSlideItem {
  title: string;
  subtitle: string;
  url: string;
  fallbackUrl: string;
  downloadUrl: string;
  fileName: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

