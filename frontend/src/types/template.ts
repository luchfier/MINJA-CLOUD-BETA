export interface PhotoSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  layerIndex: number;
  borderRadius?: number;
}

export type TemplateCategoryType = 'all' | 'single' | 'grid';

export interface TemplateItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  frameUrl: string; // PNG overlay
  layoutType: '4R_PORTRAIT' | '4R_LANDSCAPE' | 'CUSTOM';
  category?: 'single' | 'grid' | string;
  frameLayer?: 'overlay' | 'underlay'; // 'overlay' = bingkai di atas foto (default), 'underlay' = bingkai di belakang foto
  width: number;  // Dimensi lebar kanvas native (misal 1200 px untuk 4R Portrait, 1800 px untuk 4R Landscape)
  height: number; // Dimensi tinggi kanvas native (misal 1800 px untuk 4R Portrait, 1200 px untuk 4R Landscape)
  slots: PhotoSlot[];
  borderRadius?: number;
  isActive: boolean;
  isDefault?: boolean;
}

/**
 * Menyelesaikan kategori template secara deterministik:
 * Kategori hanya ada 2:
 * 1. 'single' -> 1 foto (polaroid / foto tunggal)
 * 2. 'grid'   -> multi foto (2, 3, 4, 6 foto, kolase, maupun 2-strip kembar dalam selembar 4R)
 */
export function resolveTemplateCategory(tpl: {
  category?: string;
  layoutType?: string;
  orientation?: string;
  width?: number;
  height?: number;
  slots?: PhotoSlot[] | any[];
}): 'single' | 'grid' {
  if (tpl.category === 'single' || tpl.category === 'grid') {
    return tpl.category;
  }

  const slotCount = Array.isArray(tpl.slots) ? tpl.slots.length : 0;
  if (slotCount === 1) return 'single';

  return 'grid';
}
