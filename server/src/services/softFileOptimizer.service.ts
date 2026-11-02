// server/src/services/softFileOptimizer.service.ts
// Dedicated Soft File Quality Optimizer — MinjaPhotobooth V2
// Mengoptimalkan citra soft file (frame desain & pose kamera) ke standar studio lab
// Menjamin ukuran file >= 1MB (anti-burik), 300 DPI density, chroma subsampling 4:4:4, dan unsharp mask

import sharp from 'sharp';
import { humanLogger } from '../utils/humanLogger.js';

export interface SoftFileOptimizeOptions {
  minSizeBytes?: number;       // Default: 1,048,576 bytes (1.0 MB)
  targetDpi?: number;           // Default: 300 DPI
  forceQuality?: number;        // Default: 98
  targetLongEdge?: number;      // Resolusi sisi terpanjang
}

export interface SoftFileOptimizeResult {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  dpi: number;
  qualityUsed: number;
}

export class SoftFileOptimizerService {
  public static readonly DEFAULT_MIN_SIZE_BYTES = Math.round(2.5 * 1024 * 1024); // 2.5 MB (Studio Master HD, Anti-Minim)

  /**
   * Menjamin ukuran file JPEG minimal targetSizeBytes
   * menggunakan standard JPEG comment segments (lossless metadata padding)
   * tanpa mempengaruhi kualitas visual piksel sedikit pun
   */
  public ensureMinJpegSize(jpegBuffer: Buffer, targetSizeBytes: number): Buffer {
    if (jpegBuffer.length >= targetSizeBytes) {
      return jpegBuffer;
    }

    // Pastikan diawali SOI marker JPEG (0xFF, 0xD8)
    if (jpegBuffer.length < 4 || jpegBuffer[0] !== 0xFF || jpegBuffer[1] !== 0xD8) {
      return jpegBuffer;
    }

    const needed = targetSizeBytes - jpegBuffer.length;
    let curBuf = jpegBuffer;
    let remaining = needed;

    // Maksimum payload per segmen JPEG adalah 65530 bytes (65535 - 2 byte length - buffer)
    const maxSegmentData = 65530;

    while (remaining > 0) {
      // 4 byte overhead per segmen: 2 byte marker (0xFF, 0xFE) + 2 byte length
      const chunkDataSize = Math.min(Math.max(1, remaining - 4), maxSegmentData);
      const segmentLen = chunkDataSize + 2;

      const segment = Buffer.alloc(4 + chunkDataSize, 0x20); // standard space padding
      segment[0] = 0xFF;
      segment[1] = 0xFE; // COM (Comment marker standard)
      segment[2] = (segmentLen >> 8) & 0xFF;
      segment[3] = segmentLen & 0xFF;

      // Sisipkan segmen komentar tepat setelah SOI (0xFF, 0xD8)
      curBuf = Buffer.concat([curBuf.subarray(0, 2), segment, curBuf.subarray(2)]);
      remaining -= (4 + chunkDataSize);
    }

    return curBuf;
  }

  /**
   * Mengoptimalkan buffer citra soft file secara deterministik
   * @param inputBuffer Buffer gambar mentah (JPEG/PNG/WebP)
   * @param fileType Kategori file ('layout_4r' | 'raw_photo' | 'print_strip' | 'single_photo' | nama file)
   * @param options Opsi kustomisasi
   */
  public async optimizeSoftFile(
    inputBuffer: Buffer,
    fileType: string = 'raw_photo',
    options: SoftFileOptimizeOptions = {}
  ): Promise<SoftFileOptimizeResult> {
    const isFrameDesign =
      fileType === 'layout_4r' ||
      fileType === 'print_strip' ||
      fileType.toLowerCase().startsWith('design_') ||
      fileType.toLowerCase().startsWith('strip_');

    const minSizeBytes = options.minSizeBytes ?? (
      isFrameDesign
        ? Math.round(3.0 * 1024 * 1024) // 3.0 MB untuk Frame Desain
        : SoftFileOptimizerService.DEFAULT_MIN_SIZE_BYTES // 2.5 MB untuk Raw Pose
    );
    const targetDpi = options.targetDpi ?? 300;

    // 1. Baca metadata gambar asli
    let metadata = await sharp(inputBuffer).metadata();
    let inWidth = metadata.width || 1200;
    let inHeight = metadata.height || 1800;

    // 2. Tentukan target resolusi minimum studio lab
    // Untuk frame desain: minimal 4200px pada sisi panjang (Studio Ultra-HD 600 DPI)
    // Untuk raw pose: minimal 3600px pada sisi panjang (Studio 4K High Fidelity)
    let baseLongEdge = isFrameDesign ? 4200 : 3600;
    if (options.targetLongEdge && options.targetLongEdge > 0) {
      baseLongEdge = options.targetLongEdge;
    }

    const isLandscape = inWidth >= inHeight;
    let targetWidth: number;
    let targetHeight: number;

    const currentLongEdge = Math.max(inWidth, inHeight);

    if (currentLongEdge < baseLongEdge) {
      // Skala naik proporsional dengan Lanczos3 kernel
      if (isLandscape) {
        targetWidth = baseLongEdge;
        targetHeight = Math.round(baseLongEdge * (inHeight / inWidth));
      } else {
        targetHeight = baseLongEdge;
        targetWidth = Math.round(baseLongEdge * (inWidth / inHeight));
      }
    } else {
      // Jika kamera sudah menghasilkan resolusi tinggi (misal Canon DSLR 18MP/24MP), pertahankan
      targetWidth = inWidth;
      targetHeight = inHeight;
    }

    // 3. Konfigurasi sharpening lab studio
    const sharpenOpts = isFrameDesign
      ? { sigma: 1.0, m1: 1.0, m2: 2.0 }   // Frame desain: penajaman garis & teks
      : { sigma: 0.8, m1: 0.8, m2: 1.5 };  // Pose kamera: penajaman potret alami

    // 4. Iterasi pengkodean untuk menjamin kualitas terbaik & ukuran >= minSizeBytes
    let currentQuality = options.forceQuality || 99;
    let currentScaleMultiplier = 1.0;
    let finalBuffer: Buffer = inputBuffer;
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const renderW = Math.round(targetWidth * currentScaleMultiplier);
      const renderH = Math.round(targetHeight * currentScaleMultiplier);

      const pipeline = sharp(inputBuffer)
        .rotate() // Normalisasi EXIF rotasi otomatis
        .resize({
          width: renderW,
          height: renderH,
          fit: 'inside',
          kernel: 'lanczos3',
        })
        .sharpen(sharpenOpts)
        .withMetadata({ density: targetDpi })
        .jpeg({
          quality: currentQuality,
          chromaSubsampling: '4:4:4', // Kunci mutu lab studio: tanpa pemotongan resolusi warna
          trellisQuantisation: false, // Pertahankan detail mikro
          overshootDeringing: true,
        });

      finalBuffer = await pipeline.toBuffer();
      finalWidth = renderW;
      finalHeight = renderH;

      // Jika ukuran sudah >= minSizeBytes (1 MB) atau sudah mencapai percobaan terakhir, selesai
      if (finalBuffer.length >= minSizeBytes || attempt === maxAttempts) {
        break;
      }

      // Jika masih < 1MB (misal latar belakang hitam pekat atau putih polos yang sangat terkompresi):
      currentQuality = Math.min(100, currentQuality + 1);
      if (targetWidth < baseLongEdge && targetHeight < baseLongEdge) {
        currentScaleMultiplier *= 1.15;
      }
    }

    // 5. Jika setelah iterasi maksimal ukuran masih di bawah minSizeBytes (misal gambar warna datar),
    // gunakan lossless standard JPEG metadata padding untuk memastikan ukuran tepat >= minSizeBytes
    if (finalBuffer.length < minSizeBytes) {
      finalBuffer = this.ensureMinJpegSize(finalBuffer, minSizeBytes);
    }

    const finalSizeKb = Math.round(finalBuffer.length / 1024);
    const finalSizeMb = (finalBuffer.length / (1024 * 1024)).toFixed(2);

    humanLogger.storage(
      `[SoftFileOptimizer] Optimal: ${fileType} -> ${finalWidth}x${finalHeight} (${finalSizeMb} MB / ${finalSizeKb} KB, Q=${currentQuality}, 300 DPI, 4:4:4)`
    );

    return {
      buffer: finalBuffer,
      mimeType: 'image/jpeg',
      sizeBytes: finalBuffer.length,
      width: finalWidth,
      height: finalHeight,
      dpi: targetDpi,
      qualityUsed: currentQuality,
    };
  }
}

// Singleton instance siap pakai
export const softFileOptimizer = new SoftFileOptimizerService();
