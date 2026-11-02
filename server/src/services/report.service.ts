// src/services/report.service.ts
// Service Laporan Transaksi, Finansial, dan Kasir Tunai
// Sesuai API_CONTRACT.md §3.6 & §3.12

import type { PrismaClient } from '@prisma/client';
import { formatSessionCode } from '../utils/session.util.js';

export class ReportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Mengambil ringkasan metrik finansial & performa booth sesuai periode
   */
  async getReportsSummary(params?: {
    dateMode?: 'today' | 'monthly' | 'custom' | 'all';
    selectedDate?: string;
    selectedMonth?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalRevenue: number;
    totalSessions: number;
    completedSessions: number;
    failedSessions: number;
    totalPrints: number;
    averageSessionDurationSeconds: number;
    qrisRevenue: number;
    cashRevenue: number;
    totalDiscountGiven: number;
    periodLabel: string;
  }> {
    const where: any = {};
    let periodLabel = 'Semua Waktu';
    const now = new Date();

    if (params?.dateMode === 'today') {
      const targetDate = params.selectedDate ? new Date(params.selectedDate) : now;
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
      periodLabel = `Hari Ini (${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (params?.dateMode === 'monthly') {
      const monthStr = params.selectedMonth || now.toISOString().slice(0, 7);
      const parts = monthStr.split('-').map(Number);
      const y = parts[0] ?? now.getFullYear();
      const m = parts[1] ?? (now.getMonth() + 1);
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
      const mName = start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      periodLabel = `Bulan ${mName}`;
    } else if (params?.dateMode === 'custom' || params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params?.startDate) {
        const s = new Date(params.startDate);
        s.setHours(0, 0, 0, 0);
        where.createdAt.gte = s;
      }
      if (params?.endDate) {
        const e = new Date(params.endDate);
        e.setHours(23, 59, 59, 999);
        where.createdAt.lte = e;
      }
      const sStr = params?.startDate ? new Date(params.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Awal';
      const eStr = params?.endDate ? new Date(params.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari Ini';
      periodLabel = `Rentang (${sStr} - ${eStr})`;
    }

    const [settledPayments, sessions] = await Promise.all([
      this.prisma.payment.findMany({
        where: { ...where, transactionStatus: 'settlement' },
        include: { session: true },
      }),
      this.prisma.session.findMany({ where }),
    ]);

    let totalRevenue = 0;
    let qrisRevenue = 0;
    let cashRevenue = 0;
    let totalDiscountGiven = 0;

    for (const p of settledPayments) {
      totalRevenue += p.grossAmount;
      if (p.paymentType === 'cash' || p.paymentType === 'cash_access_code') {
        cashRevenue += p.grossAmount;
      } else {
        qrisRevenue += p.grossAmount;
      }

      const base = p.session?.basePrice || p.grossAmount;
      if (base > p.grossAmount) {
        totalDiscountGiven += (base - p.grossAmount);
      }
    }

    const totalSessions = sessions.length;
    let completedSessions = 0;
    let failedSessions = 0;
    let totalPrints = 0;
    let totalDuration = 0;

    for (const s of sessions) {
      totalPrints += s.totalPrints;
      totalDuration += s.durationSeconds;
      if (s.state === 'COMPLETED' || s.state === 'SHARING') {
        completedSessions++;
      } else if (s.state === 'CANCELLED' || s.state === 'EXPIRED') {
        failedSessions++;
      }
    }

    const avgDuration =
      totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 180;

    return {
      totalRevenue,
      totalSessions,
      completedSessions,
      failedSessions,
      totalPrints,
      averageSessionDurationSeconds: avgDuration,
      qrisRevenue,
      cashRevenue,
      totalDiscountGiven,
      periodLabel,
    };
  }

  /**
   * Mengambil daftar transaksi pembayaran berpaginasi
   */
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    dateMode?: 'today' | 'monthly' | 'custom' | 'all';
    selectedDate?: string;
    selectedMonth?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params?.page ? Math.max(1, params.page) : 1;
    const limit = params?.limit ? Math.min(100, Math.max(1, params.limit)) : 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    const now = new Date();

    if (params?.dateMode === 'today') {
      const targetDate = params.selectedDate ? new Date(params.selectedDate) : now;
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else if (params?.dateMode === 'monthly') {
      const monthStr = params.selectedMonth || now.toISOString().slice(0, 7);
      const parts = monthStr.split('-').map(Number);
      const y = parts[0] ?? now.getFullYear();
      const m = parts[1] ?? (now.getMonth() + 1);
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else if (params?.dateMode === 'custom' || params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params?.startDate) {
        const s = new Date(params.startDate);
        s.setHours(0, 0, 0, 0);
        where.createdAt.gte = s;
      }
      if (params?.endDate) {
        const e = new Date(params.endDate);
        e.setHours(23, 59, 59, 999);
        where.createdAt.lte = e;
      }
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            include: { package: true, accessCode: true },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const items = payments.map((p) => {
      const isExtra = p.orderId.includes('-EXT-');
      const isCashCode = p.paymentType === 'cash_access_code' || Boolean(p.session?.accessCode);
      const pkgName = isExtra
        ? 'Tambahan Cetak Foto'
        : p.session?.package?.name || 'Paket Foto Studio';

      const baseAmount = p.session?.basePrice || p.grossAmount;
      const discountAmount = Math.max(0, baseAmount - p.grossAmount);

      let confirmedBy: string | undefined = undefined;
      if (isCashCode) {
        confirmedBy = p.session?.accessCode?.cashierName || 'Kasir Kode PASS';
      } else if (p.paymentType === 'cash') {
        confirmedBy = 'Petugas Kasir Desk';
      }

      return {
        id: p.id,
        orderId: p.orderId,
        sessionCode: formatSessionCode(p.sessionId),
        packageName: pkgName,
        paymentMethod: (p.paymentType === 'cash' || isCashCode ? 'cash' : 'qris') as 'cash' | 'qris',
        subtotal: baseAmount,
        voucherCode: discountAmount > 0 ? 'PROMO' : undefined,
        discountAmount,
        grossAmount: p.grossAmount,
        additionalPrints: p.session?.additionalPrints || (isExtra ? 1 : 0),
        status: p.transactionStatus,
        paymentType: isCashCode ? 'Kode Akses (PASS)' : p.paymentType === 'cash' ? 'Tunai / Kasir' : 'QRIS Midtrans',
        confirmedBy,
        createdAt: p.createdAt.toISOString(),
        settlementTime: p.settlementTime ? p.settlementTime.toISOString() : undefined,
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
   * Mengekspor laporan transaksi ke format CSV
   */
  async exportTransactionsCsv(params?: { startDate?: string; endDate?: string }): Promise<string> {
    const { items } = await this.getTransactions({ page: 1, limit: 1000, ...params });

    const header = [
      'Order ID',
      'Kode Sesi',
      'Paket',
      'Metode Bayar',
      'Nominal (Rp)',
      'Status',
      'Tanggal Dibuat',
      'Waktu Pelunasan',
    ].join(',');

    const rows = items.map((t) =>
      [
        `"${t.orderId}"`,
        `"${t.sessionCode}"`,
        `"${t.packageName}"`,
        `"${t.paymentType}"`,
        t.grossAmount,
        `"${t.status}"`,
        `"${t.createdAt}"`,
        `"${t.settlementTime || '-'}"`,
      ].join(',')
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Mengambil antrean transaksi tunai yang menunggu konfirmasi kasir
   */
  async getCashPendingTransactions(): Promise<any[]> {
    const pendings = await this.prisma.payment.findMany({
      where: {
        paymentType: 'cash',
        transactionStatus: 'pending',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          include: { package: true },
        },
      },
    });

    return pendings.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      sessionCode: formatSessionCode(p.sessionId),
      packageName: p.session?.package?.name || 'Paket Photobooth',
      paymentMethod: 'cash' as const,
      subtotal: p.grossAmount,
      discountAmount: 0,
      grossAmount: p.grossAmount,
      status: 'pending' as const,
      createdAt: p.createdAt.toISOString(),
      expiresAt: p.expiryTime.toISOString(),
    }));
  }

  /**
   * Mengambil riwayat catatan audit konfirmasi tunai
   */
  async getCashAuditLogs(): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { action: 'CASH_PAYMENT_CONFIRMED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map((l) => {
      const details = (l.details as any) || {};
      return {
        id: l.id,
        orderId: details.orderId || 'ORD-CASH',
        operatorId: details.confirmedBy || 'Petugas Kasir',
        grossAmount: details.grossAmount || 0,
        receivedAmount: details.receivedAmount || 0,
        changeAmount: details.changeAmount || 0,
        timestamp: l.createdAt.toISOString(),
        note: details.note || undefined,
      };
    });
  }
}
