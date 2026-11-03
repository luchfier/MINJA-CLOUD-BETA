// server/src/services/kioskHeartbeat.service.ts
// Heartbeat Daemon untuk Komputer Booth Fisik (Windows)
// Mengirimkan telemetri status hardware ke Cloud VPS setiap 15 detik
// Menerima instruksi Remote Lockout secara real-time dari Owner Portal

import type { PrismaClient } from '@prisma/client';
import { getEnv } from '../config/env.js';
import { OwnerService } from './owner.service.js';
import { PrintService } from './print.service.js';
import { humanLogger } from '../utils/humanLogger.js';

export class KioskHeartbeatService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private consecutiveFailures = 0;
  private printService: PrintService;

  constructor(private prisma: PrismaClient, printService?: PrintService) {
    this.printService = printService || new PrintService(prisma);
  }

  /**
   * Memulai daemon heartbeat jika BOOTH_API_KEY terkonfigurasi
   */
  public start(intervalMs = 15000): void {
    const env = getEnv();
    if (!env.BOOTH_API_KEY || env.BOOTH_API_KEY === 'dev-booth-key-for-testing') {
      humanLogger.info('HEARTBEAT', 'BOOTH_API_KEY belum dikonfigurasi unik. Mode standalone offline aktif.');
      return;
    }

    if (this.isRunning) return;
    this.isRunning = true;

    humanLogger.success('HEARTBEAT', `Kiosk Heartbeat Daemon aktif (Interval: ${Math.round(intervalMs / 1000)} detik).`);

    // Jalankan satu kali segera saat startup
    this.sendHeartbeat().catch(() => {});

    this.timer = setInterval(() => {
      this.sendHeartbeat().catch(() => {});
    }, intervalMs);
  }

  /**
   * Menghentikan daemon saat shutdown aplikasi
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Mengirim satu payload heartbeat ke Cloud API
   */
  public async sendHeartbeat(): Promise<void> {
    const env = getEnv();
    const apiKey = env.BOOTH_API_KEY;
    if (!apiKey) return;

    // Tentukan URL target cloud (saat dev lokal arahkan ke backend lokal agar tidak gagal 404 ke cloud eksternal)
    let baseUrl = env.GALLERY_BASE_URL || 'http://localhost:3000';
    if (env.NODE_ENV === 'development' && baseUrl.includes('minja.my.id')) {
      baseUrl = `http://localhost:${env.PORT || 3000}`;
    }
    const endpoint = `${baseUrl.replace(/\/$/, '')}/api/kiosk/heartbeat`;

    try {
      // Ambil estimasi kertas dan status lokal
      const settings = await this.prisma.settings.findFirst();
      const currentMaintenance = settings?.maintenanceMode || false;

      // Hitung sisa kertas berdasarkan cetakan hari ini
      // Ambil sisa kertas aktual dari data booth lokal agar penyesuaian manual tidak ditimpa
      const currentKiosk = await this.prisma.kiosk.findFirst({
        where: { apiKey },
        select: { paperRemaining: true },
      });
      const paperRemaining = currentKiosk ? currentKiosk.paperRemaining : 400;

      const payload = {
        status: currentMaintenance ? 'MAINTENANCE' : 'ONLINE',
        paperRemaining,
        printerStatus: 'READY',
        cameraStatus: 'READY',
        appVersion: '2.0.0',
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Booth-Key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000), // Timeout 8 detik
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          humanLogger.warn('HEARTBEAT', `Kunci lisensi booth ditolak server pusat (HTTP ${response.status}). Kiosk dinonaktifkan.`);
          OwnerService.currentMaintenanceReason = 'Kunci lisensi booth tidak terdaftar atau telah dinonaktifkan oleh Administrator.';
          if (settings && !settings.maintenanceMode) {
            await this.prisma.settings.update({
              where: { id: settings.id },
              data: { maintenanceMode: true },
            });
          }
        }
        this.consecutiveFailures++;
        if (this.consecutiveFailures === 1 || this.consecutiveFailures % 20 === 0) {
          humanLogger.info('HEARTBEAT', `Telemetri cloud standby (${endpoint}): HTTP ${response.status}.`);
        }
        return;
      }

      const resJson: any = await response.json();
      this.consecutiveFailures = 0;

      if (resJson.success && resJson.data) {
        const { isLocked, lockReason, pendingPrintCommands } = resJson.data;

        // Tangani perintah cetak ulang darurat (Emergency Reprint) dari Cloud / Operator Portal
        if (Array.isArray(pendingPrintCommands) && pendingPrintCommands.length > 0) {
          for (const cmd of pendingPrintCommands) {
            humanLogger.warn(
              'REMOTE_REPRINT',
              `Menerima perintah Cetak Ulang dari Operator (${cmd.requestedBy || 'Kasir'}) untuk Sesi: ${cmd.sessionId} (${cmd.copies} lembar) [Alasan: "${cmd.reason}"]`
            );
            try {
              const reprintRes = await this.printService.reprintJob({
                sessionId: cmd.sessionId,
                copies: cmd.copies || 1,
                reason: cmd.reason || `Remote reprint oleh ${cmd.requestedBy || 'Kasir'}`,
              });
              humanLogger.success(
                'REMOTE_REPRINT',
                `✅ Perintah Cetak Ulang Sesi ${cmd.sessionId} berhasil dieksekusi ke printer! (${reprintRes.message})`
              );
            } catch (printErr: any) {
              console.error(`[KioskHeartbeat] Gagal mengeksekusi reprint sesi ${cmd.sessionId}:`, printErr);
            }
          }
        }

        // Sinkronkan status lock dari cloud ke mesin booth lokal
        if (isLocked && !currentMaintenance) {
          humanLogger.warn('HEARTBEAT', `Menerima perintah KUNCI BOOTH dari Owner: "${lockReason || 'Maintenance'}"`);
          OwnerService.currentMaintenanceReason = lockReason || 'Pengisian ulang kertas / pemeliharaan berkala';

          if (settings) {
            await this.prisma.settings.update({
              where: { id: settings.id },
              data: { maintenanceMode: true },
            });
          }
        } else if (!isLocked && currentMaintenance) {
          humanLogger.success('HEARTBEAT', 'Menerima perintah BUKA KUNCI BOOTH dari Owner. Mengembalikan mode normal.');
          if (settings) {
            await this.prisma.settings.update({
              where: { id: settings.id },
              data: { maintenanceMode: false },
            });
          }
        }
      }
    } catch {
      this.consecutiveFailures++;
      // Tidak log error setiap 15 detik agar console tidak berisik saat offline
    }
  }
}
