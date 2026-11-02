// src/services/asset.service.ts
// Service pengelolaan Aset Kreatif Kiosk: Font Tipografi & Stiker (PNG / Emoji)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FontItem {
  id: string;
  name: string;
  fontFamily: string;
  googleFont?: string;
  previewText?: string;
  isCustom?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface StickerItem {
  id: string;
  name: string;
  category: string;
  type: 'emoji' | 'image';
  url: string; // Emoji character OR data URL / image link
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_FONTS: FontItem[] = [
  {
    id: 'plus-jakarta-sans',
    name: 'Modern Studio',
    fontFamily: 'Plus Jakarta Sans',
    googleFont: 'Plus Jakarta Sans:wght@400;700;800',
    previewText: 'Modern Studio',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'playfair-display',
    name: 'Playfair Elegan',
    fontFamily: 'Playfair Display',
    googleFont: 'Playfair Display:ital,wght@0,600;0,800;1,600',
    previewText: 'Elegan & Anggun',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dancing-script',
    name: 'Dancing Script',
    fontFamily: 'Dancing Script',
    googleFont: 'Dancing Script:wght@700',
    previewText: 'Tulisan Sambung',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'montserrat',
    name: 'Montserrat Bold',
    fontFamily: 'Montserrat',
    googleFont: 'Montserrat:wght@800;900',
    previewText: 'Tegas & Modern',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pacifico',
    name: 'Pacifico Fun',
    fontFamily: 'Pacifico',
    googleFont: 'Pacifico',
    previewText: 'Ceria & Santai',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'oswald',
    name: 'Oswald Solid',
    fontFamily: 'Oswald',
    googleFont: 'Oswald:wght@700',
    previewText: 'Statement Kuat',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'caveat',
    name: 'Caveat Santai',
    fontFamily: 'Caveat',
    googleFont: 'Caveat:wght@700',
    previewText: 'Coretan Alami',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cinzel',
    name: 'Cinzel Klasik',
    fontFamily: 'Cinzel',
    googleFont: 'Cinzel:wght@700',
    previewText: 'Klasik Istimewa',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_STICKERS: StickerItem[] = [
  { id: 'stk-heart', name: 'Red Heart', category: 'Emoji', type: 'emoji', url: '❤️', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-sparkles', name: 'Sparkles', category: 'Emoji', type: 'emoji', url: '✨', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-cool', name: 'Cool Sunglasses', category: 'Emoji', type: 'emoji', url: '😎', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-party', name: 'Party Popper', category: 'Emoji', type: 'emoji', url: '🎉', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-crown', name: 'Gold Crown', category: 'Emoji', type: 'emoji', url: '👑', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-camera', name: 'Vintage Camera', category: 'Emoji', type: 'emoji', url: '📷', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-butterfly', name: 'Butterfly', category: 'Emoji', type: 'emoji', url: '🦋', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-ribbon', name: 'Pink Ribbon', category: 'Emoji', type: 'emoji', url: '🎀', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-flame', name: 'Flame Hits', category: 'Emoji', type: 'emoji', url: '🔥', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-peace', name: 'Peace Sign', category: 'Emoji', type: 'emoji', url: '✌️', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-flower', name: 'Cherry Blossom', category: 'Emoji', type: 'emoji', url: '🌸', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-cake', name: 'Birthday Cake', category: 'Emoji', type: 'emoji', url: '🎂', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-star', name: 'Gold Star', category: 'Emoji', type: 'emoji', url: '⭐', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-celebrate', name: 'Partying Face', category: 'Emoji', type: 'emoji', url: '🥳', isActive: true, createdAt: new Date().toISOString() },
];

const STICKERS_DIR = path.resolve(__dirname, '../../storage/stickers');

function ensureStickersDir(): void {
  if (!fs.existsSync(STICKERS_DIR)) {
    fs.mkdirSync(STICKERS_DIR, { recursive: true });
  }
}

/**
 * Menyimpan gambar stiker base64 ke file fisik di disk lokal (server/storage/stickers/)
 * Mengurangi ukuran payload stickers.json dari megabytes menjadi URL singkat ~35 bytes
 */
async function persistStickerFile(sourceUrl: string, identifier: string): Promise<string> {
  if (!sourceUrl || !sourceUrl.startsWith('data:image/')) {
    return sourceUrl;
  }

  try {
    ensureStickersDir();
    const commaIdx = sourceUrl.indexOf(',');
    if (commaIdx === -1) return sourceUrl;

    const mimeMatch = sourceUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
    const ext = mimeMatch && mimeMatch[1] === 'jpeg' ? 'jpg' : (mimeMatch?.[1] || 'png');
    const base64Data = sourceUrl.slice(commaIdx + 1);
    const buffer = Buffer.from(base64Data, 'base64');

    const safeId = identifier.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
    const safeName = `sticker_${safeId}_${Date.now()}.${ext}`;
    const filePath = path.join(STICKERS_DIR, safeName);
    await fs.promises.writeFile(filePath, buffer);

    return `/storage/stickers/${safeName}`;
  } catch (err) {
    console.warn('[AssetService] Warning gagal menyimpan stiker ke disk, fallback ke string:', err);
    return sourceUrl;
  }
}

export class AssetService {
  private storageDir: string;
  private fontsFile: string;
  private stickersFile: string;

  constructor() {
    this.storageDir = path.resolve(__dirname, '../../storage/assets');
    this.fontsFile = path.join(this.storageDir, 'fonts.json');
    this.stickersFile = path.join(this.storageDir, 'stickers.json');

    ensureStickersDir();
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    if (!fs.existsSync(this.fontsFile)) {
      fs.writeFileSync(this.fontsFile, JSON.stringify(DEFAULT_FONTS, null, 2), 'utf8');
    }

    if (!fs.existsSync(this.stickersFile)) {
      fs.writeFileSync(this.stickersFile, JSON.stringify(DEFAULT_STICKERS, null, 2), 'utf8');
    } else {
      // Auto-migrate stiker base64 lama yang tersimpan di stickers.json ke file fisik disk
      try {
        const content = fs.readFileSync(this.stickersFile, 'utf8');
        const list: StickerItem[] = JSON.parse(content);
        let hasMigrated = false;
        for (const item of list) {
          if (item.type === 'image' && item.url && item.url.startsWith('data:image/')) {
            ensureStickersDir();
            const commaIdx = item.url.indexOf(',');
            if (commaIdx !== -1) {
              const mimeMatch = item.url.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
              const ext = mimeMatch && mimeMatch[1] === 'jpeg' ? 'jpg' : (mimeMatch?.[1] || 'png');
              const buffer = Buffer.from(item.url.slice(commaIdx + 1), 'base64');
              const safeName = `sticker_${item.id}_migrated.${ext}`;
              const filePath = path.join(STICKERS_DIR, safeName);
              fs.writeFileSync(filePath, buffer);
              item.url = `/storage/stickers/${safeName}`;
              hasMigrated = true;
            }
          }
        }
        if (hasMigrated) {
          fs.writeFileSync(this.stickersFile, JSON.stringify(list, null, 2), 'utf8');
        }
      } catch {
        // Safe fallback
      }
    }
  }

  // =================== FONTS ===================

  async getFonts(includeInactive = false): Promise<FontItem[]> {
    try {
      this.ensureInitialized();
      const content = fs.readFileSync(this.fontsFile, 'utf8');
      const list: FontItem[] = JSON.parse(content);
      return includeInactive ? list : list.filter((f) => f.isActive);
    } catch {
      return DEFAULT_FONTS;
    }
  }

  async createFont(data: {
    name: string;
    fontFamily: string;
    googleFont?: string;
    previewText?: string;
  }): Promise<FontItem> {
    const list = await this.getFonts(true);
    const id = `fnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newFont: FontItem = {
      id,
      name: data.name.trim(),
      fontFamily: data.fontFamily.trim(),
      googleFont: data.googleFont?.trim() || undefined,
      previewText: data.previewText?.trim() || data.name.trim(),
      isCustom: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    list.push(newFont);
    fs.writeFileSync(this.fontsFile, JSON.stringify(list, null, 2), 'utf8');
    return newFont;
  }

  async deleteFont(id: string): Promise<boolean> {
    const list = await this.getFonts(true);
    const filtered = list.filter((f) => f.id !== id);
    if (filtered.length === list.length) return false;
    fs.writeFileSync(this.fontsFile, JSON.stringify(filtered, null, 2), 'utf8');
    return true;
  }

  async toggleFont(id: string): Promise<FontItem | null> {
    const list = await this.getFonts(true);
    const item = list.find((f) => f.id === id);
    if (!item) return null;
    item.isActive = !item.isActive;
    fs.writeFileSync(this.fontsFile, JSON.stringify(list, null, 2), 'utf8');
    return item;
  }

  // =================== STICKERS ===================

  async getStickers(includeInactive = false): Promise<StickerItem[]> {
    try {
      this.ensureInitialized();
      const content = fs.readFileSync(this.stickersFile, 'utf8');
      const list: StickerItem[] = JSON.parse(content);
      return includeInactive ? list : list.filter((s) => s.isActive);
    } catch {
      return DEFAULT_STICKERS;
    }
  }

  async createSticker(data: {
    name: string;
    category?: string;
    type: 'emoji' | 'image';
    url: string;
  }): Promise<StickerItem> {
    const list = await this.getStickers(true);
    const id = `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let finalUrl = data.url.trim();
    if (data.type === 'image' && finalUrl.startsWith('data:image/')) {
      finalUrl = await persistStickerFile(finalUrl, id);
    }

    const newSticker: StickerItem = {
      id,
      name: data.name.trim(),
      category: data.category?.trim() || (data.type === 'image' ? 'PNG Kustom' : 'Emoji'),
      type: data.type,
      url: finalUrl,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    list.push(newSticker);
    fs.writeFileSync(this.stickersFile, JSON.stringify(list, null, 2), 'utf8');
    return newSticker;
  }

  async deleteSticker(id: string): Promise<boolean> {
    const list = await this.getStickers(true);
    const target = list.find((s) => s.id === id);
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;

    fs.writeFileSync(this.stickersFile, JSON.stringify(filtered, null, 2), 'utf8');

    // Clean up local disk file if sticker was stored in /storage/stickers/
    if (target?.url && target.url.startsWith('/storage/stickers/')) {
      try {
        const filename = path.basename(target.url);
        const filePath = path.join(STICKERS_DIR, filename);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (cleanErr) {
        console.warn('[AssetService] Warning cleaning up sticker file:', cleanErr);
      }
    }

    return true;
  }

  async toggleSticker(id: string): Promise<StickerItem | null> {
    const list = await this.getStickers(true);
    const item = list.find((s) => s.id === id);
    if (!item) return null;
    item.isActive = !item.isActive;
    fs.writeFileSync(this.stickersFile, JSON.stringify(list, null, 2), 'utf8');
    return item;
  }
}
