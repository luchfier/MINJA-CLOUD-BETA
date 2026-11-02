// server/tests/live-photo.test.ts
// Test suite untuk Live Photo Transcoder & Dedicated FFmpeg Compositor (Model A)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { livePhotoTranscoder } from '../src/services/livePhotoTranscoder.service.js';

process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:5432/minjaphotobooth';
process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars-long';
process.env['BOOTH_API_KEY'] = 'test-booth-key';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

let app: FastifyInstance;

describe('Live Photo Transcoder & Model A Compositing Suite', () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testSessionId = `test_live_session_${Date.now()}`;

  it('1. Verifikasi ketersediaan engine FFmpeg dengan codec libx264', async () => {
    const status = await livePhotoTranscoder.checkAvailability();
    expect(status.available).toBe(true);
    expect(status.path).toBeDefined();
    expect(status.path.length).toBeGreaterThan(0);
  });

  it('2. POST /api/sessions/:sessionId/live-photo/compose menolak akses tanpa booth authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/sessions/${testSessionId}/live-photo/compose`,
      payload: {
        slots: [],
        frameOverlayDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('3. POST /api/sessions/:sessionId/live-photo/compose memvalidasi schema input Zod', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/sessions/${testSessionId}/live-photo/compose`,
      headers: {
        'x-booth-key': 'test-booth-key',
      },
      payload: {
        // payload tidak lengkap (tanpa frameOverlayDataUrl dan slots)
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('4. composeLiveFrame menangani graceful error saat slot video kosong atau tidak valid', async () => {
    const result = await livePhotoTranscoder.composeLiveFrame(
      testSessionId,
      [
        {
          slotIndex: 0,
          x: 0,
          y: 0,
          width: 500,
          height: 700,
          videoDataUrlOrBase64: '',
        },
      ],
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('5. storageService mengklasifikasikan layout_live_4r.mp4 sebagai live_video (bukan layout_4r)', async () => {
    const { storageService } = await import('../src/services/storage.service.js');
    const fs = await import('node:fs');
    const path = await import('node:path');

    const mockSession = `test_class_${Date.now()}`;
    const mockDir = path.join(storageService.getBaseDir(), mockSession);
    fs.mkdirSync(mockDir, { recursive: true });

    try {
      // Buat file dummy simulasi: 1 foto frame, 1 video live native mp4, 1 webm lama
      fs.writeFileSync(path.join(mockDir, 'design-1.jpg'), Buffer.alloc(500, 1));
      fs.writeFileSync(path.join(mockDir, 'layout_live_4r.mp4'), Buffer.alloc(1000, 2));
      fs.writeFileSync(path.join(mockDir, 'live-motion.webm'), Buffer.alloc(800, 3));

      const items = await storageService.listSessionGalleryItems(mockSession);

      const mp4Item = items.find((i) => i.fileName === 'layout_live_4r.mp4');
      const frameItem = items.find((i) => i.fileName === 'design-1.jpg');
      const webmItem = items.find((i) => i.fileName === 'live-motion.webm');

      // layout_live_4r.mp4 WAJIB menjadi live_video, bukan layout_4r!
      expect(mp4Item).toBeDefined();
      expect(mp4Item?.fileType).toBe('live_video');
      expect(mp4Item?.label).toBe('Live Motion');

      // design-1.jpg adalah layout_4r (Photo Frame)
      expect(frameItem).toBeDefined();
      expect(frameItem?.fileType).toBe('layout_4r');

      // webmItem harus otomatis diexclude saat native mp4 ada
      expect(webmItem).toBeUndefined();
    } finally {
      fs.rmSync(mockDir, { recursive: true, force: true });
    }
  });

  it('6. POST /api/sessions/:sessionId/slideshow/compose menolak tanpa booth auth dan memvalidasi schema', async () => {
    // Tanpa auth
    const unauthRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${testSessionId}/slideshow/compose`,
      payload: { photos: ['data:image/jpeg;base64,123456'] },
    });
    expect(unauthRes.statusCode).toBe(401);

    // Dengan auth tapi foto kosong
    const emptyRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${testSessionId}/slideshow/compose`,
      headers: { 'x-booth-key': 'test-booth-key' },
      payload: { photos: [] },
    });
    expect(emptyRes.statusCode).toBe(400);
  });

  it('7. composeSlideshowVideo berhasil menghasilkan slideshow.mp4 (Vertical 9:16 Beat Cut)', async () => {
    const sharp = (await import('sharp')).default;
    const { storageService } = await import('../src/services/storage.service.js');
    const path = await import('node:path');
    const fs = await import('node:fs');

    const slideSession = `test_slide_${Date.now()}`;
    const baseDir = storageService.getBaseDir();
    const sessionFolder = path.join(baseDir, slideSession);
    fs.mkdirSync(sessionFolder, { recursive: true });

    try {
      // Buat 3 dummy buffer JPEG warna
      const photosBase64: string[] = [];
      const colors = ['#dc2626', '#2563eb', '#16a34a'];
      for (const c of colors) {
        const buf = await sharp({
          create: { width: 640, height: 480, channels: 3, background: c },
        })
          .jpeg()
          .toBuffer();
        photosBase64.push(`data:image/jpeg;base64,${buf.toString('base64')}`);
      }

      const res = await livePhotoTranscoder.composeSlideshowVideo(slideSession, photosBase64, {
        outputWidth: 540,
        outputHeight: 960,
        durationPerPhotoSec: 0.5,
      });

      expect(res.success).toBe(true);
      expect(res.fileName).toBe('slideshow.mp4');
      expect(res.width).toBe(540);
      expect(res.height).toBe(960);
      expect(res.sizeBytes).toBeGreaterThan(1000);
      expect(fs.existsSync(res.filePath)).toBe(true);

      // Pastikan storageService mengenali slideshow.mp4 dengan label 'Video Slideshow'
      const items = await storageService.listSessionGalleryItems(slideSession);
      const slideItem = items.find((i) => i.fileName === 'slideshow.mp4');
      expect(slideItem).toBeDefined();
      expect(slideItem?.fileType).toBe('live_video');
      expect(slideItem?.label).toBe('Video Slideshow');
    } finally {
      if (fs.existsSync(sessionFolder)) {
        fs.rmSync(sessionFolder, { recursive: true, force: true });
      }
    }
  });

  it('8. storageService mendukung multi-frame live video (layout_live_1.mp4, layout_live_2.mp4, slideshow.mp4) secara simultan', async () => {
    const { storageService } = await import('../src/services/storage.service.js');
    const fs = await import('node:fs');
    const path = await import('node:path');

    const multiSession = `test_multilive_${Date.now()}`;
    const multiDir = path.join(storageService.getBaseDir(), multiSession);
    fs.mkdirSync(multiDir, { recursive: true });

    try {
      // Simulasikan output dari 2 frame berbeda + 1 video slideshow
      fs.writeFileSync(path.join(multiDir, 'design_1.jpg'), Buffer.alloc(1000, 1));
      fs.writeFileSync(path.join(multiDir, 'design_2.jpg'), Buffer.alloc(1000, 2));
      fs.writeFileSync(path.join(multiDir, 'layout_live_1.mp4'), Buffer.alloc(2000, 3));
      fs.writeFileSync(path.join(multiDir, 'layout_live_2.mp4'), Buffer.alloc(2000, 4));
      fs.writeFileSync(path.join(multiDir, 'slideshow.mp4'), Buffer.alloc(2500, 5));

      const items = await storageService.listSessionGalleryItems(multiSession);

      const live1 = items.find((i) => i.fileName === 'layout_live_1.mp4');
      const live2 = items.find((i) => i.fileName === 'layout_live_2.mp4');
      const slide = items.find((i) => i.fileName === 'slideshow.mp4');
      const frame1 = items.find((i) => i.fileName === 'design_1.jpg');
      const frame2 = items.find((i) => i.fileName === 'design_2.jpg');

      // Seluruh live frame harus terdaftar tanpa saling menimpa
      expect(live1).toBeDefined();
      expect(live1?.fileType).toBe('live_video');

      expect(live2).toBeDefined();
      expect(live2?.fileType).toBe('live_video');

      expect(slide).toBeDefined();
      expect(slide?.fileType).toBe('live_video');
      expect(slide?.label).toBe('Video Slideshow');

      expect(frame1).toBeDefined();
      expect(frame2).toBeDefined();

      const liveVideos = items.filter((i) => i.fileType === 'live_video');
      expect(liveVideos.length).toBe(3);
    } finally {
      if (fs.existsSync(multiDir)) {
        fs.rmSync(multiDir, { recursive: true, force: true });
      }
    }
  });
});


