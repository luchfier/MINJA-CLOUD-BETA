// server/src/services/partner.service.ts
// Service Manajemen Mitra Franchise / Pemilik Lokasi (Tier 2 RBAC)
// Menangani pendaftaran partner, penetapan booth, omzet cabang, dan manajemen akun operator kasir

import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import { hashPin, verifyPin, signCustomToken } from '../utils/auth.util.js';
import { humanLogger } from '../utils/humanLogger.js';
import { formatSessionCode } from '../utils/session.util.js';
import { AccessCodeService } from './accessCode.service.js';

export interface CreatePartnerInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  revenueSharePct?: number;
}

export interface UpdatePartnerInput {
  name?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  revenueSharePct?: number;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  receiptAddress?: string | null;
  receiptSocial?: string | null;
  receiptPolicy?: string | null;
  receiptPaperWidth?: number | null;
  receiptConfig?: any;
  isActive?: boolean;
}

export interface CreateOperatorInput {
  name: string;
  username: string;
  pin: string;
  kioskId?: string;
}

export interface UpdateOperatorInput {
  name?: string;
  pin?: string;
  kioskId?: string | null;
  isActive?: boolean;
}

/**
 * Menghitung rentang tanggal presisi berbasis Waktu Indonesia Barat (WIB / UTC+7).
 * Berfungsi stabil di server mana pun (UTC VPS, Cloud, Local).
 */
export function calculateWibDateRange(
  period: string = 'today',
  customStartDate?: string,
  customEndDate?: string
): { rangeStart: Date; rangeEnd: Date; periodLabel: string } {
  const wibNow = new Date(Date.now() + 7 * 3600 * 1000);
  const y = wibNow.getUTCFullYear();
  const m = wibNow.getUTCMonth();
  const d = wibNow.getUTCDate();

  // Helper untuk membuat Date UTC yang setara dengan jam WIB
  const makeWibDate = (year: number, month: number, day: number, hours: number, minutes: number, seconds: number, ms: number) => {
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds, ms) - 7 * 3600 * 1000);
  };

  const startOfTodayWib = makeWibDate(y, m, d, 0, 0, 0, 0);
  const endOfTodayWib = makeWibDate(y, m, d, 23, 59, 59, 999);

  if (period === 'yesterday') {
    return {
      rangeStart: makeWibDate(y, m, d - 1, 0, 0, 0, 0),
      rangeEnd: makeWibDate(y, m, d - 1, 23, 59, 59, 999),
      periodLabel: 'Kemarin',
    };
  }

  if (period === '7d') {
    return {
      rangeStart: makeWibDate(y, m, d - 6, 0, 0, 0, 0),
      rangeEnd: endOfTodayWib,
      periodLabel: '7 Hari Terakhir',
    };
  }

  if (period === '30d') {
    return {
      rangeStart: makeWibDate(y, m, d - 29, 0, 0, 0, 0),
      rangeEnd: endOfTodayWib,
      periodLabel: '30 Hari Terakhir',
    };
  }

  if (period === 'this_month') {
    const monthName = startOfTodayWib.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    return {
      rangeStart: makeWibDate(y, m, 1, 0, 0, 0, 0),
      rangeEnd: endOfTodayWib,
      periodLabel: `Bulan Ini (${monthName})`,
    };
  }

  if (period === 'last_month') {
    const lastMonthStart = makeWibDate(y, m - 1, 1, 0, 0, 0, 0);
    const monthName = lastMonthStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    return {
      rangeStart: lastMonthStart,
      rangeEnd: makeWibDate(y, m, 0, 23, 59, 59, 999),
      periodLabel: `Bulan Lalu (${monthName})`,
    };
  }

  if (period === 'custom' && customStartDate && customEndDate) {
    const [sy, sm, sd] = customStartDate.split('-').map(Number);
    const [ey, em, ed] = customEndDate.split('-').map(Number);
    return {
      rangeStart: makeWibDate(sy, (sm || 1) - 1, sd || 1, 0, 0, 0, 0),
      rangeEnd: makeWibDate(ey, (em || 1) - 1, ed || 1, 23, 59, 59, 999),
      periodLabel: `${customStartDate} s/d ${customEndDate}`,
    };
  }

  // Default: 'today'
  return {
    rangeStart: startOfTodayWib,
    rangeEnd: endOfTodayWib,
    periodLabel: 'Hari Ini',
  };
}

export class PartnerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Super Admin: Mengambil daftar seluruh partner & statistik performa
   */
  async listPartners() {
    const partners = await this.prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        kiosks: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            paperRemaining: true,
          },
        },
        operators: {
          select: {
            id: true,
            name: true,
            username: true,
            isActive: true,
            kioskId: true,
          },
        },
      },
    });

    return partners.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      rawPassword: (p as any).rawPassword || null,
      phone: p.phone,
      revenueSharePct: p.revenueSharePct,
      receiptHeader: p.receiptHeader,
      receiptFooter: p.receiptFooter,
      receiptAddress: (p as any).receiptAddress || null,
      receiptSocial: (p as any).receiptSocial || null,
      receiptPolicy: (p as any).receiptPolicy || null,
      receiptPaperWidth: (p as any).receiptPaperWidth || 58,
      receiptConfig: (p as any).receiptConfig || null,
      isActive: p.isActive,
      kiosksCount: p.kiosks.length,
      operatorsCount: p.operators.length,
      kiosks: p.kiosks,
      operators: p.operators,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  /**
   * Super Admin: Membuat partner baru
   */
  async createPartner(input: CreatePartnerInput) {
    const existing = await this.prisma.partner.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppError(400, ErrorCode.CONFLICT, 'Email partner sudah terdaftar.');
    }

    const passwordHash = await hashPin(input.password);
    const created = await this.prisma.partner.create({
      data: {
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash,
        rawPassword: input.password.trim(),
        phone: input.phone?.trim(),
        revenueSharePct: input.revenueSharePct ?? 70,
        isActive: true,
      } as any,
    });

    humanLogger.success('PARTNER', `Mitra baru berhasil didaftarkan: [${created.name}] (${created.email})`);

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      rawPassword: (created as any).rawPassword || input.password.trim(),
      revenueSharePct: created.revenueSharePct,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Super Admin / Mitra: Memperbarui profil mitra (nama, kontak, struk thermal, bagi hasil)
   */
  async updatePartner(partnerId: string, input: UpdatePartnerInput) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');
    }

    const data: any = {};
    if (input.name) data.name = input.name.trim();
    if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
    if (input.email) {
      const email = input.email.toLowerCase().trim();
      if (email !== partner.email) {
        const exist = await this.prisma.partner.findUnique({ where: { email } });
        if (exist) throw new AppError(400, ErrorCode.CONFLICT, 'Email sudah digunakan oleh mitra lain.');
        data.email = email;
      }
    }
    if (input.password) {
      data.passwordHash = await hashPin(input.password);
      data.rawPassword = input.password.trim();
    }
    if (input.revenueSharePct !== undefined) {
      data.revenueSharePct = input.revenueSharePct;
    }
    if (input.receiptHeader !== undefined) {
      data.receiptHeader = input.receiptHeader;
    }
    if (input.receiptFooter !== undefined) {
      data.receiptFooter = input.receiptFooter;
    }
    if (input.receiptAddress !== undefined) {
      data.receiptAddress = input.receiptAddress;
    }
    if (input.receiptSocial !== undefined) {
      data.receiptSocial = input.receiptSocial;
    }
    if (input.receiptPolicy !== undefined) {
      data.receiptPolicy = input.receiptPolicy;
    }
    if (input.receiptPaperWidth !== undefined) {
      data.receiptPaperWidth = input.receiptPaperWidth;
    }
    if (input.receiptConfig !== undefined) {
      data.receiptConfig = input.receiptConfig;
    }
    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }

    const updated = await this.prisma.partner.update({
      where: { id: partnerId },
      data,
    });

    humanLogger.success('PARTNER', `Profil mitra diperbarui: [${updated.name}]`);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      rawPassword: (updated as any).rawPassword || null,
      phone: updated.phone,
      revenueSharePct: updated.revenueSharePct,
      receiptHeader: updated.receiptHeader,
      receiptFooter: updated.receiptFooter,
      receiptAddress: (updated as any).receiptAddress || null,
      receiptSocial: (updated as any).receiptSocial || null,
      receiptPolicy: (updated as any).receiptPolicy || null,
      receiptPaperWidth: (updated as any).receiptPaperWidth || 58,
      receiptConfig: (updated as any).receiptConfig || null,
      isActive: updated.isActive,
    };
  }

  /**
   * Super Admin: Menghapus mitra franchise dan melepaskan seluruh booth terkait kembali ke Pusat
   */
  async deletePartner(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Lepaskan seluruh kiosk/booth milik partner ini kembali ke Pusat Minja (partnerId = null)
      await tx.kiosk.updateMany({
        where: { partnerId },
        data: { partnerId: null },
      });

      // 2. Hapus voucher milik partner
      await tx.voucher.deleteMany({
        where: { partnerId },
      });

      // 3. Hapus operator kasir milik partner
      await tx.operator.deleteMany({
        where: { partnerId },
      });

      // 4. Hapus entitas partner
      await tx.partner.delete({
        where: { id: partnerId },
      });
    });

    humanLogger.success('PARTNER', `Mitra [${partner.name}] berhasil dihapus & seluruh booth dikembalikan ke Pusat.`);
    return { success: true, message: `Mitra ${partner.name} berhasil dihapus.` };
  }

  /**
   * Super Admin: Menugaskan kiosk ke partner
   */
  async assignKiosk(kioskId: string, partnerId: string | null) {
    const kiosk = await this.prisma.kiosk.findUnique({ where: { id: kioskId } });
    if (!kiosk) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Kiosk tidak ditemukan.');
    }

    const updated = await this.prisma.kiosk.update({
      where: { id: kioskId },
      data: { partnerId },
      include: { partner: { select: { id: true, name: true, email: true } } },
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      partnerId: updated.partnerId,
      partner: updated.partner,
    };
  }

  /**
   * Partner: Login mandiri mitra
   */
  async partnerLogin(email: string, pass: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!partner || !partner.isActive) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Email atau kata sandi mitra salah / akun dinonaktifkan.');
    }

    const isValid = await verifyPin(pass, partner.passwordHash);
    if (!isValid) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Email atau kata sandi mitra salah.');
    }

    const { token, expiresAt } = signCustomToken({
      sub: partner.id,
      role: 'partner',
      partnerId: partner.id,
      expiresIn: '24h',
    });

    return {
      token,
      expiresAt,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        revenueSharePct: partner.revenueSharePct,
        receiptHeader: partner.receiptHeader,
        receiptFooter: partner.receiptFooter,
        receiptAddress: (partner as any).receiptAddress || null,
        receiptSocial: (partner as any).receiptSocial || null,
        receiptPolicy: (partner as any).receiptPolicy || null,
        receiptPaperWidth: (partner as any).receiptPaperWidth || 58,
        receiptConfig: (partner as any).receiptConfig || null,
      },
    };
  }

  /**
   * Partner: Ganti kata sandi mandiri
   */
  async changePassword(partnerId: string, currentPass: string, newPass: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Akun mitra tidak ditemukan.');
    }

    const isMatch = await verifyPin(currentPass, partner.passwordHash);
    if (!isMatch) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Kata sandi saat ini yang Anda masukkan salah.');
    }

    if (!newPass || newPass.trim().length < 6) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Kata sandi baru minimal harus 6 karakter.');
    }

    const newHash = await hashPin(newPass.trim());
    await this.prisma.partner.update({
      where: { id: partnerId },
      data: {
        passwordHash: newHash,
        rawPassword: newPass.trim(),
      },
    });

    humanLogger.success('PARTNER', `Mitra [${partner.name}] berhasil memperbarui kata sandi secara mandiri.`);
    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan gunakan kata sandi baru untuk login berikutnya.',
    };
  }

  /**
   * Partner: Mengambil booth milik partner sendiri
   */
  async getMyKiosks(partnerId: string) {
    const kiosks = await this.prisma.kiosk.findMany({
      where: { partnerId },
      orderBy: { code: 'asc' },
    });

    const { rangeStart: startOfTodayWib } = calculateWibDateRange('today');
    const now = Date.now();

    return Promise.all(
      kiosks.map(async (k) => {
        // Dynamic status check (>45s = OFFLINE)
        let dynamicStatus = k.status;
        if (k.lastHeartbeat) {
          const diffMs = now - k.lastHeartbeat.getTime();
          if (diffMs > 45000 && k.status !== 'MAINTENANCE') {
            dynamicStatus = 'OFFLINE';
          }
        }

        const todaySessions = await this.prisma.session.aggregate({
          where: {
            kioskId: k.id,
            createdAt: { gte: startOfTodayWib },
            totalPrice: { gt: 0 },
            payments: {
              none: {
                paymentType: { in: ['TEST_BYPASS', 'BYPASS_PARTNER'] },
              },
            },
            OR: [
              { state: 'COMPLETED' },
              { payments: { some: { transactionStatus: 'settlement' } } },
              { accessCode: { isNot: null } },
            ],
          },
          _sum: { totalPrice: true, photosPrinted: true },
          _count: { id: true },
        });

        return {
          id: k.id,
          code: k.code,
          name: k.name,
          location: k.location,
          status: dynamicStatus,
          paperRemaining: k.paperRemaining,
          paperRollCapacity: k.paperRollCapacity,
          paperTrackingEnabled: Array.isArray(k.disabledPackageIds) && k.disabledPackageIds.includes('__CFG:PAPER_TRACKING_ON__'),
          printerStatus: k.printerStatus || 'UNKNOWN',
          cameraStatus: k.cameraStatus || 'UNKNOWN',
          isLocked: k.isLocked,
          lockReason: k.lockReason,
          lastHeartbeat: k.lastHeartbeat?.toISOString() || null,
          todayRevenue: todaySessions._sum.totalPrice || 0,
          todaySessionsCount: todaySessions._count.id || 0,
          todayPrintsCount: todaySessions._sum.photosPrinted || 0,
        };
      })
    );
  }

  /**
   * Partner: Mengambil daftar operator milik partner
   */
  async getPartnerOperators(partnerId: string) {
    const operators = await this.prisma.operator.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      include: {
        kiosk: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return operators.map((op) => ({
      id: op.id,
      name: op.name,
      username: op.username,
      isActive: op.isActive,
      kioskId: op.kioskId,
      kiosk: op.kiosk,
      lastLoginAt: op.lastLoginAt?.toISOString() || null,
      createdAt: op.createdAt.toISOString(),
    }));
  }

  /**
   * Partner: Menambahkan operator kasir lapangan baru
   */
  async createOperator(partnerId: string, input: CreateOperatorInput) {
    const existing = await this.prisma.operator.findUnique({
      where: { username: input.username.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppError(400, ErrorCode.CONFLICT, 'Username kasir sudah digunakan.');
    }

    if (input.kioskId) {
      const kiosk = await this.prisma.kiosk.findFirst({
        where: { id: input.kioskId, partnerId },
      });
      if (!kiosk) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Kiosk tidak terdaftar di akun mitra Anda.');
      }
    }

    const pinHash = await hashPin(input.pin.trim());
    const op = await this.prisma.operator.create({
      data: {
        partnerId,
        kioskId: input.kioskId || null,
        name: input.name.trim(),
        username: input.username.toLowerCase().trim(),
        pinHash,
        isActive: true,
      },
      include: {
        kiosk: { select: { id: true, code: true, name: true } },
      },
    });

    humanLogger.success('OPERATOR', `Kasir baru ditambahkan: ${op.name} (@${op.username}) untuk Partner ${partnerId}`);

    return {
      id: op.id,
      name: op.name,
      username: op.username,
      isActive: op.isActive,
      kioskId: op.kioskId,
      kiosk: op.kiosk,
      createdAt: op.createdAt.toISOString(),
    };
  }

  /**
   * Partner: Update kasir (ubah PIN / aktif-nonaktif)
   */
  async updateOperator(operatorId: string, partnerId: string, input: UpdateOperatorInput) {
    const op = await this.prisma.operator.findFirst({
      where: { id: operatorId, partnerId },
    });
    if (!op) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Kasir tidak ditemukan.');
    }

    const data: any = {};
    if (input.name) data.name = input.name.trim();
    if (input.pin) data.pinHash = await hashPin(input.pin.trim());
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.kioskId !== undefined) {
      if (input.kioskId) {
        const kiosk = await this.prisma.kiosk.findFirst({
          where: { id: input.kioskId, partnerId },
        });
        if (!kiosk) throw new AppError(403, ErrorCode.FORBIDDEN, 'Kiosk tidak valid.');
        data.kioskId = input.kioskId;
      } else {
        data.kioskId = null;
      }
    }

    const updated = await this.prisma.operator.update({
      where: { id: operatorId },
      data,
      include: { kiosk: { select: { id: true, code: true, name: true } } },
    });

    return {
      id: updated.id,
      name: updated.name,
      username: updated.username,
      isActive: updated.isActive,
      kioskId: updated.kioskId,
      kiosk: updated.kiosk,
    };
  }

  /**
   * Partner: Menghapus atau menonaktifkan akun kasir lapangan
   */
  async deleteOperator(operatorId: string, partnerId: string) {
    const op = await this.prisma.operator.findFirst({
      where: { id: operatorId, partnerId },
      include: { _count: { select: { accessCodes: true } } },
    });
    if (!op) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Kasir tidak ditemukan.');
    }

    // Jika kasir pernah menerbitkan kode PASS, nonaktifkan akun demi integritas transaksi finansial
    if (op._count.accessCodes > 0) {
      await this.prisma.operator.update({
        where: { id: operatorId },
        data: { isActive: false },
      });
      humanLogger.info('OPERATOR', `Kasir dinonaktifkan: ${op.name} (@${op.username}) karena memiliki ${op._count.accessCodes} riwayat PASS.`);
      return {
        success: true,
        action: 'deactivated',
        isSoftDeleted: true,
        message: `Akun kasir @${op.username} dinonaktifkan karena memiliki ${op._count.accessCodes} riwayat tiket transaksi.`,
      };
    }

    // Jika bersih dari riwayat transaksi, hapus permanen
    await this.prisma.operator.delete({
      where: { id: operatorId },
    });
    humanLogger.success('OPERATOR', `Kasir dihapus permanen: ${op.name} (@${op.username})`);
    return {
      success: true,
      action: 'deleted',
      isSoftDeleted: false,
      message: `Akun kasir @${op.username} berhasil dihapus permanen.`,
    };
  }

  /**
   * Partner: Laporan omzet & performa booth milik partner
   */
  async getPartnerAnalytics(partnerId: string, options?: { startDate?: Date; endDate?: Date }) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: { kiosks: { select: { id: true, code: true, name: true } } },
    });
    if (!partner) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Partner tidak ditemukan.');
    }

    const kioskIds = partner.kiosks.map((k) => k.id);
    const dateFilter: any = {};
    if (options?.startDate) dateFilter.gte = options.startDate;
    if (options?.endDate) dateFilter.lte = options.endDate;

    const completedSessions = await this.prisma.session.findMany({
      where: {
        kioskId: { in: kioskIds },
        state: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      select: {
        id: true,
        kioskId: true,
        totalPrice: true,
        photosPrinted: true,
        createdAt: true,
      },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todaySessions = completedSessions.filter((s) => s.createdAt >= startOfToday);
    const todayRevenue = todaySessions.reduce((acc, s) => acc + s.totalPrice, 0);

    const monthSessions = completedSessions.filter((s) => s.createdAt >= startOfMonth);
    const monthRevenue = monthSessions.reduce((acc, s) => acc + s.totalPrice, 0);

    const totalGrossRevenue = completedSessions.reduce((acc, s) => acc + s.totalPrice, 0);
    const totalPrints = completedSessions.reduce((acc, s) => acc + s.photosPrinted, 0);
    const partnerShare = Math.round((totalGrossRevenue * partner.revenueSharePct) / 100);
    const minjaShare = totalGrossRevenue - partnerShare;
    const shareAmount = Math.round((monthRevenue * partner.revenueSharePct) / 100);

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        revenueSharePct: partner.revenueSharePct,
      },
      todayRevenue,
      monthRevenue,
      shareAmount,
      summary: {
        totalGrossRevenue,
        todayRevenue,
        monthRevenue,
        partnerShare,
        minjaShare,
        shareAmount,
        totalSessions: completedSessions.length,
        totalPrints,
      },
      kiosks: partner.kiosks,
    };
  }

  /**
   * Partner: Menerbitkan Kode PASS tunai baru langsung dari Portal Mitra
   */
  async createPartnerPass(
    partnerId: string,
    input: {
      packageId?: string | null;
      type?: string;
      extraPrints?: number;
      kioskId?: string | null;
      amount?: number;
      customerNote?: string;
      cashierName?: string;
      expiresInHours?: number;
    }
  ) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');

    if (input.kioskId) {
      const kiosk = await this.prisma.kiosk.findFirst({
        where: { id: input.kioskId, partnerId },
      });
      if (!kiosk) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Booth tidak terdaftar di akun mitra Anda.');
      }
    }

    const accessCodeService = new AccessCodeService(this.prisma);
    const created = await accessCodeService.createAccessCode({
      packageId: input.packageId || null,
      type: input.type || 'SESSION',
      extraPrints: input.extraPrints || 0,
      kioskId: input.kioskId || null,
      amount: input.amount,
      customerNote: input.customerNote || null,
      cashierName: input.cashierName || `Mitra (${partner.name})`,
      expiresInHours: input.expiresInHours || 24,
      partnerId,
    });

    humanLogger.success('PASS', `Mitra [${partner.name}] menerbitkan Kode PASS [${created.code}]`);
    return created;
  }

  /**
   * Partner: Mengambil seluruh log kode PASS yang diterbitkan oleh mitra & kasir-kasir di bawah mitra ini
   */
  async getPartnerPasses(partnerId: string, limit = 100) {
    const operators = await this.prisma.operator.findMany({
      where: { partnerId },
      select: { id: true },
    });
    const operatorIds = operators.map((o) => o.id);

    const kiosks = await this.prisma.kiosk.findMany({
      where: { partnerId },
      select: { id: true },
    });
    const kioskIds = kiosks.map((k) => k.id);

    const passes = await (this.prisma.accessCode as any).findMany({
      where: {
        OR: [
          { partnerId },
          { operatorId: { in: operatorIds } },
          { kioskId: { in: kioskIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      include: {
        package: { select: { id: true, name: true, price: true } },
        kiosk: { select: { id: true, code: true, name: true } },
        operator: { select: { id: true, name: true, username: true } },
      },
    });

    const now = new Date();
    return passes.map((p: any) => {
      let effectiveStatus = p.status as string;
      const expiresDate = new Date(p.expiresAt);
      const isExpired = expiresDate < now;
      if (p.status === 'ACTIVE' && isExpired) {
        effectiveStatus = 'EXPIRED';
      }

      const remainingMs = Math.max(0, expiresDate.getTime() - now.getTime());
      const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
      const remainingHours = Math.floor(remainingMinutes / 60);

      return {
        id: p.id,
        code: p.code,
        type: p.type,
        extraPrints: p.extraPrints,
        amount: p.amount,
        status: effectiveStatus,
        customerNote: p.customerNote,
        cashierName: p.cashierName,
        operatorName: p.operator?.name || p.cashierName || 'Portal Mitra',
        operatorUsername: p.operator?.username || null,
        packageName: p.package?.name || (p.type === 'EXTRA_PRINT' ? `Cetak Tambahan (${p.extraPrints} Lembar)` : 'Custom Nominal'),
        packageId: p.packageId || null,
        kioskId: p.kioskId || null,
        kioskCode: p.kiosk?.code || null,
        kioskName: p.kiosk?.name || null,
        expiresAt: p.expiresAt instanceof Date ? p.expiresAt.toISOString() : new Date(p.expiresAt).toISOString(),
        usedAt: p.usedAt ? (p.usedAt instanceof Date ? p.usedAt.toISOString() : new Date(p.usedAt).toISOString()) : null,
        usedSessionId: p.usedSessionId || null,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : new Date(p.createdAt).toISOString(),
        remainingMinutes,
        remainingHours,
        isExpired,
      };
    });
  }

  /**
   * Helper: Validasi kepemilikan kode PASS oleh Mitra
   */
  private async findPartnerPass(partnerId: string, passId: string) {
    const operators = await this.prisma.operator.findMany({
      where: { partnerId },
      select: { id: true },
    });
    const operatorIds = operators.map((o) => o.id);

    const kiosks = await this.prisma.kiosk.findMany({
      where: { partnerId },
      select: { id: true },
    });
    const kioskIds = kiosks.map((k) => k.id);

    const pass = await (this.prisma.accessCode as any).findFirst({
      where: {
        id: passId,
        OR: [
          { partnerId },
          { operatorId: { in: operatorIds } },
          { kioskId: { in: kioskIds } },
        ],
      },
      include: {
        package: true,
        kiosk: true,
        operator: true,
      },
    });

    if (!pass) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Kode PASS tidak ditemukan atau tidak berada di bawah kepemilikan Anda.');
    }

    return pass;
  }

  /**
   * Partner: Menghapus kode PASS (hanya untuk yang belum terpakai / non-USED)
   */
  async deletePartnerPass(partnerId: string, passId: string) {
    const pass = await this.findPartnerPass(partnerId, passId);

    if (pass.status === 'USED' || pass.usedAt || pass.usedSessionId) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Kode PASS yang sudah digunakan (USED) tidak dapat dihapus untuk menjaga keabsahan audit finansial transaksi.'
      );
    }

    await (this.prisma.accessCode as any).delete({
      where: { id: passId },
    });

    humanLogger.warn('PASS', `Mitra menghapus Kode PASS [${pass.code}] (Status awal: ${pass.status})`);

    return {
      success: true,
      passId,
      code: pass.code,
      message: `Kode PASS ${pass.code} berhasil dihapus dari sistem.`,
    };
  }

  /**
   * Partner: Membatalkan / me-revoke kode PASS yang masih aktif
   */
  async revokePartnerPass(partnerId: string, passId: string, reason?: string) {
    const pass = await this.findPartnerPass(partnerId, passId);

    if (pass.status === 'USED' || pass.usedAt) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Kode PASS yang sudah terpakai tidak dapat dibatalkan.'
      );
    }

    if (pass.status === 'REVOKED') {
      return {
        success: true,
        passId,
        code: pass.code,
        status: 'REVOKED',
        message: `Kode PASS ${pass.code} sudah berstatus dibatalkan sebelumnya.`,
      };
    }

    const updated = await (this.prisma.accessCode as any).update({
      where: { id: passId },
      data: {
        status: 'REVOKED',
      },
    });

    humanLogger.warn(
      'PASS',
      `Mitra membatalkan Kode PASS [${pass.code}] - Alasan: ${reason || 'Dibatalkan oleh Mitra'}`
    );

    return {
      success: true,
      passId: updated.id,
      code: updated.code,
      status: updated.status,
      message: `Kode PASS ${pass.code} berhasil dibatalkan. Kode tidak dapat digunakan lagi di booth.`,
    };
  }

  /**
   * Partner: Memperpanjang masa kedaluwarsa kode PASS
   */
  async extendPartnerPass(partnerId: string, passId: string, hours = 24) {
    const pass = await this.findPartnerPass(partnerId, passId);

    if (pass.status === 'USED' || pass.usedAt) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Kode PASS yang sudah digunakan tidak dapat diperpanjang.'
      );
    }

    const now = new Date();
    const currentExpires = new Date(pass.expiresAt);
    const baseTime = currentExpires > now ? currentExpires.getTime() : now.getTime();
    const newExpiresAt = new Date(baseTime + hours * 3600 * 1000);

    const updated = await (this.prisma.accessCode as any).update({
      where: { id: passId },
      data: {
        expiresAt: newExpiresAt,
        status: 'ACTIVE',
      },
    });

    humanLogger.info(
      'PASS',
      `Mitra memperpanjang masa berlaku Kode PASS [${pass.code}] sebesar +${hours} jam (Hingga ${newExpiresAt.toISOString()})`
    );

    return {
      success: true,
      passId: updated.id,
      code: updated.code,
      status: 'ACTIVE',
      expiresAt: newExpiresAt.toISOString(),
      message: `Masa berlaku Kode PASS ${pass.code} berhasil diperpanjang +${hours} jam.`,
    };
  }

  /**
   * Partner: Penyesuaian manual sisa lembar kertas pada booth milik mitra & toggle opsi pelacakan kertas
   */
  async updateKioskPaper(
    partnerId: string,
    kioskId: string,
    rawInput: { paperRemaining?: number; paperTrackingEnabled?: boolean } | number
  ) {
    const input = typeof rawInput === 'number' ? { paperRemaining: rawInput } : rawInput;

    const kiosk = await this.prisma.kiosk.findFirst({
      where: { id: kioskId, partnerId },
    });
    if (!kiosk) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan atau tidak berada di bawah kepemilikan Anda.');
    }

    const CONFIG_KEY = '__CFG:PAPER_TRACKING_ON__';
    let currentDisabled = Array.isArray(kiosk.disabledPackageIds)
      ? (kiosk.disabledPackageIds as string[])
      : [];

    const updateData: any = {};

    if (input.paperTrackingEnabled !== undefined) {
      if (input.paperTrackingEnabled) {
        if (!currentDisabled.includes(CONFIG_KEY)) {
          currentDisabled = [...currentDisabled, CONFIG_KEY];
        }
      } else {
        currentDisabled = currentDisabled.filter((id) => id !== CONFIG_KEY);
      }
      updateData.disabledPackageIds = currentDisabled;
    }

    if (input.paperRemaining !== undefined) {
      updateData.paperRemaining = Math.max(0, input.paperRemaining);
    }

    const updated = Object.keys(updateData).length > 0
      ? await this.prisma.kiosk.update({
          where: { id: kioskId },
          data: updateData,
        })
      : kiosk;

    const isTrackingEnabled = Array.isArray(updated.disabledPackageIds) &&
      updated.disabledPackageIds.includes(CONFIG_KEY);

    humanLogger.info(
      'PRINTER',
      `Mitra memperbarui konfigurasi kertas booth [${updated.code}]: sisa ${updated.paperRemaining} lbr, tracking=${isTrackingEnabled ? 'AKTIF' : 'NONAKTIF'}.`
    );

    return {
      kioskId: updated.id,
      code: updated.code,
      name: updated.name,
      paperRemaining: updated.paperRemaining,
      paperRollCapacity: updated.paperRollCapacity,
      paperTrackingEnabled: isTrackingEnabled,
    };
  }

  /**
   * Partner / Super Admin: Mengedit detail booth (nama, lokasi, kode, kapasitas kertas)
   */
  async updatePartnerKiosk(partnerId: string | null, kioskId: string, input: { name?: string; location?: string; code?: string; paperRollCapacity?: number }) {
    const whereClause: any = { id: kioskId };
    if (partnerId) {
      whereClause.partnerId = partnerId;
    }

    const kiosk = await this.prisma.kiosk.findFirst({ where: whereClause });
    if (!kiosk) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan.');
    }

    const data: any = {};
    if (input.name) data.name = input.name.trim();
    if (input.location) data.location = input.location.trim();
    if (input.code) data.code = input.code.trim().toUpperCase();
    if (input.paperRollCapacity) data.paperRollCapacity = input.paperRollCapacity;

    const updated = await this.prisma.kiosk.update({
      where: { id: kioskId },
      data,
    });

    return updated;
  }

  /**
   * Partner / Super Admin: Mengambil drill-down rincian booth (telemetri, statistik, operator, sesi terkini)
   */
  async getPartnerKioskDetails(partnerId: string | null, kioskId: string) {
    const whereClause: any = { id: kioskId };
    if (partnerId) {
      whereClause.partnerId = partnerId;
    }

    const kiosk = await this.prisma.kiosk.findFirst({
      where: whereClause,
      include: {
        operators: {
          select: { id: true, name: true, username: true, isActive: true },
        },
      },
    });
    if (!kiosk) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan.');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todaySessions, recentSessions, transactionsCount, packages] = await Promise.all([
      this.prisma.session.findMany({
        where: { kioskId, createdAt: { gte: startOfToday }, state: 'COMPLETED' },
        select: { id: true, totalPrice: true, photosPrinted: true, createdAt: true },
      }),
      this.prisma.session.findMany({
        where: { kioskId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { package: { select: { id: true, name: true } } },
      }),
      this.prisma.payment.count({ where: { session: { kioskId } } }),
      this.prisma.package.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } }),
    ]);

    const todayGross = todaySessions.reduce((acc, s) => acc + s.totalPrice, 0);
    const todayPrints = todaySessions.reduce((acc, s) => acc + s.photosPrinted, 0);

    return {
      kiosk: {
        id: kiosk.id,
        code: kiosk.code,
        name: kiosk.name,
        location: kiosk.location,
        status: kiosk.status,
        paperRemaining: kiosk.paperRemaining,
        paperRollCapacity: kiosk.paperRollCapacity,
        printerStatus: kiosk.printerStatus || 'READY',
        cameraStatus: kiosk.cameraStatus || 'READY',
        isLocked: kiosk.isLocked,
        lockReason: kiosk.lockReason,
        lastHeartbeat: kiosk.lastHeartbeat ? kiosk.lastHeartbeat.toISOString() : null,
      },
      stats: {
        todayGross,
        todayPrints,
        todaySessionsCount: todaySessions.length,
        totalTransactionsCount: transactionsCount,
      },
      operators: kiosk.operators,
      packages,
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        sessionCode: s.id.slice(-6).toUpperCase(),
        packageName: s.package?.name || 'Paket Standar',
        totalPrice: s.totalPrice,
        state: s.state,
        photosPrinted: s.photosPrinted,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Partner: Analisis Finansial Komprehensif Berdasarkan Periode & Booth
   * Mendukung filter: today, yesterday, 7d, 30d, this_month, last_month, custom, serta filter per booth
   */
  async getPartnerFinancialAnalytics(
    partnerId: string,
    options: {
      period?: string;
      startDate?: string;
      endDate?: string;
      kioskId?: string;
    }
  ) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        kiosks: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            paperRemaining: true,
            paperRollCapacity: true,
          },
        },
      },
    });

    if (!partner) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');
    }

    let targetKiosks = partner.kiosks;
    let selectedKiosk: any = null;

    if (options.kioskId && options.kioskId !== 'ALL') {
      selectedKiosk = partner.kiosks.find((k) => k.id === options.kioskId);
      if (!selectedKiosk) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Booth tidak terdaftar di akun mitra Anda.');
      }
      targetKiosks = [selectedKiosk];
    }

    const kioskIds = targetKiosks.map((k) => k.id);
    const period = options.period || 'today';
    const { rangeStart, rangeEnd, periodLabel } = calculateWibDateRange(period, options.startDate, options.endDate);
    const { rangeStart: startOfTodayWib, rangeEnd: endOfTodayWib } = calculateWibDateRange('today');
    const { rangeStart: startOfMonthWib } = calculateWibDateRange('this_month');

    if (kioskIds.length === 0) {
      return {
        period,
        periodLabel,
        dateRange: {
          start: rangeStart.toISOString(),
          end: rangeEnd.toISOString(),
        },
        partner: {
          id: partner.id,
          name: partner.name,
          revenueSharePct: partner.revenueSharePct,
        },
        todayRevenue: 0,
        monthRevenue: 0,
        shareAmount: 0,
        kiosks: [],
        selectedKioskId: null,
        selectedKioskCode: null,
        selectedKioskName: null,
        summary: {
          totalGrossRevenue: 0,
          grossRevenue: 0,
          todayRevenue: 0,
          monthRevenue: 0,
          shareAmount: 0,
          partnerShare: 0,
          netPartnerShare: 0,
          minjaShare: 0,
          minjaRoyalty: 0,
          totalSessions: 0,
          aov: 0,
          totalPaperUsed: 0,
          totalPrints: 0,
          totalExtraPrints: 0,
          totalDiscountGiven: 0,
        },
        breakdown: {
          qris: { count: 0, totalAmount: 0, percentage: 0 },
          cashDesk: { count: 0, totalAmount: 0, percentage: 0 },
          cashPass: { count: 0, totalAmount: 0, percentage: 0 },
          extraPrints: { count: 0, totalAmount: 0, percentage: 0 },
          voucherPromo: { count: 0, discountSavings: 0 },
        },
        kiosksComparison: [],
        dailyTrend: [],
      };
    }

    // Ambil sesi berstatus lunas / selesai dalam rentang waktu terpilih
    const eligibleSessions = await this.prisma.session.findMany({
      where: {
        kioskId: { in: kioskIds },
        createdAt: { gte: rangeStart, lte: rangeEnd },
        OR: [
          { state: 'COMPLETED' },
          { payments: { some: { transactionStatus: 'settlement' } } },
          { accessCode: { isNot: null } },
        ],
      },
      include: {
        package: { select: { id: true, name: true, price: true } },
        kiosk: { select: { id: true, code: true, name: true } },
        accessCode: { select: { id: true, code: true, type: true, cashierName: true } },
        payments: {
          where: { transactionStatus: 'settlement' },
          select: { id: true, paymentType: true, grossAmount: true, orderId: true, transactionStatus: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter keluar sesi Mode Test / Bypass dari kalkulasi omzet & keuangan
    const paidSessions = eligibleSessions.filter((s) => {
      const isTestBypass =
        s.totalPrice === 0 ||
        s.payments.some((p) => p.paymentType === 'TEST_BYPASS' || p.paymentType === 'BYPASS_PARTNER');
      return !isTestBypass;
    });

    const grossRevenue = paidSessions.reduce((acc, s) => acc + s.totalPrice, 0);
    const totalSessions = paidSessions.length;
    const netPartnerShare = Math.round((grossRevenue * partner.revenueSharePct) / 100);
    const minjaRoyalty = grossRevenue - netPartnerShare;
    const aov = totalSessions > 0 ? Math.round(grossRevenue / totalSessions) : 0;
    const totalPaperUsed = paidSessions.reduce((acc, s) => acc + s.photosPrinted, 0);
    const totalExtraPrints = paidSessions.reduce((acc, s) => acc + s.additionalPrints, 0);

    // Payment Method Breakdown (Hanya transaksi komersial riil)
    let qrisAmount = 0;
    let qrisCount = 0;
    let cashDeskAmount = 0;
    let cashDeskCount = 0;
    let cashPassAmount = 0;
    let cashPassCount = 0;
    let extraPrintsAmount = 0;
    let extraPrintsCount = 0;

    for (const s of paidSessions) {
      if (s.additionalPrints > 0 && s.additionalPrintCost > 0) {
        extraPrintsAmount += s.additionalPrintCost;
        extraPrintsCount += s.additionalPrints;
      }

      if (s.accessCode) {
        cashPassAmount += s.totalPrice;
        cashPassCount += 1;
      } else {
        const cashPayment = s.payments.find((p) => p.paymentType === 'cash' || p.paymentType === 'CASH_DESK');
        if (cashPayment) {
          cashDeskAmount += s.totalPrice;
          cashDeskCount += 1;
        } else {
          // Default to QRIS / Midtrans
          qrisAmount += s.totalPrice;
          qrisCount += 1;
        }
      }
    }

    const breakdown = {
      qris: {
        count: qrisCount,
        totalAmount: qrisAmount,
        percentage: grossRevenue > 0 ? Math.round((qrisAmount / grossRevenue) * 100) : 0,
      },
      cashDesk: {
        count: cashDeskCount,
        totalAmount: cashDeskAmount,
        percentage: grossRevenue > 0 ? Math.round((cashDeskAmount / grossRevenue) * 100) : 0,
      },
      cashPass: {
        count: cashPassCount,
        totalAmount: cashPassAmount,
        percentage: grossRevenue > 0 ? Math.round((cashPassAmount / grossRevenue) * 100) : 0,
      },
      extraPrints: {
        count: extraPrintsCount,
        totalAmount: extraPrintsAmount,
        percentage: grossRevenue > 0 ? Math.round((extraPrintsAmount / grossRevenue) * 100) : 0,
      },
      voucherPromo: {
        count: 0,
        discountSavings: 0,
      },
    };

    // Kiosks Comparison
    const kiosksComparison = partner.kiosks.map((k) => {
      const kPaidSessions = paidSessions.filter((s) => s.kioskId === k.id);
      const kRev = kPaidSessions.reduce((acc, s) => acc + s.totalPrice, 0);
      const kShare = Math.round((kRev * partner.revenueSharePct) / 100);
      const kPrints = kPaidSessions.reduce((acc, s) => acc + s.photosPrinted, 0);

      return {
        kioskId: k.id,
        kioskCode: k.code,
        kioskName: k.name,
        status: k.status,
        paperRemaining: k.paperRemaining,
        paperRollCapacity: k.paperRollCapacity,
        grossRevenue: kRev,
        partnerShare: kShare,
        sessionsCount: kPaidSessions.length,
        paperUsed: kPrints,
      };
    });

    // Daily Trend (WIB Normalized)
    const dailyMap = new Map<string, { revenue: number; sessions: number }>();
    for (const s of paidSessions) {
      const wibDate = new Date(s.createdAt.getTime() + 7 * 3600 * 1000);
      const dStr = wibDate.toISOString().slice(0, 10);
      const curr = dailyMap.get(dStr) || { revenue: 0, sessions: 0 };
      curr.revenue += s.totalPrice;
      curr.sessions += 1;
      dailyMap.set(dStr, curr);
    }

    const dailyTrend = Array.from(dailyMap.entries()).map(([date, data]) => {
      const dateObj = new Date(date);
      const label = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
      const pShare = Math.round((data.revenue * partner.revenueSharePct) / 100);
      return {
        date,
        label,
        revenue: data.revenue,
        partnerShare: pShare,
        sessionsCount: data.sessions,
      };
    });

    // Query Omzet Hari Ini & Bulan Ini (WIB) secara independen agar kartu ringkasan selalu akurat
    const [todayAgg, monthAgg] = await Promise.all([
      this.prisma.session.aggregate({
        where: {
          kioskId: { in: kioskIds },
          createdAt: { gte: startOfTodayWib, lte: endOfTodayWib },
          totalPrice: { gt: 0 },
          payments: {
            none: {
              paymentType: { in: ['TEST_BYPASS', 'BYPASS_PARTNER'] },
            },
          },
          OR: [
            { state: 'COMPLETED' },
            { payments: { some: { transactionStatus: 'settlement' } } },
            { accessCode: { isNot: null } },
          ],
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.session.aggregate({
        where: {
          kioskId: { in: kioskIds },
          createdAt: { gte: startOfMonthWib, lte: endOfTodayWib },
          totalPrice: { gt: 0 },
          payments: {
            none: {
              paymentType: { in: ['TEST_BYPASS', 'BYPASS_PARTNER'] },
            },
          },
          OR: [
            { state: 'COMPLETED' },
            { payments: { some: { transactionStatus: 'settlement' } } },
            { accessCode: { isNot: null } },
          ],
        },
        _sum: { totalPrice: true },
      }),
    ]);

    const todayRevenue = todayAgg._sum.totalPrice || 0;
    const monthRevenue = monthAgg._sum.totalPrice || 0;
    const shareAmount = Math.round((monthRevenue * partner.revenueSharePct) / 100);

    return {
      period,
      periodLabel,
      dateRange: {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      },
      partner: {
        id: partner.id,
        name: partner.name,
        revenueSharePct: partner.revenueSharePct,
      },
      todayRevenue,
      monthRevenue,
      shareAmount,
      kiosks: partner.kiosks,
      selectedKioskId: selectedKiosk?.id || null,
      selectedKioskCode: selectedKiosk?.code || null,
      selectedKioskName: selectedKiosk?.name || null,
      summary: {
        totalGrossRevenue: grossRevenue,
        grossRevenue,
        todayRevenue,
        monthRevenue,
        shareAmount,
        partnerShare: netPartnerShare,
        netPartnerShare,
        minjaShare: minjaRoyalty,
        minjaRoyalty,
        totalSessions,
        aov,
        totalPaperUsed,
        totalPrints: totalPaperUsed,
        totalExtraPrints,
        totalDiscountGiven: 0,
      },
      breakdown,
      kiosksComparison,
      dailyTrend,
    };
  }

  /**
   * Partner: Mengambil daftar transaksi terperinci dengan filter booth, status, pencarian & pagination
   */
  async getPartnerTransactions(
    partnerId: string,
    options: {
      kioskId?: string;
      startDate?: string;
      endDate?: string;
      period?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: { kiosks: { select: { id: true, code: true, name: true } } },
    });

    if (!partner) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');
    }

    let kioskIds = partner.kiosks.map((k) => k.id);
    if (options.kioskId && options.kioskId !== 'ALL') {
      const found = partner.kiosks.find((k) => k.id === options.kioskId);
      if (!found) throw new AppError(403, ErrorCode.FORBIDDEN, 'Booth tidak valid.');
      kioskIds = [found.id];
    }

    if (kioskIds.length === 0) {
      return {
        items: [],
        pagination: { total: 0, page: 1, limit: options.limit || 20, totalPages: 1 },
      };
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      kioskId: { in: kioskIds },
    };

    if (options.period && options.period !== 'all') {
      const { rangeStart, rangeEnd } = calculateWibDateRange(options.period, options.startDate, options.endDate);
      whereClause.createdAt = {
        gte: rangeStart,
        lte: rangeEnd,
      };
    } else if (options.startDate || options.endDate) {
      const { rangeStart, rangeEnd } = calculateWibDateRange('custom', options.startDate, options.endDate);
      whereClause.createdAt = {
        gte: rangeStart,
        lte: rangeEnd,
      };
    }

    if (options.status && options.status !== 'ALL') {
      if (options.status === 'SETTLED' || options.status === 'COMPLETED' || options.status === 'LUNAS') {
        whereClause.OR = [
          { state: 'COMPLETED' },
          { payments: { some: { transactionStatus: 'settlement' } } },
          { accessCode: { isNot: null } },
        ];
      } else {
        whereClause.state = options.status;
      }
    }

    if (options.search) {
      const q = options.search.trim();
      whereClause.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { package: { name: { contains: q, mode: 'insensitive' } } },
        { accessCode: { code: { contains: q, mode: 'insensitive' } } },
        { payments: { some: { orderId: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, sessions] = await Promise.all([
      this.prisma.session.count({ where: whereClause }),
      this.prisma.session.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          package: { select: { id: true, name: true } },
          kiosk: { select: { id: true, code: true, name: true } },
          accessCode: { select: { id: true, code: true, type: true, cashierName: true, customerNote: true } },
          payments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, orderId: true, paymentType: true, transactionStatus: true, grossAmount: true },
          },
        },
      }),
    ]);

    const items = sessions.map((s) => {
      const p = s.payments[0];
      const isTestBypass =
        s.totalPrice === 0 ||
        s.payments.some((pm) => pm.paymentType === 'TEST_BYPASS' || pm.paymentType === 'BYPASS_PARTNER');

      const isSettled =
        s.state === 'COMPLETED' ||
        s.payments.some((pm) => pm.transactionStatus === 'settlement') ||
        !!s.accessCode;

      let method = 'QRIS';
      if (isTestBypass) {
        method = 'Bypass (Mode Test)';
      } else if (s.accessCode) {
        method = 'Kode PASS';
      } else if (p?.paymentType === 'cash' || p?.paymentType === 'CASH_DESK') {
        method = 'Tunai Kasir';
      }

      const grossAmount = isTestBypass ? 0 : s.totalPrice;
      const partnerShare = isTestBypass ? 0 : Math.round((grossAmount * partner.revenueSharePct) / 100);
      const minjaRoyalty = isTestBypass ? 0 : grossAmount - partnerShare;

      return {
        id: s.id,
        sessionId: s.id,
        sessionCode: formatSessionCode(s.id),
        orderId: p?.orderId || `MJA-${s.id.slice(-6).toUpperCase()}`,
        kioskId: s.kioskId,
        kioskCode: s.kiosk?.code || '-',
        kioskName: s.kiosk?.name || '-',
        packageName: isTestBypass ? `${s.package?.name || 'Paket Foto'} (Test)` : (s.package?.name || 'Paket Standar'),
        additionalPrints: s.additionalPrints,
        grossAmount,
        partnerShare,
        minjaRoyalty,
        paymentMethod: method,
        isTest: isTestBypass,
        state: isTestBypass ? 'MODE_TEST' : s.state,
        statusLabel: isTestBypass ? 'Mode Test (Rp 0)' : (isSettled ? 'Lunas' : s.state === 'CANCELLED' ? 'Dibatalkan' : 'Menunggu'),
        photosPrinted: s.photosPrinted,
        cashierName: s.accessCode?.cashierName || '-',
        customerNote: s.accessCode?.customerNote || '-',
        createdAt: s.createdAt.toISOString(),
      };
    });

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Partner: Ekspor data transaksi terfilter ke format CSV
   */
  async exportPartnerTransactionsCsv(
    partnerId: string,
    options: {
      kioskId?: string;
      startDate?: string;
      endDate?: string;
      period?: string;
      status?: string;
      search?: string;
    }
  ) {
    const result = await this.getPartnerTransactions(partnerId, {
      ...options,
      page: 1,
      limit: 5000,
    });

    const headers = [
      'No',
      'Waktu',
      'Booth',
      'Kode Sesi',
      'Nomor Order',
      'Paket',
      'Cetak Ekstra',
      'Metode Pembayaran',
      'Total Kotor (Rp)',
      'Bagi Hasil Mitra (Rp)',
      'Royalti Minja (Rp)',
      'Status',
      'Kasir / Catatan',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = result.items.map((item, index) => {
      const d = new Date(item.createdAt);
      const timeStr = d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      return [
        index + 1,
        escapeCsv(timeStr),
        escapeCsv(`[${item.kioskCode}] ${item.kioskName}`),
        escapeCsv(item.sessionCode),
        escapeCsv(item.orderId),
        escapeCsv(item.packageName),
        item.additionalPrints,
        escapeCsv(item.paymentMethod),
        item.grossAmount,
        item.partnerShare,
        item.minjaRoyalty,
        escapeCsv(item.statusLabel),
        escapeCsv(item.cashierName !== '-' ? item.cashierName : item.customerNote),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Partner: Mengambil daftar sesi pelanggan per booth
   */
  async getPartnerSessions(
    partnerId: string,
    options: {
      kioskId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: { kiosks: { select: { id: true, code: true, name: true } } },
    });

    if (!partner) throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');

    let kioskIds = partner.kiosks.map((k) => k.id);
    if (options.kioskId && options.kioskId !== 'ALL') {
      const found = partner.kiosks.find((k) => k.id === options.kioskId);
      if (!found) throw new AppError(403, ErrorCode.FORBIDDEN, 'Booth tidak valid.');
      kioskIds = [found.id];
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      kioskId: { in: kioskIds },
    };

    if (options.startDate || options.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) whereClause.createdAt.gte = new Date(options.startDate);
      if (options.endDate) whereClause.createdAt.lte = new Date(options.endDate);
    }

    if (options.search) {
      const q = options.search.trim();
      whereClause.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { package: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, sessions] = await Promise.all([
      this.prisma.session.count({ where: whereClause }),
      this.prisma.session.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          package: { select: { id: true, name: true, price: true } },
          kiosk: { select: { id: true, code: true, name: true } },
          gallery: { select: { id: true, token: true, expiresAt: true } },
          deliveryJobs: { select: { id: true, email: true, status: true, channel: true } },
        },
      }),
    ]);

    const items = sessions.map((s) => ({
      id: s.id,
      sessionCode: formatSessionCode(s.id),
      kioskId: s.kioskId,
      kioskCode: s.kiosk?.code || '-',
      kioskName: s.kiosk?.name || '-',
      packageName: s.package?.name || 'Paket Standar',
      totalPrice: s.totalPrice,
      photosPrinted: s.photosPrinted,
      totalPrints: s.totalPrints,
      additionalPrints: s.additionalPrints,
      shotsTaken: s.shotsTaken,
      state: s.state,
      hasGallery: !!s.gallery,
      galleryToken: s.gallery?.token || null,
      emailDeliveryStatus: s.deliveryJobs.find((d) => d.channel === 'email')?.status || null,
      createdAt: s.createdAt.toISOString(),
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    }));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Partner: Mengambil daftar paket foto (master pusat + paket khusus mitra) dan status aktif/nonaktif per booth
   */
  async getPartnerPackages(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        kiosks: {
          select: {
            id: true,
            code: true,
            name: true,
            disabledPackageIds: true,
          },
        },
      },
    });

    if (!partner) throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');

    // Periksa apakah mitra sudah memiliki paket khusus cabang sendiri
    let partnerPackages = await (this.prisma.package as any).findMany({
      where: {
        partnerId,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // Jika mitra baru pertama kali membuka katalog atau belum punya paket cabang, otomatis duplikasi (override) paket master pusat
    if (partnerPackages.length === 0) {
      const masterPackages = await (this.prisma.package as any).findMany({
        where: { partnerId: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      if (masterPackages.length > 0) {
        for (const mp of masterPackages) {
          await (this.prisma.package as any).create({
            data: {
              partnerId,
              name: mp.name,
              description: mp.description || `Paket Cabang ${partner.name}`,
              price: mp.price,
              durationSeconds: mp.durationSeconds,
              maxShots: mp.maxShots,
              maxSelections: mp.maxSelections,
              defaultPrints: mp.defaultPrints,
              additionalPrintPrice: mp.additionalPrintPrice,
              isActive: true,
              sortOrder: mp.sortOrder,
            },
          });
        }

        // Ambil kembali daftar paket setelah duplikasi
        partnerPackages = await (this.prisma.package as any).findMany({
          where: {
            partnerId,
            isActive: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });
      }
    }

    return {
      packages: partnerPackages.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        durationSeconds: pkg.durationSeconds,
        maxShots: pkg.maxShots,
        maxSelections: pkg.maxSelections,
        totalPrints: pkg.defaultPrints,
        additionalPrintPrice: pkg.additionalPrintPrice,
        isCustom: true, // 100% hak milik mitra: full edit & deleteable
        partnerId: pkg.partnerId,
        isActive: pkg.isActive,
      })),
      kiosks: partner.kiosks.map((k) => ({
        id: k.id,
        code: k.code,
        name: k.name,
        disabledPackageIds: ((k.disabledPackageIds as string[]) || []).filter((id) => !id.startsWith('__CFG:')),
      })),
    };
  }

  /**
   * Partner: Membuat paket sesi custom baru khusus untuk cabang mitra
   */
  async createPartnerPackage(
    partnerId: string,
    input: {
      name: string;
      description?: string;
      price: number;
      durationSeconds?: number;
      maxShots?: number;
      maxSelections?: number;
      defaultPrints?: number;
      additionalPrintPrice?: number;
    }
  ) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');

    const created = await (this.prisma.package as any).create({
      data: {
        partnerId,
        name: input.name.trim(),
        description: input.description?.trim() || `Paket Khusus Mitra ${partner.name}`,
        price: input.price,
        durationSeconds: input.durationSeconds ?? 300,
        maxShots: input.maxShots ?? 8,
        maxSelections: input.maxSelections ?? 4,
        defaultPrints: input.defaultPrints ?? 2,
        additionalPrintPrice: input.additionalPrintPrice ?? 10000,
        isActive: true,
        sortOrder: 50,
      },
    });

    humanLogger.success('PACKAGE', `Mitra [${partner.name}] membuat paket sesi baru: "${created.name}" (Rp ${created.price.toLocaleString('id-ID')})`);

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      price: created.price,
      durationSeconds: created.durationSeconds,
      maxShots: created.maxShots,
      maxSelections: created.maxSelections,
      totalPrints: created.defaultPrints,
      additionalPrintPrice: created.additionalPrintPrice,
      isCustom: true,
      partnerId,
      isActive: created.isActive,
    };
  }

  /**
   * Partner: Memperbarui paket sesi custom milik mitra
   */
  async updatePartnerPackage(
    partnerId: string,
    packageId: string,
    input: {
      name?: string;
      description?: string;
      price?: number;
      durationSeconds?: number;
      maxShots?: number;
      maxSelections?: number;
      defaultPrints?: number;
      additionalPrintPrice?: number;
      isActive?: boolean;
    }
  ) {
    const pkg = await (this.prisma.package as any).findFirst({
      where: { id: packageId, partnerId },
    });
    if (!pkg) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Paket tidak ditemukan atau merupakan paket master pusat yang tidak dapat diedit mitra.');
    }

    const data: any = {};
    if (input.name) data.name = input.name.trim();
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.price !== undefined) data.price = input.price;
    if (input.durationSeconds !== undefined) data.durationSeconds = input.durationSeconds;
    if (input.maxShots !== undefined) data.maxShots = input.maxShots;
    if (input.maxSelections !== undefined) data.maxSelections = input.maxSelections;
    if (input.defaultPrints !== undefined) data.defaultPrints = input.defaultPrints;
    if (input.additionalPrintPrice !== undefined) data.additionalPrintPrice = input.additionalPrintPrice;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const updated = await (this.prisma.package as any).update({
      where: { id: packageId },
      data,
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      price: updated.price,
      durationSeconds: updated.durationSeconds,
      maxShots: updated.maxShots,
      maxSelections: updated.maxSelections,
      totalPrints: updated.defaultPrints,
      additionalPrintPrice: updated.additionalPrintPrice,
      isCustom: true,
      partnerId,
      isActive: updated.isActive,
    };
  }

  /**
   * Partner: Menghapus paket sesi milik mitra
   */
  async deletePartnerPackage(partnerId: string, packageId: string) {
    const pkg = await (this.prisma.package as any).findFirst({
      where: { id: packageId, partnerId },
    });
    if (!pkg) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Paket tidak ditemukan di cabang Anda.');
    }

    // Periksa apakah paket pernah dipakai di sesi pelanggan atau kode akses tunai
    const [sessionsCount, passCount] = await Promise.all([
      this.prisma.session.count({ where: { packageId } }),
      this.prisma.accessCode.count({ where: { packageId } }),
    ]);

    if (sessionsCount > 0 || passCount > 0) {
      // Soft-delete agar riwayat transaksi finansial & audit log tidak rusak
      await (this.prisma.package as any).update({
        where: { id: packageId },
        data: { isActive: false },
      });
    } else {
      // Hard-delete bila belum ada transaksi
      await (this.prisma.package as any).delete({
        where: { id: packageId },
      });
    }

    // Bersihkan dari daftar disabledPackageIds di seluruh booth mitra ini
    const kiosks = await this.prisma.kiosk.findMany({ where: { partnerId } });
    for (const k of kiosks) {
      const disabled = (k.disabledPackageIds as string[]) || [];
      if (disabled.includes(packageId)) {
        await this.prisma.kiosk.update({
          where: { id: k.id },
          data: { disabledPackageIds: disabled.filter((id) => id !== packageId) },
        });
      }
    }

    humanLogger.info('PACKAGE', `Mitra menghapus paket [${pkg.name}]`);

    return { success: true, message: `Paket ${pkg.name} berhasil dihapus dari booth Anda.` };
  }

  /**
   * Partner: Mengaktifkan/menonaktifkan paket tertentu pada booth miliknya
   */
  async updateKioskPackages(partnerId: string, kioskId: string, disabledPackageIds: string[]) {
    const kiosk = await this.prisma.kiosk.findFirst({
      where: { id: kioskId, partnerId },
    });

    if (!kiosk) throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan di akun Anda.');

    const CONFIG_KEY = '__CFG:PAPER_TRACKING_ON__';
    const hadTracking = Array.isArray(kiosk.disabledPackageIds) &&
      kiosk.disabledPackageIds.includes(CONFIG_KEY);

    let finalDisabled = disabledPackageIds.filter((id) => !id.startsWith('__CFG:'));
    if (hadTracking) {
      finalDisabled.push(CONFIG_KEY);
    }

    const updated = await this.prisma.kiosk.update({
      where: { id: kioskId },
      data: { disabledPackageIds: finalDisabled },
    });

    humanLogger.info('KIOSK', `Mitra memperbarui paket booth [${updated.code}], ${disabledPackageIds.length} paket dinonaktifkan.`);

    return {
      kioskId: updated.id,
      code: updated.code,
      disabledPackageIds: ((updated.disabledPackageIds as string[]) || []).filter((id) => !id.startsWith('__CFG:')),
    };
  }

  /**
   * Partner: Reset darurat booth & batalkan sesi yang macet
   */
  async remoteResetKiosk(partnerId: string, kioskId: string) {
    const kiosk = await this.prisma.kiosk.findFirst({
      where: { id: kioskId, partnerId },
    });

    if (!kiosk) throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan di akun Anda.');

    // Batalkan sesi yang sedang aktif
    const activeSession = await this.prisma.session.findFirst({
      where: {
        kioskId,
        state: {
          in: [
            'AWAITING_PAYMENT',
            'PAYMENT_CONFIRMED',
            'CAPTURE_ACTIVE',
            'PHOTO_REVIEW',
            'PHOTO_EDITING',
            'RENDERING',
            'PRINTING',
            'SHARING',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeSession) {
      await this.prisma.session.update({
        where: { id: activeSession.id },
        data: {
          state: 'CANCELLED',
          cancelReason: 'Direset dari jarak jauh oleh Mitra',
        },
      });
    }

    const updated = await this.prisma.kiosk.update({
      where: { id: kioskId },
      data: {
        status: 'ONLINE',
      },
    });

    humanLogger.info('KIOSK', `Mitra melakukan reset darurat pada booth [${updated.code}]`);

    return {
      success: true,
      kioskId: updated.id,
      code: updated.code,
      message: `Booth [${updated.code}] berhasil direset ke mode standby.`,
    };
  }

  /**
   * Partner: Bypass jarak jauh booth pilihan mitra
   * Meloloskan pembayaran sesi aktif langsung ke kamera atau membuatkan PASS bypass instan khusus booth ini
   */
  async remoteBypassKiosk(partnerId: string, kioskId: string) {
    const kiosk = await this.prisma.kiosk.findFirst({
      where: { id: kioskId, partnerId },
      include: { partner: true },
    });

    if (!kiosk) throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan di akun mitra Anda.');

    // 1. Periksa apakah ada sesi aktif yang sedang menunggu pembayaran di booth ini
    // Cek berdasarkan kioskId, dan fallback berdasarkan prefix ID sesi (contoh MJA01-)
    const cleanCode = (kiosk.code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let activeSession = await this.prisma.session.findFirst({
      where: {
        kioskId,
        state: 'AWAITING_PAYMENT',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!activeSession && cleanCode) {
      activeSession = await this.prisma.session.findFirst({
        where: {
          id: { startsWith: cleanCode },
          state: 'AWAITING_PAYMENT',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          payments: { orderBy: { createdAt: 'desc' } },
        },
      });
    }

    if (activeSession) {
      const now = new Date();
      if (activeSession.payments && activeSession.payments.length > 0) {
        await this.prisma.payment.updateMany({
          where: { sessionId: activeSession.id },
          data: {
            transactionStatus: 'settlement',
            paymentType: 'TEST_BYPASS',
            grossAmount: 0,
            settlementTime: now,
            isVerified: true,
          },
        });
      } else {
        await this.prisma.payment.create({
          data: {
            sessionId: activeSession.id,
            orderId: `BYPASS-${activeSession.id.slice(-8).toUpperCase()}-${Date.now().toString().slice(-4)}`,
            grossAmount: 0,
            paymentType: 'TEST_BYPASS',
            transactionStatus: 'settlement',
            isVerified: true,
            expiryTime: new Date(now.getTime() + 3600000),
            settlementTime: now,
          },
        });
      }

      await this.prisma.session.update({
        where: { id: activeSession.id },
        data: {
          kioskId: kiosk.id,
          state: 'PAYMENT_CONFIRMED',
          totalPrice: 0,
          basePrice: 0,
          additionalPrintCost: 0,
        },
      });

      humanLogger.success('KIOSK', `Mitra [${kiosk.partner.name}] meloloskan pembayaran (Bypass Mode Test) sesi aktif [${activeSession.id.slice(-6).toUpperCase()}] di booth [${kiosk.code}] (Gross Rp 0)`);

      return {
        success: true,
        mode: 'SESSION_BYPASS',
        sessionCode: activeSession.id.slice(-6).toUpperCase(),
        message: `Sesi aktif di booth [${kiosk.code}] berhasil diloloskan langsung ke kamera! (Mode Test: Rp 0, tidak masuk catatan pemasukan).`,
      };
    }

    // 2. Jika tidak ada sesi aktif, buatkan tiket PASS bypass sesi gratis 100% khusus booth ini
    const accessCodeService = new AccessCodeService(this.prisma);
    const defaultPackage = await this.prisma.package.findFirst({
      where: {
        OR: [
          { partnerId, isActive: true },
          { partnerId: null, isActive: true },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    const createdPass = await accessCodeService.createAccessCode({
      packageId: defaultPackage?.id || null,
      type: 'SESSION',
      extraPrints: 0,
      kioskId: kiosk.id,
      amount: 0,
      customerNote: 'Bypass Mandiri Mitra (Mode Test)',
      cashierName: `Mitra (${kiosk.partner.name})`,
      expiresInHours: 24,
      partnerId,
    });

    humanLogger.success('PASS', `Mitra [${kiosk.partner.name}] menerbitkan Kode PASS Bypass [${createdPass.code}] khusus booth [${kiosk.code}] (Mode Test Rp 0)`);

    return {
      success: true,
      mode: 'PASS_CODE_GENERATED',
      passCode: createdPass.code,
      message: `Kode PASS Bypass [${createdPass.code}] berhasil diterbitkan khusus booth [${kiosk.code}] (Mode Test: Rp 0).`,
    };
  }

  /**
   * Partner: Mengunci / Membuka booth (Maintenance Mode)
   */
  async remoteLockKiosk(partnerId: string, kioskId: string, isLocked: boolean, reason?: string) {
    const kiosk = await this.prisma.kiosk.findFirst({
      where: { id: kioskId, partnerId },
    });

    if (!kiosk) throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan di akun Anda.');

    const updated = await this.prisma.kiosk.update({
      where: { id: kioskId },
      data: {
        isLocked,
        lockReason: isLocked ? (reason || 'Pemeliharaan berkala oleh Mitra') : null,
        status: isLocked ? 'MAINTENANCE' : 'ONLINE',
      },
    });

    humanLogger.info('KIOSK', `Mitra ${isLocked ? 'MENGUNCI' : 'MEMBUKA'} booth [${updated.code}]`);

    return {
      success: true,
      kioskId: updated.id,
      code: updated.code,
      isLocked: updated.isLocked,
      lockReason: updated.lockReason,
      status: updated.status,
    };
  }
}

