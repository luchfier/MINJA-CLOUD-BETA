// server/src/services/owner.service.ts
// Service Pengelolaan Jarak Jauh (Remote Owner Telemetry & Kiosk Management)
// Dirancang untuk akses via Cloudflare Tunnel / Jaringan Lokal

import type { PrismaClient } from '@prisma/client';
import { SyncQueueService } from './syncQueue.service.js';
import { cleanupService } from './cleanup.service.js';
import { StorageService } from './storage.service.js';
import { EmailService } from './email.service.js';
import { formatSessionCode } from '../utils/session.util.js';
import { humanLogger } from '../utils/humanLogger.js';
import { getEnv } from '../config/env.js';
import { hashPin } from '../utils/auth.util.js';
import { AppError, ErrorCode } from '../types/common.types.js';

export interface TunnelConfig {
  tunnelUrl: string;
  provider: 'cloudflare' | 'custom';
  updatedAt: string;
  isActive: boolean;
}

export interface OwnerTelemetryDto {
  kioskStatus: 'IDLE' | 'IN_SESSION' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE';
  isMaintenance: boolean;
  maintenanceReason?: string;
  boothName: string;
  activeSession: {
    sessionId: string;
    sessionCode: string;
    packageName: string;
    state: string;
    totalPrice: number;
    totalPrints: number;
  } | null;
  financialToday: {
    totalRevenue: number;
    qrisRevenue: number;
    cashRevenue: number;
    transactionsCount: number;
    totalSessions: number;
    completedSessions: number;
    totalPrints: number;
    estimatedPaperRemaining: number;
    paperRollCapacity: number;
  };
  hardware: {
    selectedPrinter: string;
    isPrinterOnline: boolean;
    detectedPrintersCount: number;
  };
  syncStatus: {
    isOnline: boolean;
    isDatabaseConnected: boolean;
    pendingQueueCount: number;
    failedQueueCount: number;
    lastSyncAt: string | null;
  };
  tunnel: TunnelConfig;
  serverTime: string;
}

export interface TestSessionTrigger {
  id: string;
  packageId?: string;
  virtualPrint: boolean;
  createdAt: number;
}

export class OwnerService {
  public static currentMaintenanceReason = 'Pengisian ulang kertas foto / pemeliharaan berkala';
  public static pendingTestTrigger: TestSessionTrigger | null = null;

  public static getMaintenanceReason(): string {
    return OwnerService.currentMaintenanceReason;
  }

  public static getPendingTestTrigger(): TestSessionTrigger | null {
    if (OwnerService.pendingTestTrigger) {
      // Auto-expire setelah 60 detik jika tidak di-acknowledge oleh kiosk
      if (Date.now() - OwnerService.pendingTestTrigger.createdAt > 60000) {
        OwnerService.pendingTestTrigger = null;
        return null;
      }
    }
    return OwnerService.pendingTestTrigger;
  }

  public static consumeTestTrigger(id?: string): boolean {
    if (!OwnerService.pendingTestTrigger) return false;
    if (!id || OwnerService.pendingTestTrigger.id === id) {
      OwnerService.pendingTestTrigger = null;
      return true;
    }
    return false;
  }

  private currentTunnelConfig: TunnelConfig;
  private storageService: StorageService;
  private emailService: EmailService;

  constructor(
    private prisma: PrismaClient,
    private syncQueueService: SyncQueueService
  ) {
    let publicUrl = '';
    try {
      publicUrl = getEnv().GALLERY_BASE_URL || '';
    } catch {
      // fallback jika env belum dimuat pada initial unit testing
    }

    this.currentTunnelConfig = {
      tunnelUrl: publicUrl,
      provider: 'custom',
      updatedAt: new Date().toISOString(),
      isActive: Boolean(publicUrl),
    };

    this.storageService = new StorageService();
    this.emailService = new EmailService();
  }

  public getTunnelConfig(): TunnelConfig {
    if (!this.currentTunnelConfig.tunnelUrl) {
      try {
        const publicUrl = getEnv().GALLERY_BASE_URL || '';
        if (publicUrl) {
          this.currentTunnelConfig.tunnelUrl = publicUrl;
          this.currentTunnelConfig.isActive = true;
        }
      } catch {}
    }
    return { ...this.currentTunnelConfig };
  }

  public setTunnelUrl(url: string, isActive = true): TunnelConfig {
    this.currentTunnelConfig = {
      tunnelUrl: url.trim(),
      provider: 'custom',
      updatedAt: new Date().toISOString(),
      isActive,
    };
    humanLogger.info('CONFIG', `Public Portal URL diperbarui: ${url || '(dinonaktifkan)'}`);
    return this.getTunnelConfig();
  }

  /**
   * Mengambil Telemetri Real-Time Booth untuk Owner
   */
  public async getTelemetry(): Promise<OwnerTelemetryDto> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // 1. Data Pengaturan & Status Maintenance
    let boothName = 'Minja Studio Booth';
    let isMaintenance = false;
    let selectedPrinterName = 'Default Printer';

    try {
      const settings = await this.prisma.settings.findFirst();
      if (settings) {
        boothName = settings.boothName || settings.brandTitle || boothName;
        isMaintenance = settings.maintenanceMode;
        selectedPrinterName = settings.selectedPrinterName || selectedPrinterName;
      }
    } catch {
      // Degraded mode jika DB offline
    }

    // 2. Data Finansial Hari Ini (Khusus transaksi komersial riil)
    let totalRevenue = 0;
    let qrisRevenue = 0;
    let cashRevenue = 0;
    let transactionsCount = 0;

    try {
      const todayPayments = await this.prisma.payment.findMany({
        where: {
          transactionStatus: 'settlement',
          createdAt: { gte: startOfToday },
          grossAmount: { gt: 0 },
          paymentType: { not: 'TEST_BYPASS' },
          orderId: { not: { startsWith: 'TEST-' } },
        },
      });

      for (const p of todayPayments) {
        totalRevenue += p.grossAmount;
        transactionsCount++;
        if (p.paymentType === 'cash') {
          cashRevenue += p.grossAmount;
        } else {
          qrisRevenue += p.grossAmount;
        }
      }
    } catch { }

    // 3. Data Sesi & Lembar Cetak Hari Ini (Khusus sesi riil komersial)
    let totalSessions = 0;
    let completedSessions = 0;
    let totalPrints = 0;
    let activeSessionDto: OwnerTelemetryDto['activeSession'] = null;

    try {
      const todaySessions = await this.prisma.session.findMany({
        where: {
          createdAt: { gte: startOfToday },
          totalPrice: { gt: 0 },
        },
        include: { package: true },
        orderBy: { createdAt: 'desc' },
      });

      totalSessions = todaySessions.length;

      for (const s of todaySessions) {
        totalPrints += s.totalPrints;
        if (s.state === 'COMPLETED' || s.state === 'SHARING') {
          completedSessions++;
        }
      }

      // Cari sesi yang sedang aktif berjalan di layar booth
      const currentActive = todaySessions.find(
        (s) =>
          !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(s.state) &&
          new Date(s.expiresAt) > now
      );

      if (currentActive) {
        activeSessionDto = {
          sessionId: currentActive.id,
          sessionCode: formatSessionCode(currentActive.id),
          packageName: currentActive.package?.name || 'Paket Foto',
          state: currentActive.state,
          totalPrice: currentActive.totalPrice,
          totalPrints: currentActive.totalPrints,
        };
      }
    } catch { }

    // 4. Hitung Estimasi Sisa Kertas (Kapasitas roll standar 400 lembar per roll)
    const paperRollCapacity = 400;
    const estimatedPaperRemaining = Math.max(0, paperRollCapacity - (totalPrints % paperRollCapacity));

    // 5. Hardware Status (telemetri printer dari armada booth online)
    let detectedPrintersCount = 0;
    try {
      const activePrinterKiosks = await this.prisma.kiosk.count({
        where: { printerStatus: 'READY' },
      });
      detectedPrintersCount = activePrinterKiosks;
    } catch { }

    // 6. Sync Queue Status
    const queueStatus = this.syncQueueService
      ? this.syncQueueService.getStatus()
      : { isOnline: true, isDatabaseConnected: true, pendingCount: 0, failedCount: 0, lastSyncAt: null };

    // 7. Tentukan Kiosk Status Keseluruhan
    let kioskStatus: OwnerTelemetryDto['kioskStatus'] = 'IDLE';
    if (isMaintenance) {
      kioskStatus = 'MAINTENANCE';
    } else if (activeSessionDto) {
      kioskStatus = activeSessionDto.state === 'PRINTING' ? 'PRINTING' : 'IN_SESSION';
    }

    return {
      kioskStatus,
      isMaintenance,
      maintenanceReason: isMaintenance ? OwnerService.currentMaintenanceReason : undefined,
      boothName,
      activeSession: activeSessionDto,
      financialToday: {
        totalRevenue,
        qrisRevenue,
        cashRevenue,
        transactionsCount,
        totalSessions,
        completedSessions,
        totalPrints,
        estimatedPaperRemaining,
        paperRollCapacity,
      },
      hardware: {
        selectedPrinter: selectedPrinterName,
        isPrinterOnline: detectedPrintersCount > 0,
        detectedPrintersCount,
      },
      syncStatus: {
        isOnline: queueStatus.isOnline,
        isDatabaseConnected: queueStatus.isDatabaseConnected,
        pendingQueueCount: queueStatus.pendingCount,
        failedQueueCount: queueStatus.failedCount,
        lastSyncAt: queueStatus.lastSyncAt,
      },
      tunnel: this.getTunnelConfig(),
      serverTime: now.toISOString(),
    };
  }

  /**
   * Kunci / Buka Kiosk (Toggle Mode Maintenance)
   */
  public async toggleMaintenanceMode(
    enabled: boolean,
    reason?: string
  ): Promise<{ maintenanceMode: boolean; reason?: string }> {
    try {
      if (enabled && reason && reason.trim()) {
        OwnerService.currentMaintenanceReason = reason.trim();
      }

      const settings = await this.prisma.settings.findFirst();
      if (settings) {
        await this.prisma.settings.update({
          where: { id: settings.id },
          data: { maintenanceMode: enabled },
        });
      }

      await this.prisma.auditLog.create({
        data: {
          action: enabled ? 'REMOTE_KIOSK_LOCKED' : 'REMOTE_KIOSK_UNLOCKED',
          details: {
            reason: enabled ? OwnerService.currentMaintenanceReason : undefined,
            source: 'Admin / Owner Portal',
            timestamp: new Date().toISOString(),
          },
        },
      }).catch(() => { });

      if (enabled) {
        humanLogger.warn('SERVER', `🔒 Kiosk DIKUNCI: ${OwnerService.currentMaintenanceReason}`);
      } else {
        humanLogger.success('SERVER', '🔓 Kiosk DIBUKA kembali dan siap melayani');
      }

      return {
        maintenanceMode: enabled,
        reason: enabled ? OwnerService.currentMaintenanceReason : undefined,
      };
    } catch (err) {
      humanLogger.error('SERVER', 'Gagal mengubah status maintenance mode', err);
      return { maintenanceMode: enabled };
    }
  }

  /**
   * Memicu Sesi Uji Coba Kiosk (Bypass Pembayaran untuk Instalasi/Kalibrasi)
   * Sesi ini 100% terisolasi dari laporan keuangan dan omzet.
   */
  public async triggerTestSession(
    packageId?: string,
    virtualPrint: boolean = true
  ): Promise<TestSessionTrigger> {
    const trigger: TestSessionTrigger = {
      id: `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      packageId,
      virtualPrint,
      createdAt: Date.now(),
    };
    OwnerService.pendingTestTrigger = trigger;

    await this.prisma.auditLog.create({
      data: {
        action: 'TEST_SESSION_TRIGGERED',
        details: {
          triggerId: trigger.id,
          virtualPrint,
          packageId,
          source: 'Owner Portal (Remote)',
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {});

    humanLogger.info('TEST_SESSION', `🚀 Sesi Uji Coba Kiosk dipicu dari Owner Portal (Virtual Print: ${virtualPrint})`);
    return trigger;
  }

  /**
   * Mengambil riwayat sesi hari ini lengkap dengan thumbnail & status pengiriman
   */
  public async getTodaySessions(limit = 50): Promise<any[]> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    try {
      const sessions = await this.prisma.session.findMany({
        where: { createdAt: { gte: startOfToday } },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          package: true,
          payments: true,
          deliveryJobs: true,
        },
      });

      return sessions.map((s) => {
        // Ambil file foto lokal yang tersedia
        const files = this.storageService.getSessionFiles(s.id);
        const lastPayment = s.payments[s.payments.length - 1];
        const emailJob = s.deliveryJobs.find((j) => j.channel === 'email');

        return {
          id: s.id,
          sessionCode: formatSessionCode(s.id),
          packageName: s.package?.name || 'Paket Foto',
          state: s.state,
          totalPrice: s.totalPrice,
          totalPrints: s.totalPrints,
          createdAt: s.createdAt.toISOString(),
          payment: lastPayment
            ? {
              orderId: lastPayment.orderId,
              paymentType: lastPayment.paymentType,
              grossAmount: lastPayment.grossAmount,
              status: lastPayment.transactionStatus,
              settlementTime: lastPayment.settlementTime?.toISOString() || null,
            }
            : null,
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
    } catch {
      return [];
    }
  }

  /**
   * Memicu sinkronisasi manual antrean cloud
   */
  public async triggerForceSync(): Promise<{ processed: number; succeeded: number; failed: number }> {
    humanLogger.sync('⚡ Owner memicu Force Sync Cloud dari jarak jauh');
    return this.syncQueueService.drainQueue();
  }

  /**
   * Memicu pembersihan disk sementara dari jarak jauh
   */
  public async triggerCleanup(): Promise<{ deleted: number; freedBytes: number }> {
    humanLogger.cleanup('🧹 Owner memicu Pembersihan Disk dari jarak jauh');
    return cleanupService.cleanOldPrintFiles(2);
  }

  /**
   * Mendaftarkan perintah uji cetak ke antrean kiosk
   */
  public async triggerTestPrint(kioskId?: string): Promise<{ success: boolean; message: string }> {
    if (kioskId) {
      const { KioskService } = await import('./kiosk.service.js');
      KioskService.queuePrintCommand(kioskId, {
        id: `test_print_${Date.now()}`,
        sessionId: 'TEST_PRINT',
        copies: 1,
        reason: 'Test print dari Owner Portal',
        requestedBy: 'Owner',
        createdAt: new Date().toISOString(),
      });
      return { success: true, message: `Perintah test print berhasil didaftarkan ke antrean booth [${kioskId}].` };
    }
    return { success: true, message: 'Test print acknowledge (pilih kiosk tujuan untuk cetak fisik).' };
  }

  /**
   * Mengirim ulang soft file email ke pelanggan dari jarak jauh
   */
  public async resendEmail(sessionId: string, targetEmail?: string): Promise<{ sent: boolean; message: string }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { deliveryJobs: true },
    });

    if (!session) {
      throw new Error('Sesi tidak ditemukan');
    }

    const emailToSend = targetEmail || session.deliveryJobs.find((j) => j.email)?.email;
    if (!emailToSend) {
      throw new Error('Alamat email tujuan tidak ditemukan');
    }

    const boothName = 'Minja Studio';
    const galleryUrl = `http://localhost:3000/s/${session.id}`;
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
    // 1. Tentukan Rentang Waktu
    const now = new Date();
    let rangeStart = new Date(now);
    let rangeEnd = new Date(now);
    let periodLabel = 'Hari Ini';
    const period = options.period || 'today';

    if (period === 'today') {
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);
      periodLabel = 'Hari Ini';
    } else if (period === 'yesterday') {
      rangeStart.setDate(rangeStart.getDate() - 1);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setDate(rangeEnd.getDate() - 1);
      rangeEnd.setHours(23, 59, 59, 999);
      periodLabel = 'Kemarin';
    } else if (period === '7d') {
      rangeStart.setDate(rangeStart.getDate() - 6);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);
      periodLabel = '7 Hari Terakhir';
    } else if (period === '30d') {
      rangeStart.setDate(rangeStart.getDate() - 29);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);
      periodLabel = '30 Hari Terakhir';
    } else if (period === 'this_month') {
      rangeStart.setDate(1);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);
      periodLabel = 'Bulan Ini';
    } else if (period === 'last_month') {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      periodLabel = 'Bulan Lalu';
    } else if (period === 'custom' && options.startDate && options.endDate) {
      rangeStart = new Date(options.startDate);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(options.endDate);
      rangeEnd.setHours(23, 59, 59, 999);
      periodLabel = `${options.startDate} s/d ${options.endDate}`;
    }

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

    const settledPayments = await this.prisma.payment.findMany({
      where: paymentsWhere,
      include: {
        session: {
          include: {
            package: true,
            accessCode: true,
            kiosk: {
              include: {
                partner: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
        id: true,
        totalPrints: true,
        additionalPrints: true,
        totalPrice: true,
        state: true,
        kioskId: true,
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
        rawPassword: (partner as any).rawPassword || null,
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
        include: {
          package: true,
          kiosk: {
            include: {
              partner: true,
            },
          },
          accessCode: {
            include: {
              operator: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          deliveryJobs: true,
        },
      }),
    ]);

    const items = sessions.map((s) => {
      const files = this.storageService.getSessionFiles(s.id);
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

