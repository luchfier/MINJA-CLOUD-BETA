// server/src/services/photoProcessor.service.ts
// Raw Camera Photo Processor — MinjaPhotobooth V2
// Dijalankan segera setelah capture dari kamera (browser canvas JPEG)
// Pipeline: EXIF rotate → Lanczos3 resize (2560px long edge) → unsharp mask potret → JPEG 4:4:4 300 DPI

import sharp from 'sharp';
import { humanLogger } from '../utils/humanLogger.js';

export interface ProcessedCameraPhoto {
  buffer: Buffer;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  processingMs: number;
}

// Target panjang sisi terpanjang untuk foto kamera (2560px = 2.5K, cukup untuk cetak 4R @ 300 DPI)
const TARGET_LONG_EDGE_PX = 2560;

// JPEG quality output untuk foto kamera mentah
const OUTPUT_QUALITY = 95;

// Unsharp mask parameter untuk potret kamera
const PORTRAIT_SHARPEN = { sigma: 0.8, m1: 0.8, m2: 1.5 };

class PhotoProcessorService {
  /**
   * Memproses buffer JPEG mentah dari browser canvas:
   * 1. Normalisasi EXIF rotation otomatis
   * 2. Resize Lanczos3 ke sisi panjang 2560px (scale up jika perlu, pertahankan jika sudah besar)
   * 3. Unsharp mask potret natural
   * 4. Output JPEG 4:4:4 chroma (mutu warna lab) + metadata 300 DPI
   */
  async processRawCapture(inputBuffer: Buffer): Promise<ProcessedCameraPhoto> {
    const startMs = Date.now();

    // Baca metadata untuk dapatkan dimensi asli
    const meta = await sharp(inputBuffer).metadata();
    const origW = meta.width ?? 1920;
    const origH = meta.height ?? 1080;

    // Tentukan target resize proporsional
    const currentLongEdge = Math.max(origW, origH);
    let targetWidth: number;
    let targetHeight: number;

    if (currentLongEdge >= TARGET_LONG_EDGE_PX) {
      // Sudah cukup besar (misal Canon DSLR 24MP, Full HD 1080p) — pertahankan dimensi asli
      targetWidth = origW;
      targetHeight = origH;
    } else {
      // Scale up proporsional dengan Lanczos3 ke TARGET_LONG_EDGE_PX
      const scale = TARGET_LONG_EDGE_PX / currentLongEdge;
      targetWidth = Math.round(origW * scale);
      targetHeight = Math.round(origH * scale);
    }

    const outputBuffer = await sharp(inputBuffer)
      .rotate() // Normalisasi EXIF rotation (Canon EOS, smartphone via virtual cam)
      .resize({
        width: targetWidth,
        height: targetHeight,
        fit: 'inside',
        kernel: 'lanczos3',
        withoutEnlargement: false,
      })
      .sharpen(PORTRAIT_SHARPEN)
      .withMetadata({ density: 300 })
      .jpeg({
        quality: OUTPUT_QUALITY,
        chromaSubsampling: '4:4:4',
        trellisQuantisation: false,
        overshootDeringing: true,
        mozjpeg: false,
      })
      .toBuffer();

    const processingMs = Date.now() - startMs;
    const sizeMb = (outputBuffer.length / 1024 / 1024).toFixed(2);

    humanLogger.storage(
      `[PhotoProcessor] ${origW}x${origH} → ${targetWidth}x${targetHeight} | ${sizeMb} MB | ${processingMs}ms | 300 DPI`
    );

    return {
      buffer: outputBuffer,
      mimeType: 'image/jpeg',
      width: targetWidth,
      height: targetHeight,
      originalWidth: origW,
      originalHeight: origH,
      processingMs,
    };
  }
}

export const photoProcessorService = new PhotoProcessorService();
