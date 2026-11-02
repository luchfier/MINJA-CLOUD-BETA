// src/types/assets.ts
// Tipe data untuk Font Tipografi dan Stiker Photobooth

export interface FontItem {
  id: string;
  name: string;
  fontFamily: string;
  googleFont?: string;
  previewText?: string;
  isCustom?: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface StickerItem {
  id: string;
  name: string;
  category: string;
  type: 'emoji' | 'image';
  url: string; // Emoji char OR data:image/png;base64,... OR image URL
  isActive: boolean;
  createdAt?: string;
}
