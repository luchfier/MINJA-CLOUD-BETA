// minja-cloud/server/tests/gallery-progress-engine.test.ts
// Unit Tests untuk Dedicated GalleryProgressEngine

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalleryProgressEngine } from '../src/services/galleryProgressEngine.service.js';
import { StorageService, SessionGalleryItem } from '../src/services/storage.service.js';

describe('GalleryProgressEngine Unit Test Suite', () => {
  let storageService: StorageService;
  let engine: GalleryProgressEngine;

  beforeEach(() => {
    storageService = new StorageService();
    engine = new GalleryProgressEngine(storageService);
  });

  it('1. Returns 20% processing when no files have landed yet', async () => {
    vi.spyOn(storageService, 'listSessionGalleryItems').mockResolvedValueOnce([]);

    const report = await engine.computeSessionProgress('test_session_empty');

    expect(report.status).toBe('processing');
    expect(report.progressPercent).toBe(20);
    expect(report.totalFilesReceived).toBe(0);
    expect(report.steps.studioPhotos.status).toBe('processing');
    expect(report.steps.frameLayouts.status).toBe('waiting');
    expect(report.steps.liveVideo.status).toBe('waiting');
    expect(report.currentPhaseLabel).toBe('Menyiapkan Foto');
  });

  it('2. Returns ~50-65% processing when raw studio photos are uploaded, waiting for frames', async () => {
    const mockItems: SessionGalleryItem[] = [
      { id: '1', fileName: 'pose_1.jpg', fileType: 'raw_photo', url: '/p1', sizeBytes: 1000 },
      { id: '2', fileName: 'pose_2.jpg', fileType: 'raw_photo', url: '/p2', sizeBytes: 1000 },
    ];
    vi.spyOn(storageService, 'listSessionGalleryItems').mockResolvedValueOnce(mockItems);

    const report = await engine.computeSessionProgress('test_session_photos_only');

    expect(report.status).toBe('processing');
    expect(report.progressPercent).toBeGreaterThanOrEqual(50);
    expect(report.steps.studioPhotos.status).toBe('done');
    expect(report.steps.studioPhotos.count).toBe(2);
    expect(report.steps.frameLayouts.status).toBe('processing');
    expect(report.steps.liveVideo.status).toBe('waiting');
    expect(report.currentPhaseLabel).toBe('Memasang Bingkai');
  });

  it('3. Returns 78% processing when photos and frame layouts are ready, waiting for video transcode', async () => {
    const mockItems: SessionGalleryItem[] = [
      { id: '1', fileName: 'pose_1.jpg', fileType: 'raw_photo', url: '/p1', sizeBytes: 1000 },
      { id: '2', fileName: 'strip_final.jpg', fileType: 'layout_4r', url: '/s1', sizeBytes: 2000 },
    ];
    vi.spyOn(storageService, 'listSessionGalleryItems').mockResolvedValueOnce(mockItems);

    const report = await engine.computeSessionProgress('test_session_waiting_video');

    expect(report.status).toBe('processing');
    expect(report.progressPercent).toBe(78);
    expect(report.steps.studioPhotos.status).toBe('done');
    expect(report.steps.frameLayouts.status).toBe('done');
    expect(report.steps.liveVideo.status).toBe('processing');
    expect(report.currentPhaseLabel).toBe('Tahap Akhir');
  });

  it('4. Returns 100% ready when all assets including live video arrive', async () => {
    const mockItems: SessionGalleryItem[] = [
      { id: '1', fileName: 'pose_1.jpg', fileType: 'raw_photo', url: '/p1', sizeBytes: 1000 },
      { id: '2', fileName: 'strip_final.jpg', fileType: 'layout_4r', url: '/s1', sizeBytes: 2000 },
      { id: '3', fileName: 'motion.mp4', fileType: 'live_video', url: '/v1', sizeBytes: 5000 },
    ];
    vi.spyOn(storageService, 'listSessionGalleryItems').mockResolvedValueOnce(mockItems);

    const report = await engine.computeSessionProgress('test_session_all_ready');

    expect(report.status).toBe('ready');
    expect(report.progressPercent).toBe(100);
    expect(report.steps.studioPhotos.status).toBe('done');
    expect(report.steps.frameLayouts.status).toBe('done');
    expect(report.steps.liveVideo.status).toBe('done');
    expect(report.currentPhaseLabel).toBe('Siap Diunduh');
    expect(report.items.length).toBe(3);
  });

  it('5. Auto-completes to ready after grace period (12s) when frame layouts are ready even if video is delayed', async () => {
    const mockItems: SessionGalleryItem[] = [
      { id: '1', fileName: 'pose_1.jpg', fileType: 'raw_photo', url: '/p1', sizeBytes: 1000 },
      { id: '2', fileName: 'strip_final.jpg', fileType: 'layout_4r', url: '/s1', sizeBytes: 2000 },
    ];
    vi.spyOn(storageService, 'listSessionGalleryItems').mockResolvedValueOnce(mockItems);

    // Simulasikan sesi dibuat 15 detik yang lalu
    const oldCreatedAt = new Date(Date.now() - 15000);
    const report = await engine.computeSessionProgress('test_session_grace_period', oldCreatedAt);

    expect(report.status).toBe('ready');
    expect(report.progressPercent).toBe(100);
    expect(report.steps.frameLayouts.status).toBe('done');
    expect(report.currentPhaseLabel).toBe('Siap Diunduh');
  });
});
