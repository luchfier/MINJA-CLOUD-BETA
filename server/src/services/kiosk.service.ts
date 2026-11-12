// server/src/services/kiosk.service.ts
// Layanan Pengelolaan Armada Multi-Kiosk (Control Tower)
// Mengelola pendaftaran booth, API key unik per mesin, heartbeat telemetri, dan remote lock

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, KioskStatus } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import { getEnv } from '../config/env.js';
import { humanLogger } from '../utils/humanLogger.js';
import { calculateWibDateRange } from './partner.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUEUE_FILE = path.resolve(__dirname, '../../storage/pending-print-commands.json');

export interface CreateKioskDTO {
  name: string;
  location: string;
  code?: string;
  paperRollCapacity?: number;
  partnerId?: string | null;
}

export interface UpdateKioskDTO {
  name?: string;
  location?: string;
  paperRollCapacity?: number;
  partnerId?: string | null;
}

export interface HeartbeatPayload {
  status?: KioskStatus;
  paperRemaining?: number;
  printerStatus?: string;
  cameraStatus?: string;
  appVersion?: string;
  activeSessionId?: string;
  hardwareId?: string;
}

export interface PendingPrintCommand {
  id: string;
  sessionId: string;
  copies: number;
  reason: string;
  requestedBy: string;
  createdAt: string;
  layoutImageUrl?: string;
}

export interface KioskItemDto {
  id: string;
  code: string;
  name: string;
  location: string;
  apiKey: string;
  hardwareId: string | null;
  status: KioskStatus;
  paperRemaining: number;
  paperRollCapacity: number;
  paperTrackingEnabled?: boolean;
  printerStatus: string | null;
  cameraStatus: string | null;
  isLocked: boolean;
  lockReason: string | null;
  lastHeartbeat: string | null;
  ipAddress: string | null;
  appVersion: string | null;
  createdAt: string;
  updatedAt: string;
  todayRevenue: number;
  todaySessionsCount: number;
}

export class KioskService {
  // Antrean perintah cetak jarak jauh per booth (Remote Print Dispatch - Persisten Disk & RAM)
  private static pendingPrintCommands = new Map<string, PendingPrintCommand[]>();
  private static isQueueInitialized = false;

  private static initQueue(): void {
    if (KioskService.isQueueInitialized) return;
    KioskService.isQueueInitialized = true;
    try {
      if (fs.existsSync(QUEUE_FILE)) {
        const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          for (const [k, v] of Object.entries(data)) {
            if (Array.isArray(v)) {
              KioskService.pendingPrintCommands.set(k, v);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private static saveQueueToDisk(): void {
    try {
      const obj: Record<string, PendingPrintCommand[]> = {};
      for (const [k, v] of KioskService.pendingPrintCommands.entries()) {
        if (v && v.length > 0) {
          obj[k] = v;
        }
      }
      const dir = path.dirname(QUEUE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  public static queuePrintCommand(kioskId: string, cmd: PendingPrintCommand): void {
    KioskService.initQueue();
    const existing = KioskService.pendingPrintCommands.get(kioskId) || [];
    existing.push(cmd);
    KioskService.pendingPrintCommands.set(kioskId, existing);
    KioskService.saveQueueToDisk();
    humanLogger.info('REMOTE_PRINT_QUEUE', `Perintah cetak didaftarkan untuk booth ${kioskId}: Sesi ${cmd.sessionId} (${cmd.copies} lembar)`);
  }

  public static popPrintCommands(kioskId: string): PendingPrintCommand[] {
    KioskService.initQueue();
    const cmds = KioskService.pendingPrintCommands.get(kioskId) || [];
    if (cmds.length > 0) {
      KioskService.pendingPrintCommands.delete(kioskId);
      KioskService.saveQueueToDisk();
    }
    return cmds;
  }

  constructor(private prisma: PrismaClient) {}

  /**
   * Menghasilkan API Key unik dan aman untuk komputer booth
   * Format: mja_kiosk_live_[32 karakter hex]
   */
  public generateApiKey(): string {
    return `mja_kiosk_live_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Mengambil daftar seluruh mesin booth beserta telemetri dan omzet hari ini (Batch GroupBy & Presisi WIB UTC+7)
   */
  async listKiosks(): Promise<KioskItemDto[]> {
    const kiosks = await this.prisma.kiosk.findMany({
      orderBy: { code: 'asc' },
    });

    const now = Date.now();
    const { rangeStart: startOfToday } = calculateWibDateRange('today');
    const kioskIds = kiosks.map((k) => k.id);

    // BATCH QUERY AGGREGATION: 1 query tunggal menggantikan N+1 sequential loop
    const todayAggregates = kioskIds.length > 0
      ? await this.prisma.session.groupBy({
          by: ['kioskId'],
          where: {
            kioskId: { in: kioskIds },
            createdAt: { gte: startOfToday },
            state: 'COMPLETED',
          },
          _count: { id: true },
          _sum: { totalPrice: true },
        })
      : [];

    const aggMap = new Map<string, { count: number; revenue: number }>();
    for (const agg of todayAggregates) {
      if (agg.kioskId) {
        aggMap.set(agg.kioskId, {
          count: agg._count.id || 0,
          revenue: agg._sum.totalPrice || 0,
        });
      }
    }

    const result: KioskItemDto[] = [];

    for (const kiosk of kiosks) {
      // Evaluasi status online dinamis (jika heartbeat > 4 menit, tandai OFFLINE — menyesuaikan throttle DB write 3 menit)
      let effectiveStatus = kiosk.status;
      if (kiosk.isLocked) {
        effectiveStatus = KioskStatus.MAINTENANCE;
      } else if (!kiosk.lastHeartbeat || now - new Date(kiosk.lastHeartbeat).getTime() > 240000) {
        effectiveStatus = KioskStatus.OFFLINE;
      }

      const agg = aggMap.get(kiosk.id) || { count: 0, revenue: 0 };
      const todaySessionsCount = agg.count;
      const todayRevenue = agg.revenue;

      result.push({
        id: kiosk.id,
        code: kiosk.code,
        name: kiosk.name,
        location: kiosk.location,
        apiKey: kiosk.apiKey,
        hardwareId: kiosk.hardwareId || null,
        status: effectiveStatus,
        paperRemaining: kiosk.paperRemaining,
        paperRollCapacity: kiosk.paperRollCapacity,
        paperTrackingEnabled: Array.isArray(kiosk.disabledPackageIds) && kiosk.disabledPackageIds.includes('__CFG:PAPER_TRACKING_ON__'),
        printerStatus: kiosk.printerStatus,
        cameraStatus: kiosk.cameraStatus,
        isLocked: kiosk.isLocked,
        lockReason: kiosk.lockReason,
        lastHeartbeat: kiosk.lastHeartbeat ? kiosk.lastHeartbeat.toISOString() : null,
        ipAddress: kiosk.ipAddress,
        appVersion: kiosk.appVersion,
        createdAt: kiosk.createdAt.toISOString(),
        updatedAt: kiosk.updatedAt.toISOString(),
        todayRevenue,
        todaySessionsCount,
      });
    }

    return result;
  }

  /**
   * Mengambil detail satu mesin booth berdasarkan ID
   */
  async getKioskById(id: string): Promise<KioskItemDto | null> {
    const kiosk = await this.prisma.kiosk.findUnique({
      where: { id },
    });
    if (!kiosk) return null;

    const { rangeStart: startOfToday } = calculateWibDateRange('today');

    let effectiveStatus = kiosk.status;
    if (kiosk.isLocked) {
      effectiveStatus = KioskStatus.MAINTENANCE;
    } else if (!kiosk.lastHeartbeat || Date.now() - new Date(kiosk.lastHeartbeat).getTime() > 240000) {
      effectiveStatus = KioskStatus.OFFLINE;
    }

    const [todaySessionsCount, todayRevenueAgg] = await Promise.all([
      this.prisma.session.count({
        where: {
          kioskId: kiosk.id,
          createdAt: { gte: startOfToday },
          state: 'COMPLETED',
        },
      }),
      this.prisma.session.aggregate({
        where: {
          kioskId: kiosk.id,
          createdAt: { gte: startOfToday },
          state: 'COMPLETED',
        },
        _sum: {
          totalPrice: true,
        },
      }),
    ]);

    return {
      id: kiosk.id,
      code: kiosk.code,
      name: kiosk.name,
      location: kiosk.location,
      apiKey: kiosk.apiKey,
      hardwareId: kiosk.hardwareId || null,
      status: effectiveStatus,
      paperRemaining: kiosk.paperRemaining,
      paperRollCapacity: kiosk.paperRollCapacity,
      paperTrackingEnabled: Array.isArray(kiosk.disabledPackageIds) && kiosk.disabledPackageIds.includes('__CFG:PAPER_TRACKING_ON__'),
      printerStatus: kiosk.printerStatus,
      cameraStatus: kiosk.cameraStatus,
      isLocked: kiosk.isLocked,
      lockReason: kiosk.lockReason,
      lastHeartbeat: kiosk.lastHeartbeat ? kiosk.lastHeartbeat.toISOString() : null,
      ipAddress: kiosk.ipAddress,
      appVersion: kiosk.appVersion,
      createdAt: kiosk.createdAt.toISOString(),
      updatedAt: kiosk.updatedAt.toISOString(),
      todayRevenue: todayRevenueAgg._sum.totalPrice || 0,
      todaySessionsCount,
    };
  }

  /**
   * Mendaftarkan komputer booth baru
   */
  async createKiosk(dto: CreateKioskDTO) {
    let finalCode = dto.code ? dto.code.trim().toUpperCase() : '';

    if (!finalCode) {
      const totalCount = await this.prisma.kiosk.count();
      finalCode = `MJA-${String(totalCount + 1).padStart(2, '0')}`;
      let exists = await this.prisma.kiosk.findUnique({ where: { code: finalCode } });
      let counter = totalCount + 2;
      while (exists) {
        finalCode = `MJA-${String(counter).padStart(2, '0')}`;
        exists = await this.prisma.kiosk.findUnique({ where: { code: finalCode } });
        counter++;
      }
    } else {
      const existing = await this.prisma.kiosk.findUnique({ where: { code: finalCode } });
      if (existing) {
        throw new Error(`Kode booth "${finalCode}" sudah terdaftar.`);
      }
    }

    const apiKey = this.generateApiKey();
    const capacity = dto.paperRollCapacity && dto.paperRollCapacity > 0 ? dto.paperRollCapacity : 400;

    const kiosk = await this.prisma.kiosk.create({
      data: {
        code: finalCode,
        name: dto.name.trim(),
        location: dto.location.trim(),
        apiKey,
        paperRemaining: capacity,
        paperRollCapacity: capacity,
        status: KioskStatus.OFFLINE,
        partnerId: dto.partnerId || null,
      },
    });

    humanLogger.success('KIOSK', `Booth baru terdaftar: [${kiosk.code}] ${kiosk.name} (${kiosk.location})`);
    return kiosk;
  }

  /**
   * Memperbarui informasi mesin booth
   */
  async updateKiosk(id: string, dto: UpdateKioskDTO) {
    const existing = await this.prisma.kiosk.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Mesin booth tidak ditemukan.');
    }

    const updated = await this.prisma.kiosk.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        location: dto.location ? dto.location.trim() : undefined,
        paperRollCapacity: dto.paperRollCapacity && dto.paperRollCapacity > 0 ? dto.paperRollCapacity : undefined,
        partnerId: dto.partnerId !== undefined ? dto.partnerId : undefined,
      },
    });

    humanLogger.info('KIOSK', `Informasi booth [${updated.code}] berhasil diperbarui.`);
    return updated;
  }

  /**
   * Menghapus registrasi mesin booth
   */
  async deleteKiosk(id: string) {
    const existing = await this.prisma.kiosk.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Mesin booth tidak ditemukan.');
    }

    // Putuskan relasi dengan aman sebelum penghapusan agar tidak melanggar foreign key
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { kioskId: id },
        data: { kioskId: null },
      }),
      this.prisma.accessCode.updateMany({
        where: { kioskId: id },
        data: { kioskId: null },
      }),
      this.prisma.operator.updateMany({
        where: { kioskId: id },
        data: { kioskId: null },
      }),
      this.prisma.voucher.updateMany({
        where: { kioskId: id },
        data: { kioskId: null },
      }),
      this.prisma.kiosk.delete({ where: { id } }),
    ]);

    humanLogger.warn('KIOSK', `Booth [${existing.code}] beserta API Key telah dicabut dan dihapus dari sistem armada.`);
    return { success: true, message: `Booth ${existing.code} berhasil dihapus dan akses API dicabut.` };
  }

  /**
   * Regenerasi API Key baru (Rotasi Kunci)
   */
  async rotateApiKey(id: string) {
    const existing = await this.prisma.kiosk.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Mesin booth tidak ditemukan.');
    }

    const newApiKey = this.generateApiKey();
    const updated = await this.prisma.kiosk.update({
      where: { id },
      data: { apiKey: newApiKey },
    });

    humanLogger.info('KIOSK', `API Key untuk booth [${updated.code}] berhasil dirotasi.`);
    return {
      id: updated.id,
      code: updated.code,
      apiKey: updated.apiKey,
    };
  }

  /**
   * Mengunci atau membuka mesin booth tertentu dari jarak jauh (Remote Lock)
   */
  async toggleLock(id: string, isLocked: boolean, lockReason?: string) {
    const existing = await this.prisma.kiosk.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Mesin booth tidak ditemukan.');
    }

    const updated = await this.prisma.kiosk.update({
      where: { id },
      data: {
        isLocked,
        lockReason: isLocked ? (lockReason || 'Pengisian ulang kertas / pemeliharaan berkala') : null,
        status: isLocked ? KioskStatus.MAINTENANCE : (existing.status === KioskStatus.MAINTENANCE ? KioskStatus.ONLINE : existing.status),
      },
    });

    humanLogger.info(
      'KIOSK',
      `Booth [${updated.code}] ${isLocked ? 'DIKUNCI' : 'DIBUKA'}: ${updated.lockReason || 'Normal'}`
    );

    return {
      id: updated.id,
      code: updated.code,
      isLocked: updated.isLocked,
      lockReason: updated.lockReason,
      status: updated.status,
    };
  }

  /**
   * Reset sisa lembar kertas foto saat teknisi mengisi ulang roll
   */
  async refillPaper(id: string, newCapacity?: number) {
    const existing = await this.prisma.kiosk.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Mesin booth tidak ditemukan.');
    }

    const capacity = newCapacity && newCapacity > 0 ? newCapacity : existing.paperRollCapacity;
    const updated = await this.prisma.kiosk.update({
      where: { id },
      data: {
        paperRemaining: capacity,
        paperRollCapacity: capacity,
      },
    });

    humanLogger.success('KIOSK', `Kertas foto booth [${updated.code}] di-refill menjadi ${capacity} lembar.`);
    return {
      id: updated.id,
      code: updated.code,
      paperRemaining: updated.paperRemaining,
      paperRollCapacity: updated.paperRollCapacity,
    };
  }

  /**
   * Memproses Heartbeat dari mesin booth fisik
   * Diotentikasi menggunakan Header `X-Booth-Key`
   */
  async processHeartbeat(apiKey: string, payload: HeartbeatPayload, ipAddress?: string) {
    if (!apiKey) {
      throw new Error('Header X-Booth-Key wajib disertakan.');
    }

    // Select minimal: heartbeat dipanggil sangat sering oleh setiap kiosk (hemat egress Supabase)
    const kiosk = await this.prisma.kiosk.findUnique({
      where: { apiKey },
      select: {
        id: true,
        code: true,
        name: true,
        location: true,
        status: true,
        hardwareId: true,
        isLocked: true,
        lockReason: true,
        paperRemaining: true,
        paperRollCapacity: true,
        disabledPackageIds: true,
        printerStatus: true,
        cameraStatus: true,
        appVersion: true,
        ipAddress: true,
        lastHeartbeat: true,
      },
    });

    if (!kiosk) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Kunci otentikasi booth tidak valid atau mesin belum terdaftar.');
    }

    // HARDWARE BINDING GUARDRAIL (1 Kunci Lisensi = 1 Perangkat Fisik):
    const incomingHw = (payload.hardwareId || '').trim();
    if (incomingHw) {
      if (kiosk.hardwareId && kiosk.hardwareId !== incomingHw) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Kunci lisensi ini sudah terikat pada perangkat fisik lain (ID: ${kiosk.hardwareId}). 1 Kunci lisensi hanya diizinkan untuk 1 booth fisik.`
        );
      }
    }

    let nextStatus = payload.status || KioskStatus.ONLINE;
    if (kiosk.isLocked) {
      nextStatus = KioskStatus.MAINTENANCE;
    }

    // Throttle penulisan DB ke Supabase: hanya tulis jika ada perubahan state/kertas/hardwareId, atau lastHeartbeat >= 3 menit lalu
    const statusChanged = nextStatus !== kiosk.status;
    const paperChanged = payload.paperRemaining !== undefined && payload.paperRemaining !== kiosk.paperRemaining;
    const hwNeedsBind = Boolean(incomingHw && !kiosk.hardwareId);
    const heartbeatStale =
      !kiosk.lastHeartbeat || Date.now() - new Date(kiosk.lastHeartbeat).getTime() >= 180_000;

    let updated = kiosk;
    if (statusChanged || paperChanged || hwNeedsBind || heartbeatStale) {
      const dataToUpdate: any = {
        lastHeartbeat: new Date(),
        status: nextStatus,
        paperRemaining: payload.paperRemaining !== undefined ? payload.paperRemaining : kiosk.paperRemaining,
        printerStatus: payload.printerStatus || kiosk.printerStatus,
        cameraStatus: payload.cameraStatus || kiosk.cameraStatus,
        appVersion: payload.appVersion || kiosk.appVersion,
        ipAddress: ipAddress || kiosk.ipAddress,
      };

      // Otomatis bind hardwareId pada heartbeat pertama jika belum terikat
      if (hwNeedsBind) {
        dataToUpdate.hardwareId = incomingHw;
        humanLogger.success('KIOSK', `Perangkat fisik [${kiosk.code}] berhasil terikat ke Hardware ID: ${incomingHw}`);
      }

      updated = await this.prisma.kiosk.update({
        where: { id: kiosk.id },
        data: dataToUpdate,
        select: {
          id: true,
          code: true,
          name: true,
          location: true,
          status: true,
          isLocked: true,
          lockReason: true,
          hardwareId: true,
          paperRemaining: true,
          paperRollCapacity: true,
          disabledPackageIds: true,
          printerStatus: true,
          cameraStatus: true,
          appVersion: true,
          ipAddress: true,
          lastHeartbeat: true,
        },
      });
    }

    const pendingCommands = KioskService.popPrintCommands(kiosk.id);
    const env = getEnv();
    const r2Config =
      env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY
        ? {
            s3Endpoint: env.S3_ENDPOINT,
            s3AccessKey: env.S3_ACCESS_KEY,
            s3SecretKey: env.S3_SECRET_KEY,
            s3BucketName: env.S3_BUCKET_NAME || 'backup',
            s3Region: env.S3_REGION || 'auto',
            r2PublicDomain: env.R2_PUBLIC_DOMAIN || 'https://tampung.minja.my.id',
          }
        : undefined;

    return {
      success: true,
      kioskId: updated.id,
      code: updated.code,
      name: updated.name,
      location: updated.location,
      isLocked: updated.isLocked,
      lockReason: updated.lockReason || (updated.isLocked ? 'Pengisian ulang kertas foto / pemeliharaan berkala' : undefined),
      paperRemaining: updated.paperRemaining,
      paperRollCapacity: updated.paperRollCapacity,
      isPaperTrackingEnabled: Array.isArray(updated.disabledPackageIds) && updated.disabledPackageIds.includes('__CFG:PAPER_TRACKING_ON__'),
      pendingPrintCommands: pendingCommands,
      r2Config,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Super Admin / Partner: Melepas ikatan perangkat fisik (Hardware ID) agar kunci bisa dipindahkan ke PC baru
   */
  async resetHardwareBinding(kioskId: string) {
    const kiosk = await this.prisma.kiosk.findUnique({ where: { id: kioskId } });
    if (!kiosk) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Mesin booth tidak ditemukan.');
    }

    await this.prisma.kiosk.update({
      where: { id: kioskId },
      data: { hardwareId: null },
    });

    humanLogger.info('KIOSK', `Ikatan perangkat fisik booth [${kiosk.code}] telah di-reset (unbound). Kunci API siap dipasangkan ke PC baru.`);

    return {
      success: true,
      message: `Ikatan perangkat fisik untuk booth [${kiosk.code}] berhasil dilepas. Kunci API kini dapat digunakan di komputer baru.`,
    };
  }
}

