// server/src/services/kiosk.service.ts
// Layanan Pengelolaan Armada Multi-Kiosk (Control Tower)
// Mengelola pendaftaran booth, API key unik per mesin, heartbeat telemetri, dan remote lock

import crypto from 'node:crypto';
import { PrismaClient, KioskStatus } from '@prisma/client';
import { reloadEnv } from '../config/env.js';
import { AppError, ErrorCode } from '../types/common.types.js';
import { humanLogger } from '../utils/humanLogger.js';

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
}

export interface PendingPrintCommand {
  id: string;
  sessionId: string;
  copies: number;
  reason: string;
  requestedBy: string;
  createdAt: string;
}

export interface KioskItemDto {
  id: string;
  code: string;
  name: string;
  location: string;
  apiKey: string;
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
  // Antrean perintah cetak jarak jauh per booth (Remote Print Dispatch)
  private static pendingPrintCommands = new Map<string, PendingPrintCommand[]>();

  public static queuePrintCommand(kioskId: string, cmd: PendingPrintCommand): void {
    const existing = KioskService.pendingPrintCommands.get(kioskId) || [];
    existing.push(cmd);
    KioskService.pendingPrintCommands.set(kioskId, existing);
    humanLogger.info('REMOTE_PRINT_QUEUE', `Perintah cetak didaftarkan untuk booth ${kioskId}: Sesi ${cmd.sessionId} (${cmd.copies} lembar)`);
  }

  public static popPrintCommands(kioskId: string): PendingPrintCommand[] {
    const cmds = KioskService.pendingPrintCommands.get(kioskId) || [];
    if (cmds.length > 0) {
      KioskService.pendingPrintCommands.delete(kioskId);
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
   * Mengambil daftar seluruh mesin booth beserta telemetri dan omzet hari ini
   */
  async listKiosks(): Promise<KioskItemDto[]> {
    const kiosks = await this.prisma.kiosk.findMany({
      orderBy: { code: 'asc' },
    });

    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const result: KioskItemDto[] = [];

    for (const kiosk of kiosks) {
      // Evaluasi status online dinamis (jika heartbeat > 45 detik, tandai OFFLINE)
      let effectiveStatus = kiosk.status;
      if (kiosk.isLocked) {
        effectiveStatus = KioskStatus.MAINTENANCE;
      } else if (!kiosk.lastHeartbeat || now - new Date(kiosk.lastHeartbeat).getTime() > 45000) {
        effectiveStatus = KioskStatus.OFFLINE;
      }

      // Hitung omzet dan jumlah sesi selesai hari ini untuk kiosk ini
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

      result.push({
        id: kiosk.id,
        code: kiosk.code,
        name: kiosk.name,
        location: kiosk.location,
        apiKey: kiosk.apiKey,
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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let effectiveStatus = kiosk.status;
    if (kiosk.isLocked) {
      effectiveStatus = KioskStatus.MAINTENANCE;
    } else if (!kiosk.lastHeartbeat || Date.now() - new Date(kiosk.lastHeartbeat).getTime() > 45000) {
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

    const kiosk = await this.prisma.kiosk.findUnique({
      where: { apiKey },
    });

    if (!kiosk) {
      throw new Error('Kunci otentikasi booth tidak valid atau mesin belum terdaftar.');
    }

    let nextStatus = payload.status || KioskStatus.ONLINE;
    if (kiosk.isLocked) {
      nextStatus = KioskStatus.MAINTENANCE;
    }

    const updated = await this.prisma.kiosk.update({
      where: { id: kiosk.id },
      data: {
        lastHeartbeat: new Date(),
        status: nextStatus,
        paperRemaining: payload.paperRemaining !== undefined ? payload.paperRemaining : kiosk.paperRemaining,
        printerStatus: payload.printerStatus || kiosk.printerStatus,
        cameraStatus: payload.cameraStatus || kiosk.cameraStatus,
        appVersion: payload.appVersion || kiosk.appVersion,
        ipAddress: ipAddress || kiosk.ipAddress,
      },
    });

    const pendingCommands = KioskService.popPrintCommands(kiosk.id);

    return {
      success: true,
      kioskId: updated.id,
      code: updated.code,
      name: updated.name,
      isLocked: updated.isLocked,
      lockReason: updated.lockReason,
      pendingPrintCommands: pendingCommands,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Kiosk: Mengambil status aktivasi lisensi booth saat ini
   */
  async getActivationStatus() {
    const rawKey = process.env['BOOTH_API_KEY'];
    if (!rawKey || rawKey === 'dev-booth-key-for-testing' || rawKey === 'ganti-dengan-string-unik-per-mesin') {
      return {
        isActivated: false,
        message: 'Perangkat booth belum diaktivasi dengan Kunci Aktivasi Resmi.',
      };
    }

    try {
      const kiosk = await this.prisma.kiosk.findUnique({
        where: { apiKey: rawKey.trim() },
        include: { partner: { select: { id: true, name: true } } },
      });

      if (!kiosk) {
        return {
          isActivated: false,
          message: 'Kunci aktivasi yang tersimpan tidak ditemukan di database server pusat.',
        };
      }

      return {
        isActivated: true,
        kiosk: {
          id: kiosk.id,
          code: kiosk.code,
          name: kiosk.name,
          location: kiosk.location,
          status: kiosk.status,
          partnerName: kiosk.partner?.name || null,
          apiKey: kiosk.apiKey,
        },
      };
    } catch {
      // Fallback offline bila koneksi database terputus tetapi key sudah terpasang
      return {
        isActivated: true,
        kiosk: {
          code: 'STANDALONE',
          name: 'Minja Standalone Booth',
          location: 'Offline Mode',
        },
      };
    }
  }

  /**
   * Kiosk: Mengaktivasi perangkat fisik dengan memasukkan BOOTH_API_KEY
   */
  async activateKiosk(apiKey: string) {
    const raw = (apiKey || '').trim();
    const cleanKey = raw
      .replace(/^BOOTH_API_KEY\s*=\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();

    if (!cleanKey) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'API Key tidak boleh kosong.');
    }

    const kiosk = await this.prisma.kiosk.findUnique({
      where: { apiKey: cleanKey },
      include: { partner: { select: { id: true, name: true } } },
    });

    if (!kiosk) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Kunci Aktivasi Booth tidak valid atau belum didaftarkan. Hubungi administrator.');
    }

    // Set di runtime process.env
    process.env['BOOTH_API_KEY'] = cleanKey;

    // Simpan ke file .env secara deterministik
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const currentDir = path.dirname(fileURLToPath(import.meta.url));

      const candidatePaths = [
        path.resolve(currentDir, '../../.env'),
        path.resolve(process.cwd(), 'server/.env'),
        path.resolve(process.cwd(), '.env'),
      ];

      for (const envPath of candidatePaths) {
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          if (envContent.includes('BOOTH_API_KEY=')) {
            envContent = envContent.replace(/BOOTH_API_KEY=.*/g, `BOOTH_API_KEY=${cleanKey}`);
          } else {
            envContent += `\nBOOTH_API_KEY=${cleanKey}\n`;
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
          break;
        }
      }
      reloadEnv();
    } catch (err) {
      humanLogger.warn('KIOSK', `Gagal menulis BOOTH_API_KEY ke file .env: ${err}`);
    }

    humanLogger.success('KIOSK', `Perangkat sukses diaktivasi sebagai [${kiosk.code}] ${kiosk.name}`);

    return {
      success: true,
      message: `Aktivasi berhasil! Perangkat terdaftar sebagai [${kiosk.code}] ${kiosk.name}.`,
      kiosk: {
        id: kiosk.id,
        code: kiosk.code,
        name: kiosk.name,
        location: kiosk.location,
        status: kiosk.status,
        partnerName: kiosk.partner?.name || null,
      },
    };
  }
}

