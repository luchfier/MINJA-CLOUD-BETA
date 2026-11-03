import fs from 'node:fs';
import path from 'node:path';
import { StorageService, SessionGalleryItem } from './storage.service.js';

export type StepProgressStatus = 'done' | 'processing' | 'waiting';

export interface GalleryStepDetail {
  status: StepProgressStatus;
  label: string;
  count: number;
}

export interface GalleryProgressReport {
  sessionId: string;
  status: 'processing' | 'ready';
  progressPercent: number; // 15 s/d 100
  totalFilesReceived: number;
  currentPhaseLabel: string;
  message: string;
  steps: {
    studioPhotos: GalleryStepDetail;
    frameLayouts: GalleryStepDetail;
    liveVideo: GalleryStepDetail;
  };
  items: SessionGalleryItem[];
}

export class GalleryProgressEngine {
  constructor(private storageService: StorageService = new StorageService()) {}

  /**
   * Menghitung status progres nyata dari sesi berdasarkan file yang ada di storage
   * Dilengkapi Smart Grace Period (Anti-Hang): Jika frame foto sudah mendarat di storage,
   * sistem memberi toleransi wajar untuk video tiba sebelum otomatis beralih ke 'ready',
   * sehingga pelanggan tidak akan pernah terkunci di layar loading.
   */
  public async computeSessionProgress(
    sessionId: string,
    sessionCreatedAt?: Date | string | null
  ): Promise<GalleryProgressReport> {
    const items = await this.storageService.listSessionGalleryItems(sessionId);

    const rawPhotos = items.filter((it) => it.fileType === 'raw_photo');
    const frames = items.filter((it) => it.fileType === 'layout_4r');
    const videos = items.filter((it) => it.fileType === 'live_video');

    const hasPhotos = rawPhotos.length > 0;
    const hasFrames = frames.length > 0;
    const hasVideos = videos.length > 0;

    // Hitung usia sesi sejak token galeri dibuat atau sejak file pertama mendarat
    let sessionAgeMs = sessionCreatedAt
      ? Math.max(0, Date.now() - new Date(sessionCreatedAt).getTime())
      : 0;

    // Fallback usia dari mtime file fisik jika sessionCreatedAt tidak dipasok
    if (sessionAgeMs === 0) {
      try {
        const sessionDir = path.join(this.storageService.getBaseDir(), sessionId);
        if (fs.existsSync(sessionDir)) {
          const files = fs.readdirSync(sessionDir);
          const mtimes = files
            .map((f) => {
              try {
                return fs.statSync(path.join(sessionDir, f)).mtimeMs;
              } catch {
                return 0;
              }
            })
            .filter((m) => m > 0);
          if (mtimes.length > 0) {
            sessionAgeMs = Math.max(0, Date.now() - Math.min(...mtimes));
          }
        }
      } catch {}
    }

    // Grace period video & rendering: 45 detik (memberi waktu aman bagi booth untuk transcode & upload)
    const isVideoGracePeriodPassed = sessionAgeMs >= 45000;

    // Skenario 1: Belum ada file yang terunggah sama sekali
    if (items.length === 0) {
      return {
        sessionId,
        status: 'processing',
        progressPercent: 20,
        totalFilesReceived: 0,
        currentPhaseLabel: 'Menyiapkan Foto',
        message: 'Kiosk photobooth sedang memproses foto dan video kamu...',
        steps: {
          studioPhotos: {
            status: 'processing',
            label: 'Lagi disiapin...',
            count: 0,
          },
          frameLayouts: {
            status: 'waiting',
            label: 'Menunggu foto...',
            count: 0,
          },
          liveVideo: {
            status: 'waiting',
            label: 'Menunggu giliran...',
            count: 0,
          },
        },
        items: [],
      };
    }

    // Skenario 2: Foto studio sudah masuk, namun bingkai belum ada
    if (hasPhotos && !hasFrames && !hasVideos && !isVideoGracePeriodPassed) {
      const photoBonus = Math.min(rawPhotos.length * 5, 20);
      return {
        sessionId,
        status: 'processing',
        progressPercent: 45 + photoBonus,
        totalFilesReceived: items.length,
        currentPhaseLabel: 'Memasang Bingkai',
        message: 'Foto studio berhasil masuk! Sedang menyusun bingkai cetak...',
        steps: {
          studioPhotos: {
            status: 'done',
            label: 'Beres ✨',
            count: rawPhotos.length,
          },
          frameLayouts: {
            status: 'processing',
            label: 'Lagi dipasang...',
            count: 0,
          },
          liveVideo: {
            status: 'waiting',
            label: 'Menunggu...',
            count: 0,
          },
        },
        items,
      };
    }

    // Skenario 3: Bingkai sudah ada, sedang menunggu video transcode (dalam batas grace period 45 detik)
    if (hasFrames && !hasVideos && !isVideoGracePeriodPassed) {
      return {
        sessionId,
        status: 'processing',
        progressPercent: 78,
        totalFilesReceived: items.length,
        currentPhaseLabel: 'Tahap Akhir',
        message: 'Foto dan bingkai siap! Sedang merender klip video momen seru...',
        steps: {
          studioPhotos: {
            status: hasPhotos ? 'done' : 'processing',
            label: hasPhotos ? 'Beres ✨' : 'Lagi diproses...',
            count: rawPhotos.length,
          },
          frameLayouts: {
            status: hasFrames ? 'done' : 'processing',
            label: hasFrames ? 'Beres ✨' : 'Lagi dipasang...',
            count: frames.length,
          },
          liveVideo: {
            status: 'processing',
            label: 'Lagi disiapin ⏳',
            count: 0,
          },
        },
        items,
      };
    }

    // Skenario 4: Siap Diunduh!
    // Baik karena video sudah lengkap, ATAU karena frame cetak sudah ada dan grace period video telah lewat.
    return {
      sessionId,
      status: 'ready',
      progressPercent: 100,
      totalFilesReceived: items.length,
      currentPhaseLabel: 'Siap Diunduh',
      message: hasVideos
        ? 'Seluruh foto studio, bingkai cetak, dan klip video siap diunduh!'
        : 'Foto studio dan bingkai cetak siap diunduh!',
      steps: {
        studioPhotos: {
          status: 'done',
          label: 'Beres ✨',
          count: rawPhotos.length,
        },
        frameLayouts: {
          status: 'done',
          label: 'Beres ✨',
          count: frames.length,
        },
        liveVideo: {
          status: hasVideos ? 'done' : 'waiting',
          label: hasVideos ? 'Beres ✨' : 'Segera hadir ⏳',
          count: videos.length,
        },
      },
      items,
    };
  }
}
