// server/src/services/timingConfig.service.ts
// Service Pengaturan Waktu & Jadwal Sistem: Auto-Sync, Pembersihan Disk, dan Retensi Soft File

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import { cleanupService } from './cleanup.service.js';
import type { SyncQueueService } from './syncQueue.service.js';
import { humanLogger } from '../utils/humanLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SystemTimingConfig {
  syncIntervalSeconds: number;     // Frekuensi daemon cek & kirim sync (5 - 300 detik)
  cleanupIntervalHours: number;    // Jadwal pemeriksaan pembersihan disk (1 - 72 jam)
  printRetentionHours: number;     // Batas waktu simpan file cetak sementara di storage/prints (1 - 168 jam)
  galleryRetentionHours: number;   // Batas waktu retensi galeri soft file pelanggan (24 - 720 jam)
}

const DEFAULT_TIMING_CONFIG: SystemTimingConfig = {
  syncIntervalSeconds: 20,
  cleanupIntervalHours: 1,
  printRetentionHours: 24,
  galleryRetentionHours: 48,
};

export class TimingConfigService {
  private configFilePath: string;
  private currentConfig: SystemTimingConfig;
  private syncQueueService?: SyncQueueService;
  private prisma?: PrismaClient;

  constructor() {
    const storageDir = path.resolve(__dirname, '../../storage');
    try {
      fs.mkdirSync(storageDir, { recursive: true });
    } catch {}

    this.configFilePath = path.join(storageDir, 'timing-config.json');
    this.currentConfig = { ...DEFAULT_TIMING_CONFIG };
    this.loadFromDisk();
  }

  public bindServices(syncQueue: SyncQueueService, prisma?: PrismaClient): void {
    this.syncQueueService = syncQueue;
    this.prisma = prisma;
    this.applyConfig();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.currentConfig = {
          syncIntervalSeconds: Number(parsed.syncIntervalSeconds) || DEFAULT_TIMING_CONFIG.syncIntervalSeconds,
          cleanupIntervalHours: Number(parsed.cleanupIntervalHours) || DEFAULT_TIMING_CONFIG.cleanupIntervalHours,
          printRetentionHours: Number(parsed.printRetentionHours) || DEFAULT_TIMING_CONFIG.printRetentionHours,
          galleryRetentionHours: Number(parsed.galleryRetentionHours) || DEFAULT_TIMING_CONFIG.galleryRetentionHours,
        };
      } else {
        this.saveToDisk();
      }
    } catch {
      this.currentConfig = { ...DEFAULT_TIMING_CONFIG };
    }
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.currentConfig, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[TimingConfig] Gagal menyimpan timing-config.json:', err);
    }
  }

  public getConfig(): SystemTimingConfig {
    return { ...this.currentConfig };
  }

  public async updateConfig(partial: Partial<SystemTimingConfig>): Promise<SystemTimingConfig> {
    if (typeof partial.syncIntervalSeconds === 'number' && partial.syncIntervalSeconds >= 5) {
      this.currentConfig.syncIntervalSeconds = Math.min(3600, Math.floor(partial.syncIntervalSeconds));
    }
    if (typeof partial.cleanupIntervalHours === 'number' && partial.cleanupIntervalHours >= 1) {
      this.currentConfig.cleanupIntervalHours = Math.min(168, Math.floor(partial.cleanupIntervalHours));
    }
    if (typeof partial.printRetentionHours === 'number' && partial.printRetentionHours >= 1) {
      this.currentConfig.printRetentionHours = Math.min(720, Math.floor(partial.printRetentionHours));
    }
    if (typeof partial.galleryRetentionHours === 'number' && partial.galleryRetentionHours >= 1) {
      this.currentConfig.galleryRetentionHours = Math.min(720, Math.floor(partial.galleryRetentionHours));
    }

    this.saveToDisk();
    this.applyConfig();

    humanLogger.info(
      'CONFIG',
      `Pengaturan waktu diubah: Sync=${this.currentConfig.syncIntervalSeconds}s, Pembersihan=${this.currentConfig.cleanupIntervalHours}h, Retensi Cetak=${this.currentConfig.printRetentionHours}h, Retensi Galeri=${this.currentConfig.galleryRetentionHours}h`
    );

    // Update settings di database jika Prisma tersedia
    if (this.prisma) {
      try {
        const settings = await this.prisma.settings.findFirst();
        if (settings) {
          await this.prisma.settings.update({
            where: { id: settings.id },
            data: {
              retentionHours: this.currentConfig.galleryRetentionHours,
            },
          });
        }
      } catch (e) {
        // Abaikan jika database offline
      }
    }

    return this.getConfig();
  }

  private applyConfig(): void {
    // 1. Terapkan konfigurasi pembersihan disk ke CleanupService
    cleanupService.setConfig(
      this.currentConfig.printRetentionHours,
      this.currentConfig.cleanupIntervalHours
    );

    // 2. Terapkan interval sync ke SyncQueueService
    if (this.syncQueueService) {
      this.syncQueueService.setIntervalSeconds(this.currentConfig.syncIntervalSeconds);
    }
  }
}

export const timingConfigService = new TimingConfigService();
