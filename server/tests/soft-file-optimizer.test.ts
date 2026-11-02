// server/tests/soft-file-optimizer.test.ts
// Test suite untuk SoftFileOptimizerService (Standar Mutu Studio Lab >= 1MB, 300 DPI)

import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { SoftFileOptimizerService } from '../src/services/softFileOptimizer.service.js';

describe('SoftFileOptimizerService Test Suite', () => {
  const optimizer = new SoftFileOptimizerService();

  it('1. Mengoptimalkan foto beresolusi rendah (640x480 / 98KB) menjadi berukuran >= 1MB dengan 300 DPI', async () => {
    // Buat citra tiruan 640x480
    const rawBuffer = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: 180, g: 120, b: 90 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    expect(rawBuffer.length).toBeLessThan(100 * 1024); // Kurang dari 100 KB

    const result = await optimizer.optimizeSoftFile(rawBuffer, 'pose_1.jpg', {
      minSizeBytes: 1024 * 1024,
    });

    expect(result).toBeDefined();
    expect(result.sizeBytes).toBeGreaterThanOrEqual(1024 * 1024); // Minimal 1.0 MB
    expect(result.dpi).toBe(300);
    expect(result.width).toBeGreaterThanOrEqual(1920);

    // Verifikasi metadata langsung dari file output dengan Sharp
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.density).toBe(300);
    expect(meta.chromaSubsampling).toBe('4:4:4');
  });

  it('2. Mengoptimalkan frame desain (1200x1800) menjadi Studio Ultra-HD >= 1MB', async () => {
    // Buat citra tiruan frame 1200x1800
    const frameBuffer = await sharp({
      create: {
        width: 1200,
        height: 1800,
        channels: 3,
        background: { r: 40, g: 45, b: 60 },
      },
    })
      .jpeg({ quality: 85 })
      .toBuffer();

    const result = await optimizer.optimizeSoftFile(frameBuffer, 'layout_4r', {
      minSizeBytes: 1024 * 1024,
    });

    expect(result).toBeDefined();
    expect(result.sizeBytes).toBeGreaterThanOrEqual(1024 * 1024); // Minimal 1.0 MB
    expect(result.dpi).toBe(300);
    expect(result.height).toBeGreaterThanOrEqual(3600); // Ultra-HD 600 DPI scale

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.chromaSubsampling).toBe('4:4:4');
  });

  it('3. Menjaga kualitas dan resolusi tinggi jika foto input sudah besar (Full HD / 4K)', async () => {
    const highResBuffer = await sharp({
      create: {
        width: 3840,
        height: 2160,
        channels: 3,
        background: { r: 90, g: 140, b: 200 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const result = await optimizer.optimizeSoftFile(highResBuffer, 'pose_dslr.jpg');

    expect(result.sizeBytes).toBeGreaterThanOrEqual(1024 * 1024);
    expect(result.width).toBe(3840);
    expect(result.height).toBe(2160);
  });
});
