// server/src/services/nativeRenderer.service.ts
// Native Windows Processing Core (Sharp C++ libvips + Skia Canvas @napi-rs/canvas)
// Sesuai PRD §4.4, ARCHITECTURE.md §2.1 & THE_NEXT_STEP.md §4.1

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { humanLogger } from '../utils/humanLogger.js';
import { softFileOptimizer } from './softFileOptimizer.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy loader untuk Skia Canvas agar server cloud ringan tanpa beban modul Skia C++
let skiaModule: any = null;
async function getSkia() {
  if (!skiaModule) {
    try {
      skiaModule = await import('@napi-rs/canvas');
      if (process.platform === 'win32' && skiaModule.GlobalFonts) {
        try {
          skiaModule.GlobalFonts.loadFontsFromDir('C:/Windows/Fonts');
        } catch {}
      }
    } catch {
      throw new Error(
        'Engine @napi-rs/canvas tidak terpasang di environment ini. Modul ini khusus Kiosk Desktop.'
      );
    }
  }
  return skiaModule;
}

export interface RenderSlotInput {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  borderRadius?: number;
}

export interface RenderTemplateInput {
  id: string;
  name: string;
  layoutType?: string;
  width?: number;
  height?: number;
  frameUrl?: string;
  frameLayer?: 'overlay' | 'underlay';
  slots: RenderSlotInput[];
}

export interface RenderSlotAdjustment {
  scale?: number;
  panX?: number;
  panY?: number;
  rotation?: number;
  filter?: string;
}

export interface RenderStickerInput {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface RenderTextInput {
  id: string;
  content: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  x: number;
  y: number;
  rotation?: number;
  isBold?: boolean;
  isItalic?: boolean;
}

export interface RenderCompositionInput {
  sessionId: string;
  designId?: string;
  template: RenderTemplateInput;
  photoUrls: string[];
  filter?: 'normal' | 'bw' | 'sepia' | 'warm' | 'cool' | 'glamour';
  adjustments?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
  };
  slotAdjustments?: Record<number, RenderSlotAdjustment>;
  stickers?: RenderStickerInput[];
  texts?: RenderTextInput[];
}

export interface RenderCompositionResult {
  success: boolean;
  printFilePath: string;
  webUrl: string;
  galleryUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  dpi: number;
  sizeBytes: number;
  processingTimeMs: number;
}

export class NativeRendererService {
  private printsDir: string;
  private galleriesDir: string;

  constructor() {
    this.printsDir = path.resolve(__dirname, '../../storage/prints');
    this.galleriesDir = path.resolve(__dirname, '../../storage/galleries');

    try {
      fs.mkdirSync(this.printsDir, { recursive: true });
      fs.mkdirSync(this.galleriesDir, { recursive: true });
    } catch (err) {
      console.warn('[NativeRenderer] Warning saat membuat direktori storage:', err);
    }
  }

  /**
   * Menghitung resolusi kanvas cetak standar lab studio 300 DPI
   */
  public calculateDimensions(template: RenderTemplateInput): { width: number; height: number } {
    let width = template.width || 1200;
    let height = template.height || 1800;

    if (!template.width || !template.height) {
      if (template.layoutType === '4R_LANDSCAPE' || template.layoutType === 'STUDIO_LANDSCAPE') {
        width = 1800;
        height = 1200;
      } else {
        width = 1200;
        height = 1800;
      }
    }

    return { width, height };
  }

  /**
   * Mengubah input dataUrl, relative path, atau URL menjadi Buffer raw
   */
  private async resolveToBuffer(source: string): Promise<Buffer | null> {
    if (!source || source.trim().length === 0) return null;

    try {
      // 1. Data URL Base64
      if (source.startsWith('data:image/')) {
        const commaIdx = source.indexOf(',');
        if (commaIdx !== -1) {
          return Buffer.from(source.slice(commaIdx + 1), 'base64');
        }
      }

      // 2. Local File Path
      let localPath = source;
      if (source.startsWith('/storage/')) {
        localPath = path.resolve(__dirname, '../../storage', source.replace(/^\/storage\//, ''));
      }

      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }

      // 3. Web URL
      if (source.startsWith('http://') || source.startsWith('https://')) {
        const res = await fetch(source);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      }
    } catch (err) {
      console.warn(`[NativeRenderer] Gagal membaca gambar '${source.slice(0, 50)}...':`, err);
    }

    return null;
  }

  /**
   * Pre-processing foto mentah dengan Sharp (libvips C++):
   * Auto-orientasi EXIF, Lanczos3 resize, color grading studio filter, dan penyesuaian kontras
   */
  public async processSlotPhoto(
    photoBuffer: Buffer,
    filterName = 'normal',
    adjustments?: { brightness?: number; contrast?: number; saturation?: number }
  ): Promise<Buffer> {
    let pipeline = sharp(photoBuffer).rotate(); // Normalisasi EXIF rotasi otomatis

    // Filter Preset Studio
    switch (filterName) {
      case 'bw':
        pipeline = pipeline.grayscale();
        break;
      case 'sepia':
        pipeline = pipeline.recomb([
          [0.393, 0.769, 0.189],
          [0.349, 0.686, 0.168],
          [0.272, 0.534, 0.131],
        ]);
        break;
      case 'warm':
        pipeline = pipeline
          .modulate({
            brightness: 1.05,
            saturation: 1.15,
          })
          .tint({ r: 255, g: 240, b: 220 });
        break;
      case 'cool':
        pipeline = pipeline
          .modulate({
            brightness: 1.02,
            saturation: 0.95,
          })
          .tint({ r: 220, g: 235, b: 255 });
        break;
      case 'glamour':
        pipeline = pipeline.modulate({
          brightness: 1.08,
          saturation: 1.05,
        });
        break;
      case 'normal':
      default:
        break;
    }

    // Manual adjustments
    if (adjustments) {
      const bFactor = 1 + (adjustments.brightness || 0) / 100;
      const sFactor = 1 + (adjustments.saturation || 0) / 100;
      if (bFactor !== 1 || sFactor !== 1) {
        pipeline = pipeline.modulate({
          brightness: Math.max(0.2, Math.min(2.0, bFactor)),
          saturation: Math.max(0.2, Math.min(2.0, sFactor)),
        });
      }
    }

    return await pipeline.png().toBuffer();
  }

  /**
   * Merender komposisi penuh secara Headless menggunakan Skia Canvas + Sharp 300 DPI
   */
  public async renderComposition(input: RenderCompositionInput): Promise<RenderCompositionResult> {
    const startTime = Date.now();
    const { width, height } = this.calculateDimensions(input.template);
    const designId = input.designId || `design_${Date.now()}`;
    const sessionGalleryDir = path.join(this.galleriesDir, input.sessionId);

    fs.mkdirSync(sessionGalleryDir, { recursive: true });

    // 1. Inisialisasi Skia Canvas C++ Headless
    const { createCanvas, loadImage } = await getSkia();
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Layer 0: Background Studio
    ctx.save();
    ctx.fillStyle = '#0F131D';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#263147';
    ctx.lineWidth = 16;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    ctx.restore();

    // LAYER 0.5: Template Frame Underlay (jika template disetel posisi bingkai di belakang foto)
    if (input.template.frameLayer === 'underlay' && input.template.frameUrl) {
      const frameBuffer = await this.resolveToBuffer(input.template.frameUrl);
      if (frameBuffer) {
        const frameImage = await loadImage(frameBuffer);
        ctx.drawImage(frameImage, 0, 0, width, height);
      }
    }

    // 2. Layer 1: Photo Slots
    const slots = input.template.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const photoSource = input.photoUrls[i];
      if (!photoSource) continue;

      const rawBuffer = await this.resolveToBuffer(photoSource);
      if (!rawBuffer) continue;

      const slotAdj = input.slotAdjustments?.[i] || {};
      const slotFilter = slotAdj.filter || input.filter || 'normal';

      // Olah citra dengan Sharp C++
      const processedPhotoBuffer = await this.processSlotPhoto(
        rawBuffer,
        slotFilter,
        input.adjustments
      );

      const slotImage = await loadImage(processedPhotoBuffer);

      // Gambar ke slot dengan Clipping Path
      ctx.save();
      ctx.beginPath();
      if (slot.borderRadius && slot.borderRadius > 0) {
        const r = slot.borderRadius;
        ctx.moveTo(slot.x + r, slot.y);
        ctx.arcTo(slot.x + slot.width, slot.y, slot.x + slot.width, slot.y + slot.height, r);
        ctx.arcTo(slot.x + slot.width, slot.y + slot.height, slot.x, slot.y + slot.height, r);
        ctx.arcTo(slot.x, slot.y + slot.height, slot.x, slot.y, r);
        ctx.arcTo(slot.x, slot.y, slot.x + slot.width, slot.y, r);
      } else {
        ctx.rect(slot.x, slot.y, slot.width, slot.height);
      }
      ctx.closePath();
      ctx.clip();

      // Transformasi Foto (Scale, Pan, Rotation)
      const slotCenterX = slot.x + slot.width / 2;
      const slotCenterY = slot.y + slot.height / 2;
      ctx.translate(slotCenterX + (slotAdj.panX || 0), slotCenterY + (slotAdj.panY || 0));

      if (slotAdj.rotation) {
        ctx.rotate((slotAdj.rotation * Math.PI) / 180);
      }

      // Hitung scaling "cover" agar foto mengisi slot tanpa distorsi
      const imgAspect = slotImage.width / slotImage.height;
      const slotAspect = slot.width / slot.height;
      let drawW: number;
      let drawH: number;

      if (imgAspect > slotAspect) {
        drawH = slot.height;
        drawW = drawH * imgAspect;
      } else {
        drawW = slot.width;
        drawH = drawW / imgAspect;
      }

      const userScale = slotAdj.scale || 1.0;
      drawW *= userScale;
      drawH *= userScale;

      ctx.drawImage(slotImage, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // 3. Layer 2: Template Overlay (jika template disetel posisi bingkai di depan foto - default)
    if (input.template.frameLayer !== 'underlay' && input.template.frameUrl) {
      const frameBuffer = await this.resolveToBuffer(input.template.frameUrl);
      if (frameBuffer) {
        const frameImage = await loadImage(frameBuffer);
        ctx.drawImage(frameImage, 0, 0, width, height);
      }
    }

    // 4. Layer 3: Interactive Stickers
    if (input.stickers && input.stickers.length > 0) {
      for (const st of input.stickers) {
        const stBuffer = await this.resolveToBuffer(st.url);
        if (!stBuffer) continue;

        const stImg = await loadImage(stBuffer);
        ctx.save();
        ctx.translate(st.x + st.width / 2, st.y + st.height / 2);
        if (st.rotation) {
          ctx.rotate((st.rotation * Math.PI) / 180);
        }
        ctx.drawImage(stImg, -st.width / 2, -st.height / 2, st.width, st.height);
        ctx.restore();
      }
    }

    // 5. Layer 4: Text Elements (HarfBuzz Typography)
    if (input.texts && input.texts.length > 0) {
      for (const t of input.texts) {
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.rotation) {
          ctx.rotate((t.rotation * Math.PI) / 180);
        }

        const fontStyle = t.isItalic ? 'italic' : 'normal';
        const fontWeight = t.isBold ? 'bold' : 'normal';
        const fontSize = t.fontSize || 32;
        const fontFamily = t.fontFamily || 'Arial, sans-serif';

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = t.fontColor || '#FFFFFF';
        ctx.textBaseline = 'top';
        ctx.fillText(t.content, 0, 0);
        ctx.restore();
      }
    }

    // 6. Ekspor Buffer dari Skia Canvas
    const skiaPngBuffer = canvas.toBuffer('image/png');

    // 7. Lab Studio Finishing dengan Sharp:
    // - Unsharp Mask penajaman cetak studio
    // - Profil warna sRGB & kompresi JPEG Q=98 4:4:4
    const printFileName = `${input.sessionId}_${designId}_300dpi.jpg`;
    const printFilePath = path.join(this.printsDir, printFileName);
    const galleryFilePath = path.join(sessionGalleryDir, `${designId}_300dpi.jpg`);
    const thumbFileName = `${designId}_thumb.webp`;
    const thumbFilePath = path.join(sessionGalleryDir, thumbFileName);

    let finalSharpJpeg: Buffer = await sharp(skiaPngBuffer)
      .sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0 }) // Studio unsharp mask
      .withMetadata({ density: 300 }) // JFIF density tag
      .jpeg({ quality: 98, chromaSubsampling: '4:4:4' })
      .toBuffer();

    // Optimasi Soft File Mutu Studio Lab (>= 1MB, 4:4:4)
    try {
      const optResult = await softFileOptimizer.optimizeSoftFile(finalSharpJpeg, 'layout_4r');
      finalSharpJpeg = optResult.buffer;
    } catch (optErr) {
      console.warn('[NativeRenderer] SoftFileOptimizer warning:', optErr);
    }

    // Simpan file ke storage lokal
    fs.writeFileSync(printFilePath, finalSharpJpeg);
    fs.writeFileSync(galleryFilePath, finalSharpJpeg);

    // Buat thumbnail cepat (WebP 400px)
    await sharp(finalSharpJpeg)
      .resize({ width: 400 })
      .webp({ quality: 85 })
      .toFile(thumbFilePath);

    const fileStat = fs.statSync(printFilePath);
    const processingTimeMs = Date.now() - startTime;

    humanLogger.info('PRINTER', `✅ Native Render Studio sukses: ${printFileName} (${Math.round(fileStat.size / 1024)} KB, ${width}x${height}px) dalam ${processingTimeMs}ms`);

    return {
      success: true,
      printFilePath,
      webUrl: `/storage/prints/${printFileName}`,
      galleryUrl: `/storage/galleries/${input.sessionId}/${designId}_300dpi.jpg`,
      thumbnailUrl: `/storage/galleries/${input.sessionId}/${thumbFileName}`,
      width,
      height,
      dpi: 300,
      sizeBytes: fileStat.size,
      processingTimeMs,
    };
  }
}

export const nativeRendererService = new NativeRendererService();
