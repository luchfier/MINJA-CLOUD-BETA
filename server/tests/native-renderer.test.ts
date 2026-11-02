// server/tests/native-renderer.test.ts
// Test suite untuk Native Windows Processing Core (Sharp + Skia Canvas)
// Sesuai PRD §4.4 & ARCHITECTURE.md §2.1

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { nativeRendererService } from '../src/services/nativeRenderer.service.js';

describe('Native Photo Processing Core (Sharp + Skia Canvas)', () => {
  it('berhasil memuat Sharp (libvips) dan Skia Canvas (@napi-rs/canvas)', () => {
    expect(sharp).toBeDefined();
    expect(sharp.versions.sharp).toBeDefined();
    expect(sharp.versions.vips).toBeDefined();
  });

  it('merender komposisi foto 300 DPI studio lab (1200x1800 px) secara headless', async () => {
    // 1. Buat 2 gambar mock sederhana (dummy buffer PNG)
    const mockPhoto1 = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 255, g: 100, b: 100 },
      },
    })
      .jpeg()
      .toBuffer();

    const mockPhoto2 = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 100, g: 150, b: 255 },
      },
    })
      .jpeg()
      .toBuffer();

    const photoBase64_1 = `data:image/jpeg;base64,${mockPhoto1.toString('base64')}`;
    const photoBase64_2 = `data:image/jpeg;base64,${mockPhoto2.toString('base64')}`;

    // 2. Eksekusi renderComposition via NativeRendererService
    const result = await nativeRendererService.renderComposition({
      sessionId: 'test_session_native',
      designId: 'test_design_1',
      template: {
        id: 'tpl-test',
        name: 'Template Uji Studio',
        width: 1200,
        height: 1800,
        slots: [
          { index: 0, x: 80, y: 100, width: 1040, height: 700, borderRadius: 16 },
          { index: 1, x: 80, y: 840, width: 1040, height: 700, borderRadius: 16 },
        ],
      },
      photoUrls: [photoBase64_1, photoBase64_2],
      filter: 'warm',
      texts: [
        {
          id: 'txt-1',
          content: 'MINJA PHOTO STUDIO',
          fontFamily: 'Arial',
          fontSize: 36,
          fontColor: '#FFFFFF',
          x: 400,
          y: 1600,
          isBold: true,
        },
      ],
    });

    // 3. Verifikasi hasil render
    expect(result.success).toBe(true);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(1800);
    expect(result.dpi).toBe(300);
    expect(fs.existsSync(result.printFilePath)).toBe(true);

    // 4. Verifikasi metadata fisik file hasil render dengan Sharp
    const metadata = await sharp(result.printFilePath).metadata();
    expect([1200, 2400, 2800]).toContain(metadata.width);
    expect([1800, 3600, 4200]).toContain(metadata.height);
    expect(metadata.format).toBe('jpeg');
    expect(metadata.density).toBe(300); // Wajib 300 DPI fisik
  });
});
