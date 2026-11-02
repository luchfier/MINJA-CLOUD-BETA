// server/src/services/cleanup.service.ts
// Layanan Pembersihan Otomatis File Sementara & Cache Cetak
// Mencegah penumpukan file cetak di disk lokal Kiosk

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { humanLogger } from '../utils/humanLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CleanupService {
  private printsDir: string;
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.printsDir = path.resolve(__dirname, '../../storage/prints');
  }

  /**
   * Menghapus file gambar/PDF hasil cetak yang sudah melebihi batas usia
   * @param maxAgeHours Batas waktu file disimpan (default 24 jam)
   */
  public cleanOldPrintFiles(maxAgeHours = 24): { deleted: number; freedBytes: number } {
    let deletedCount = 0;
    let freedBytes = 0;

    if (!fs.existsSync(this.printsDir)) {
      return { deleted: 0, freedBytes: 0 };
    }

    try {
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      const files = fs.readdirSync(this.printsDir);

      for (const file of files) {
        const fullPath = path.join(this.printsDir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            const ageMs = now - stats.mtimeMs;
            // Hapus file kalibrasi & tes lebih cepat (2 jam), file sesi normal (24 jam)
            const threshold = file.includes('calib') || file.includes('test_') ? 2 * 3600 * 1000 : maxAgeMs;

            if (ageMs > threshold) {
              freedBytes += stats.size;
              fs.unlinkSync(fullPath);
              deletedCount++;
            }
          }
        } catch {
          // File mungkin sedang diakses proses lain
        }
      }

      if (deletedCount > 0) {
        const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
        humanLogger.cleanup(`Membersihkan ${deletedCount} file cetak sementara (${freedMB} MB ruang disk dibebaskan).`);
      }
    } catch (err) {
      humanLogger.warn('CLEANUP', `Gagal membersihkan folder storage/prints: ${err}`);
    }

    return { deleted: deletedCount, freedBytes };
  }

  private currentRetentionHours: number = 24;
  private currentIntervalHours: number = 1;

  /**
   * Mengatur konfigurasi pembersihan secara dinamis
   */
  public setConfig(retentionHours?: number, intervalHours?: number): void {
    if (typeof retentionHours === 'number' && retentionHours > 0) {
      this.currentRetentionHours = retentionHours;
    }
    if (typeof intervalHours === 'number' && intervalHours > 0) {
      this.currentIntervalHours = intervalHours;
      this.startScheduledCleanup(this.currentIntervalHours, this.currentRetentionHours);
    }
  }

  public getConfig(): { printRetentionHours: number; cleanupIntervalHours: number } {
    return {
      printRetentionHours: this.currentRetentionHours,
      cleanupIntervalHours: this.currentIntervalHours,
    };
  }

  /**
   * Memulai background scheduler pembersihan berkala
   * @param intervalHours Frekuensi pemeriksaan (default setiap 1 jam)
   * @param maxAgeHours Batas waktu file cetak disimpan (default 24 jam)
   */
  public startScheduledCleanup(intervalHours = 1, maxAgeHours = 24): void {
    this.currentIntervalHours = intervalHours;
    this.currentRetentionHours = maxAgeHours;

    // Jalankan segera saat server start atau konfigurasi diperbarui
    this.cleanOldPrintFiles(this.currentRetentionHours);

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    this.intervalTimer = setInterval(() => {
      this.cleanOldPrintFiles(this.currentRetentionHours);
    }, this.currentIntervalHours * 60 * 60 * 1000);
  }

  public stopScheduledCleanup(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

export const cleanupService = new CleanupService();
