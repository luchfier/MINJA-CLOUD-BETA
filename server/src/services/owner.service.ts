// server/src/services/owner.service.ts
// Service Super Admin / Owner Portal Multi-Tenant Network Analytics & Operations

import type { PrismaClient } from '@prisma/client';
import { EmailService } from './email.service.js';
import { calculateWibDateRange } from './partner.service.js';
import { formatSessionCode } from '../utils/session.util.js';
import { humanLogger } from '../utils/humanLogger.js';
import { getEnv } from '../config/env.js';
import { hashPin } from '../utils/auth.util.js';
import { AppError, ErrorCode } from '../types/common.types.js';

export class OwnerService {
  private emailService: EmailService;

  constructor(private prisma: PrismaClient) {
    this.emailService = new EmailService();
  }

  /**
   * Mengirim ulang soft file email ke pelanggan dari jarak jauh
   */
  public async resendEmail(sessionId: string, targetEmail?: string): Promise<{ sent: boolean; message: string }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        deliveryJobs: true,
        kiosk: { select: { name: true } },
        gallery: { select: { token: true } },
      },
    });

    if (!session) {
      throw new Error('Sesi tidak ditemukan');
    }

    const emailToSend = targetEmail || session.deliveryJobs.find((j) => j.email)?.email;
    if (!emailToSend) {
      throw new Error('Alamat email tujuan tidak ditemukan');
    }

    const boothName = session.kiosk?.name || 'Minja Photobooth';
    const baseUrl = (getEnv().GALLERY_BASE_URL || 'https://gallery.minja.my.id').replace(/\/+$/, '');
    const tokenQuery = session.gallery?.token ? `?token=${encodeURIComponent(session.gallery.token)}` : '';
    const galleryUrl = `${baseUrl}/s/${encodeURIComponent(session.id)}${tokenQuery}`;
    const code = formatSessionCode(session.id);

    const res = await this.emailService.sendGalleryNotification(
      emailToSend,
      galleryUrl,
      boothName,
      code
    );

    humanLogger.email(`Kirim ulang email berhasil dipicu dari jarak jauh ke: ${emailToSend} (Sesi: ${code})`);
    return { sent: res.sent, message: `Soft file berhasil dikirim ke ${emailToSend}` };
  }

  /**
   * Super Admin: Analitik Finansial Jaringan Terpadu (Multi-Tier Filter: Periode -> Mitra -> Booth)
   */
  public async getNetworkFinancialAnalytics(options: {
    period?: string;
    startDate?: string;
    endDate?: string;
    partnerId?: string;
    kioskId?: string;
  }) {
    // 1. Tentukan Rentang Waktu Presisi WIB (UTC+7)
    const period = options.period || 'today';
    const { rangeStart, rangeEnd, periodLabel } = calculateWibDateRange(
      period,
      options.startDate,
      options.endDate
    );

    // 2. Ambil Semua Mitra & Booth Terdaftar
    const allPartners = await this.prisma.partner.findMany({
      orderBy: { name: 'asc' },
      include: {
        kiosks: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            paperRemaining: true,
            paperRollCapacity: true,
            partnerId: true,
          },
        },
      },
    });

    const allKiosks = await this.prisma.kiosk.findMany({
      orderBy: { code: 'asc' },
      include: {
        partner: {
          select: { id: true, name: true, revenueSharePct: true },
        },
      },
    });

    // 3. Filter Target Kiosk IDs
    let targetKioskIds: string[] | null = null;
    if (options.partnerId && options.partnerId !== 'ALL') {
      const p = allPartners.find((item) => item.id === options.partnerId);
      const pKioskIds = p ? p.kiosks.map((k) => k.id) : [];
      if (options.kioskId && options.kioskId !== 'ALL') {
        targetKioskIds = pKioskIds.includes(options.kioskId) ? [options.kioskId] : [];
      } else {
        targetKioskIds = pKioskIds;
      }
    } else if (options.kioskId && options.kioskId !== 'ALL') {
      targetKioskIds = [options.kioskId];
    }

    // 4. Query Transaksi Settlement pada Periode Terpilih
    const paymentsWhere: any = {
      transactionStatus: 'settlement',
      createdAt: { gte: rangeStart, lte: rangeEnd },
      grossAmount: { gt: 0 },
      paymentType: { not: 'TEST_BYPASS' },
      orderId: { not: { startsWith: 'TEST-' } },
    };

    if (targetKioskIds !== null) {
      paymentsWhere.session = { kioskId: { in: targetKioskIds } };
    }

    // SELECT MINIMAL: hanya kolom yang dipakai agregasi (sebelumnya include penuh session/package/kiosk/partner
    // = ±1 MB per panggilan untuk 30 hari, dipolling tiap 8 detik → boros egress Supabase).
    // Data partner (revenueSharePct) diambil dari allKiosks yang sudah dimuat di atas.
    const settledPaymentsRaw = await this.prisma.payment.findMany({
      where: paymentsWhere,
      select: {
        grossAmount: true,
        orderId: true,
        paymentType: true,
        session: {
          select: {
            kioskId: true,
            basePrice: true,
            accessCode: { select: { id: true } },
          },
        },
      },
    });

    const kioskPartnerMap = new Map<string, { id: string; revenueSharePct: number } | null>();
    for (const k of allKiosks) {
      kioskPartnerMap.set(k.id, k.partner ? { id: k.partner.id, revenueSharePct: k.partner.revenueSharePct } : null);
    }
    const settledPayments = settledPaymentsRaw.map((p) => ({
      ...p,
      session: p.session
        ? {
            ...p.session,
            kiosk: { partner: p.session.kioskId ? kioskPartnerMap.get(p.session.kioskId) ?? null : null },
          }
        : null,
    }));

    // 5. Query Sesi pada Periode Terpilih
    const sessionsWhere: any = {
      createdAt: { gte: rangeStart, lte: rangeEnd },
      totalPrice: { gt: 0 },
    };
    if (targetKioskIds !== null) {
      sessionsWhere.kioskId = { in: targetKioskIds };
    }

    const sessions = await this.prisma.session.findMany({
      where: sessionsWhere,
      select: {
        totalPrints: true,
      },
    });

    // 6. Hitung Agregasi Finansial
    let grossRevenue = 0;
    let totalPartnerShare = 0;
    let totalMinjaRoyalty = 0;
    let qrisRevenue = 0;
    let qrisCount = 0;
    let cashDeskRevenue = 0;
    let cashDeskCount = 0;
    let cashPassRevenue = 0;
    let cashPassCount = 0;
    let extraPrintsRevenue = 0;
    let extraPrintsCount = 0;
    let voucherDiscountsTotal = 0;

    // Map pembayaran per mitra dan per kiosk untuk leaderboard & breakdown
    const partnerRevenueMap = new Map<string, { gross: number; partnerShare: number; minjaRoyalty: number; txCount: number }>();
    const kioskRevenueMap = new Map<string, { gross: number; txCount: number }>();

    for (const p of settledPayments) {
      const gross = p.grossAmount;
      grossRevenue += gross;

      // Identifikasi partner & revenue share
      const partner = p.session?.kiosk?.partner;
      const partnerId = partner?.id;
      const revenueSharePct = partner?.revenueSharePct ?? 70;

      let pShare = 0;
      let mRoyalty = gross;
      if (partnerId) {
        pShare = Math.round((gross * revenueSharePct) / 100);
        mRoyalty = gross - pShare;
        totalPartnerShare += pShare;
        totalMinjaRoyalty += mRoyalty;

        const pr = partnerRevenueMap.get(partnerId) || { gross: 0, partnerShare: 0, minjaRoyalty: 0, txCount: 0 };
        pr.gross += gross;
        pr.partnerShare += pShare;
        pr.minjaRoyalty += mRoyalty;
        pr.txCount++;
        partnerRevenueMap.set(partnerId, pr);
      } else {
        totalMinjaRoyalty += gross;
      }

      // Kiosk breakdown map
      const kioskId = p.session?.kioskId;
      if (kioskId) {
        const kr = kioskRevenueMap.get(kioskId) || { gross: 0, txCount: 0 };
        kr.gross += gross;
        kr.txCount++;
        kioskRevenueMap.set(kioskId, kr);
      }

      // Channel categorization
      const isExtra = p.orderId.includes('-EXT-');
      const isCashPass = p.paymentType === 'cash_access_code' || p.orderId.startsWith('CASH-CODE-') || Boolean(p.session?.accessCode);
      const isCashDesk = p.paymentType === 'cash' && !isCashPass;

      if (isExtra) {
        extraPrintsCount++;
        extraPrintsRevenue += gross;
      } else if (isCashPass) {
        cashPassCount++;
        cashPassRevenue += gross;
      } else if (isCashDesk) {
        cashDeskCount++;
        cashDeskRevenue += gross;
      } else {
        qrisCount++;
        qrisRevenue += gross;
      }

      // Voucher discount
      const basePrice = p.session?.basePrice || gross;
      if (basePrice > gross && !isExtra) {
        voucherDiscountsTotal += basePrice - gross;
      }
    }

    // Hitung Lembar Cetak
    let totalPrints = 0;
    for (const s of sessions) {
      totalPrints += s.totalPrints;
    }

    const transactionsCount = settledPayments.length;
    const totalSessions = sessions.length;
    const averageOrderValue = transactionsCount > 0 ? Math.round(grossRevenue / transactionsCount) : 0;

    // 7. Bangun Leaderboard Performa Mitra
    const partnersLeaderboard = allPartners.map((p) => {
      const stats = partnerRevenueMap.get(p.id) || { gross: 0, partnerShare: 0, minjaRoyalty: 0, txCount: 0 };
      return {
        partnerId: p.id,
        partnerName: p.name,
        email: p.email,
        revenueSharePct: p.revenueSharePct,
        kiosksCount: p.kiosks.length,
        grossRevenue: stats.gross,
        partnerShare: stats.partnerShare,
        minjaRoyalty: stats.minjaRoyalty,
        transactionsCount: stats.txCount,
      };
    }).sort((a, b) => b.grossRevenue - a.grossRevenue);

    // 8. Bangun Breakdown Kiosk
    const relevantKiosks = targetKioskIds !== null
      ? allKiosks.filter((k) => targetKioskIds!.includes(k.id))
      : allKiosks;

    const kiosksBreakdown = relevantKiosks.map((k) => {
      const stats = kioskRevenueMap.get(k.id) || { gross: 0, txCount: 0 };
      return {
        kioskId: k.id,
        kioskCode: k.code,
        kioskName: k.name,
        partnerId: k.partner?.id || null,
        partnerName: k.partner?.name || 'Minja Pusat (Direct)',
        status: k.status,
        paperRemaining: k.paperRemaining,
        paperRollCapacity: k.paperRollCapacity,
        grossRevenue: stats.gross,
        transactionsCount: stats.txCount,
      };
    }).sort((a, b) => b.grossRevenue - a.grossRevenue);

    // 9. Peringatan Kertas Kritis Jaringan (< 50 lembar)
    const criticalPaperAlerts = allKiosks
      .filter((k) => k.paperRemaining <= 50)
      .map((k) => ({
        kioskId: k.id,
        kioskCode: k.code,
        kioskName: k.name,
        partnerName: k.partner?.name || 'Minja Pusat',
        paperRemaining: k.paperRemaining,
        paperRollCapacity: k.paperRollCapacity,
        isOnline: k.status === 'ONLINE' || k.status === 'IN_SESSION' || k.status === 'PRINTING',
      }));

    return {
      period,
      periodLabel,
      startDate: rangeStart.toISOString(),
      endDate: rangeEnd.toISOString(),
      partnerId: options.partnerId || null,
      kioskId: options.kioskId || null,
      summary: {
        grossRevenue,
        partnerShare: totalPartnerShare,
        minjaRoyalty: totalMinjaRoyalty,
        transactionsCount,
        totalSessions,
        totalPrints,
        extraPrintsCount,
        extraPrintsRevenue,
        voucherDiscountsTotal,
        averageOrderValue,
      },
      breakdownByChannel: {
        qris: { count: qrisCount, total: qrisRevenue },
        cashDesk: { count: cashDeskCount, total: cashDeskRevenue },
        cashPass: { count: cashPassCount, total: cashPassRevenue },
        extraPrints: { count: extraPrintsCount, total: extraPrintsRevenue },
      },
      partnersLeaderboard,
      kiosksBreakdown,
      criticalPaperAlerts,
    };
  }

  /**
   * Super Admin: Master Drilldown Detail Mitra (Semua Booth, Paket, Voucher, Kasir, dan Finansial)
   */
  public async getPartnerDrilldown(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        kiosks: {
          select: {
            id: true,
            code: true,
            name: true,
            location: true,
            status: true,
            paperRemaining: true,
            paperRollCapacity: true,
            isLocked: true,
            lockReason: true,
            disabledPackageIds: true,
            lastHeartbeat: true,
          },
        },
        operators: {
          select: {
            id: true,
            name: true,
            username: true,
            kioskId: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!partner) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan.');
    }

    const kioskIds = partner.kiosks.map((k) => k.id);

    // Ambil Voucher yang dibuat mitra atau tertuju ke booth mitra
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        OR: [
          { partnerId: partner.id },
          { kioskId: { in: kioskIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        kiosk: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Ambil Paket yang tersedia di sistem
    const allPackages = await this.prisma.package.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    // Ambil Kode Akses Tunai (PASS-XXXX) yang dibuat di booth mitra ini
    const accessCodes = await this.prisma.accessCode.findMany({
      where: {
        OR: [
          { kioskId: { in: kioskIds } },
          { operator: { partnerId: partner.id } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        kiosk: { select: { id: true, code: true, name: true } },
        package: { select: { id: true, name: true, price: true } },
      },
    });

    // Agregasi Finansial Mitra (All-Time & 30 Hari Terakhir)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const payments = await this.prisma.payment.findMany({
      where: {
        transactionStatus: 'settlement',
        paymentType: { not: 'TEST_BYPASS' },
        orderId: { not: { startsWith: 'TEST-' } },
        session: { kioskId: { in: kioskIds } },
      },
      select: {
        grossAmount: true,
        createdAt: true,
      },
    });

    let totalGrossRevenue = 0;
    let totalTransactions = 0;
    let monthlyGrossRevenue = 0;

    for (const p of payments) {
      totalGrossRevenue += p.grossAmount;
      totalTransactions++;
      if (p.createdAt >= thirtyDaysAgo) {
        monthlyGrossRevenue += p.grossAmount;
      }
    }

    const partnerSharePct = partner.revenueSharePct ?? 70;
    const totalPartnerShare = Math.round((totalGrossRevenue * partnerSharePct) / 100);
    const totalMinjaRoyalty = totalGrossRevenue - totalPartnerShare;
    const monthlyPartnerShare = Math.round((monthlyGrossRevenue * partnerSharePct) / 100);

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        revenueSharePct: partner.revenueSharePct,
        receiptHeader: partner.receiptHeader,
        receiptFooter: partner.receiptFooter,
        isActive: partner.isActive,
        createdAt: partner.createdAt.toISOString(),
      },
      kiosks: partner.kiosks,
      operators: partner.operators.map((op) => ({
        ...op,
        createdAt: op.createdAt.toISOString(),
        lastLoginAt: op.lastLoginAt?.toISOString() || null,
        kioskName: partner.kiosks.find((k) => k.id === op.kioskId)?.name || 'Semua Booth',
      })),
      vouchers: vouchers.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        discountType: v.discountType,
        discountValue: v.discountValue,
        minSpend: v.minSpend,
        maxDiscount: v.maxDiscount,
        validFrom: v.validFrom.toISOString(),
        validUntil: v.validUntil.toISOString(),
        usageLimit: v.usageLimit,
        usedCount: v.usedCount,
        isActive: v.isActive,
        kioskCode: v.kiosk?.code || null,
        kioskName: v.kiosk?.name || 'Semua Booth Mitra',
      })),
      packages: allPackages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        maxShots: pkg.maxShots,
        defaultPrints: pkg.defaultPrints,
        durationSeconds: pkg.durationSeconds,
      })),
      accessCodes: accessCodes.map((ac) => ({
        id: ac.id,
        code: ac.code,
        amount: ac.amount,
        type: ac.type,
        extraPrints: ac.extraPrints,
        status: ac.status,
        customerNote: ac.customerNote,
        cashierName: ac.cashierName,
        packageName: ac.package?.name || 'Paket Kustom',
        kioskCode: ac.kiosk?.code || null,
        kioskName: ac.kiosk?.name || 'Semua Booth',
        expiresAt: ac.expiresAt.toISOString(),
        usedAt: ac.usedAt?.toISOString() || null,
        createdAt: ac.createdAt.toISOString(),
      })),
      financialSummary: {
        totalGrossRevenue,
        totalPartnerShare,
        totalMinjaRoyalty,
        totalTransactions,
        monthlyGrossRevenue,
        monthlyPartnerShare,
      },
    };
  }

  /**
   * Super Admin: Mengambil Sesi Pelanggan Jaringan Terpadu dengan Identitas Lengkap
   * (Nama Mitra, Kode & Nama Booth, Nama Kasir, ID Sesi Unik MJA-YYYYMMDD-XXXX, Paket, Status Cetak & Email)
   */
  public async getNetworkSessions(options: {
    partnerId?: string;
    kioskId?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const limit = options.limit && options.limit > 0 ? Math.min(100, options.limit) : 25;
    const page = options.page && options.page > 0 ? options.page : 1;
    const skip = (page - 1) * limit;

    const where: any = {
      totalPrice: { gt: 0 },
    };

    if (options.kioskId && options.kioskId !== 'ALL') {
      where.kioskId = options.kioskId;
    } else if (options.partnerId && options.partnerId !== 'ALL') {
      const partnerKiosks = await this.prisma.kiosk.findMany({
        where: { partnerId: options.partnerId },
        select: { id: true },
      });
      where.kioskId = { in: partnerKiosks.map((k) => k.id) };
    }

    if (options.status && options.status !== 'ALL') {
      where.state = options.status;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { package: { name: { contains: q, mode: 'insensitive' } } },
        { kiosk: { name: { contains: q, mode: 'insensitive' } } },
        { kiosk: { code: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, sessions] = await Promise.all([
      this.prisma.session.count({ where }),
      this.prisma.session.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        // SELECT MINIMAL (hemat egress): hanya kolom yang dipetakan ke response di bawah
        select: {
          id: true,
          kioskId: true,
          totalPrice: true,
          totalPrints: true,
          photosPrinted: true,
          state: true,
          createdAt: true,
          package: { select: { name: true } },
          kiosk: { select: { code: true, name: true, partnerId: true, partner: { select: { name: true } } } },
          accessCode: { select: { cashierName: true, operator: { select: { name: true } } } },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { paymentType: true, transactionStatus: true, orderId: true },
          },
          deliveryJobs: { select: { channel: true, status: true, email: true, sentAt: true } },
          photos: { select: { id: true, storageUrl: true }, take: 4 },
        },
      }),
    ]);

    const r2Domain = (process.env.R2_PUBLIC_DOMAIN || 'https://tampung.minja.my.id').replace(/\/+$/, '');

    const items = sessions.map((s) => {
      const files = s.photos && s.photos.length > 0
        ? s.photos.map((p, idx) => ({
            fileName: idx === 0 ? 'design_1.jpg' : `pose_${idx}.jpg`,
            publicUrl: p.storageUrl || `${r2Domain}/${encodeURIComponent(s.id)}/design_1.jpg`,
            sizeBytes: 0,
          }))
        : s.state === 'COMPLETED'
          ? [{ fileName: 'design_1.jpg', publicUrl: `${r2Domain}/${encodeURIComponent(s.id)}/design_1.jpg`, sizeBytes: 0 }]
          : [];
      const lastPayment = s.payments[0] || null;
      const emailJob = s.deliveryJobs.find((j) => j.channel === 'email');

      // Ambil nama kasir dari AccessCode operator atau fallback cashierName
      const cashierName = s.accessCode?.operator?.name || s.accessCode?.cashierName || (lastPayment?.paymentType === 'cash' ? 'Petugas Kasir' : 'Self-Service');

      return {
        id: s.id,
        sessionCode: formatSessionCode(s.id),
        kioskId: s.kioskId || null,
        kioskCode: s.kiosk?.code || 'LOCAL',
        kioskName: s.kiosk?.name || 'Local Standalone Booth',
        partnerId: s.kiosk?.partnerId || null,
        partnerName: s.kiosk?.partner?.name || 'Minja Pusat (Direct)',
        cashierName,
        packageName: s.package?.name || 'Paket Foto',
        totalPrice: s.totalPrice,
        totalPrints: s.totalPrints,
        photosPrinted: s.photosPrinted,
        paymentMethod: lastPayment?.paymentType || 'UNPAID',
        paymentStatus: lastPayment?.transactionStatus || 'unpaid',
        orderId: lastPayment?.orderId || null,
        state: s.state,
        createdAt: s.createdAt.toISOString(),
        emailDelivery: emailJob
          ? {
              status: emailJob.status,
              email: emailJob.email,
              sentAt: emailJob.sentAt?.toISOString() || null,
            }
          : null,
        files: files.map((f: { fileName: string; publicUrl: string; sizeBytes: number }) => ({
          fileName: f.fileName,
          url: f.publicUrl,
          sizeBytes: f.sizeBytes,
          category: f.fileName.includes('strip') || f.fileName.includes('frame')
            ? 'Photo Frame'
            : f.fileName.endsWith('.mp4')
              ? 'Live Video'
              : 'Single Cut',
        })),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Super Admin: Reset PIN Kasir / Operator Mitra
   */
  public async resetOperatorPin(operatorId: string, newPin: string) {
    if (!newPin || newPin.trim().length < 4) {
      throw new AppError(400, ErrorCode.PIN_TOO_SHORT, 'PIN Kasir minimal 4 digit angka.');
    }

    const op = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: { partner: true },
    });

    if (!op) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Operator kasir tidak ditemukan.');
    }

    const pinHash = await hashPin(newPin.trim());
    await this.prisma.operator.update({
      where: { id: operatorId },
      data: { pinHash },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'OPERATOR_PIN_RESET_BY_ADMIN',
        details: {
          operatorId: op.id,
          operatorName: op.name,
          partnerId: op.partnerId,
          partnerName: op.partner.name,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {});

    humanLogger.success('OPERATOR', `🔑 PIN Kasir [${op.name}] (${op.partner.name}) berhasil direset oleh Super Admin.`);

    return {
      success: true,
      message: `PIN kasir untuk ${op.name} berhasil diperbarui.`,
    };
  }

  /**
   * Super Admin: Remote Reset Sesi Berjalan pada Booth Tertentu
   */
  public async remoteResetKioskSession(kioskId: string) {
    const kiosk = await this.prisma.kiosk.findUnique({ where: { id: kioskId } });
    if (!kiosk) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan.');
    }

    // Cari sesi yang aktif berjalan di kiosk ini
    const activeSessions = await this.prisma.session.findMany({
      where: {
        kioskId,
        state: { notIn: ['COMPLETED', 'CANCELLED', 'EXPIRED'] },
      },
    });

    for (const session of activeSessions) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          state: 'CANCELLED',
          cancelReason: 'Direset dari Admin Control Center',
        },
      });
    }

    await this.prisma.kiosk.update({
      where: { id: kioskId },
      data: { status: 'ONLINE' },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'KIOSK_REMOTE_RESET',
        details: {
          kioskId,
          kioskCode: kiosk.code,
          kioskName: kiosk.name,
          cancelledCount: activeSessions.length,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {});

    humanLogger.warn('KIOSK', `🔄 Booth [${kiosk.code} - ${kiosk.name}] berhasil direset jarak jauh.`);

    return {
      success: true,
      cancelledSessionsCount: activeSessions.length,
      message: `Booth ${kiosk.name} berhasil direset.`,
    };
  }

  /**
   * Super Admin: Konfigurasi Paket yang Dinonaktifkan per Booth
   */
  public async updateKioskPackages(kioskId: string, disabledPackageIds: string[]) {
    const kiosk = await this.prisma.kiosk.findUnique({ where: { id: kioskId } });
    if (!kiosk) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Booth tidak ditemukan.');
    }

    const updated = await this.prisma.kiosk.update({
      where: { id: kioskId },
      data: { disabledPackageIds },
    });

    return {
      success: true,
      disabledPackageIds: (updated.disabledPackageIds as string[]) || [],
      message: `Pengaturan paket untuk ${kiosk.name} berhasil disimpan.`,
    };
  }
}

