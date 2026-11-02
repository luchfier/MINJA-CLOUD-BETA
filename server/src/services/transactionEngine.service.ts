// server/src/services/transactionEngine.service.ts
// Engine Khusus Pengolahan & Kategorisasi Transaksi Finansial MinjaPhotobooth
// Mengklasifikasikan transaksi: QRIS, Tunai Kasir, Kode Akses (PASS), Cetak Ekstra, dan Voucher Promo

import type { PrismaClient } from '@prisma/client';
import { formatSessionCode } from '../utils/session.util.js';

export type TransactionCategory =
  | 'QRIS_MIDTRANS'
  | 'CASH_DESK'
  | 'CASH_PASSCODE'
  | 'EXTRA_PRINTS'
  | 'VOUCHER_PROMO';

export type TransactionStatus =
  | 'SETTLEMENT'
  | 'PENDING'
  | 'EXPIRED'
  | 'CANCELLED';

export interface CategorizedTransactionItem {
  id: string;
  orderId: string;
  category: TransactionCategory;
  categoryLabel: string;
  categoryBadgeColor: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose';
  
  // Finansial
  grossAmount: number;
  baseAmount: number;
  discountAmount: number;
  voucherCode?: string | null;
  hasVoucher: boolean;

  // Status
  status: TransactionStatus;
  statusLabel: string;
  isSettled: boolean;
  paymentType: string;

  // Konteks Sesi & Item
  sessionId: string;
  sessionCode: string;
  packageName: string;
  itemType: 'PACKAGE' | 'EXTRA_PRINT';
  extraPrintsCount: number;

  // Kasir / Operator / Token
  cashierName?: string;
  accessCode?: string;
  customerNote?: string;

  // Mitra & Booth Context
  partnerId?: string | null;
  partnerName?: string | null;
  kioskId?: string | null;
  kioskCode?: string | null;
  kioskName?: string | null;

  // Waktu
  createdAt: string;
  settlementTime?: string | null;
  isToday: boolean;
}

export interface TransactionSummaryDto {
  totalGrossRevenue: number;
  totalTransactions: number;
  todayGrossRevenue: number;
  todayTransactionsCount: number;
  monthlyGrossRevenue: number;
  monthlyTransactionsCount: number;
  periodGrossRevenue: number;
  periodTransactionsCount: number;
  periodLabel: string;

  breakdown: {
    qris: {
      count: number;
      totalRevenue: number;
      percentage: number;
    };
    cashDesk: {
      count: number;
      totalRevenue: number;
      percentage: number;
    };
    cashPasscode: {
      count: number;
      totalRevenue: number;
      percentage: number;
    };
    extraPrints: {
      count: number;
      totalRevenue: number;
      totalPrints: number;
    };
    voucherPromo: {
      count: number;
      totalDiscountGiven: number;
    };
  };

  // Shorthand helpers for direct access
  qris?: { count: number; totalAmount: number };
  cashDesk?: { count: number; totalAmount: number };
  cashPasscode?: { count: number; totalAmount: number };
  extraPrints?: { count: number; totalAmount: number; totalPrints: number };
  voucherPromo?: { voucherUsageCount: number; discountSavings: number };
}

export interface TransactionQueryFilters {
  category?: string;
  status?: string;
  isTodayOnly?: boolean;
  dateMode?: 'today' | 'monthly' | 'custom' | 'all';
  selectedDate?: string;   // YYYY-MM-DD
  selectedMonth?: string;  // YYYY-MM
  startDate?: string;      // YYYY-MM-DD or ISO
  endDate?: string;        // YYYY-MM-DD or ISO
  partnerId?: string;
  kioskId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export class TransactionEngineService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Mengambil daftar transaksi terklasifikasi dengan engine filter multi-kategori dan filter tanggal
   */
  async getCategorizedTransactions(filters?: TransactionQueryFilters): Promise<{
    items: CategorizedTransactionItem[];
    total: number;
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
  }> {
    const limit = filters?.limit && filters.limit > 0 ? Math.min(200, filters.limit) : 50;
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const offset = filters?.offset !== undefined && filters.offset >= 0 ? filters.offset : (page - 1) * limit;

    // Ambil pembayaran beserta sesi, paket, accessCode, dan audit log tunai (Hanya transaksi komersial riil, kecualikan sesi test)
    const payments = await this.prisma.payment.findMany({
      where: {
        paymentType: { not: 'TEST_BYPASS' },
        grossAmount: { gt: 0 },
        orderId: { not: { startsWith: 'TEST-' } },
      },
      orderBy: { createdAt: 'desc' },
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
    });

    // Ambil audit logs terkait pembayaran tunai & kode akses untuk memperkaya data operator
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        action: {
          in: ['CASH_PAYMENT_CONFIRMED', 'ACCESS_CODE_REDEEMED', 'VOUCHER_APPLIED'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const auditMap = new Map<string, any>();
    for (const log of auditLogs) {
      if (log.details && typeof log.details === 'object') {
        const d = log.details as any;
        if (d.orderId) auditMap.set(d.orderId, d);
        if (d.sessionId) auditMap.set(d.sessionId, d);
        if (d.code) auditMap.set(d.code, d);
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Proses klasifikasi setiap record
    const allCategorized: CategorizedTransactionItem[] = payments.map((p) => {
      const isExtra = p.orderId.includes('-EXT-');
      const isCashCode = p.paymentType === 'cash_access_code' || p.orderId.startsWith('CASH-CODE-') || Boolean(p.session?.accessCode);
      const isCashDesk = p.paymentType === 'cash' && !isCashCode;

      // Hitung diskon voucher
      let discountAmount = 0;
      let voucherCode: string | null = null;
      const basePrice = p.session?.basePrice || p.grossAmount;
      if (basePrice > p.grossAmount && !isExtra) {
        discountAmount = basePrice - p.grossAmount;
      }

      // Cek audit log untuk voucher
      const audit = auditMap.get(p.orderId) || auditMap.get(p.sessionId);
      if (audit?.voucherCode) {
        voucherCode = audit.voucherCode;
        if (audit.discountAmount) discountAmount = Number(audit.discountAmount);
      }

      const hasVoucher = discountAmount > 0;

      // Klasifikasi Kategori
      let category: TransactionCategory = 'QRIS_MIDTRANS';
      let categoryLabel = 'QRIS Midtrans';
      let categoryBadgeColor: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose' = 'indigo';

      if (isExtra) {
        category = 'EXTRA_PRINTS';
        categoryLabel = 'Cetak Tambahan';
        categoryBadgeColor = 'cyan';
      } else if (isCashCode) {
        category = 'CASH_PASSCODE';
        categoryLabel = 'Kode Akses (PASS)';
        categoryBadgeColor = 'amber';
      } else if (isCashDesk) {
        category = 'CASH_DESK';
        categoryLabel = 'Tunai Kasir Desk';
        categoryBadgeColor = 'emerald';
      } else if (hasVoucher) {
        // Diskon voucher dapat ditandai
        category = 'QRIS_MIDTRANS';
        categoryLabel = 'QRIS Midtrans';
        categoryBadgeColor = 'indigo';
      }

      // Klasifikasi Status
      let status: TransactionStatus = 'PENDING';
      let statusLabel = 'Menunggu Pembayaran';
      if (p.transactionStatus === 'settlement') {
        status = 'SETTLEMENT';
        statusLabel = 'Lunas / Berhasil';
      } else if (p.transactionStatus === 'expire') {
        status = 'EXPIRED';
        statusLabel = 'Kedaluwarsa';
      } else if (['cancel', 'deny', 'refund'].includes(p.transactionStatus)) {
        status = 'CANCELLED';
        statusLabel = 'Dibatalkan';
      }

      // Kasir & Operator Context
      let cashierName = isCashDesk ? (audit?.operatorId || 'Petugas Kasir Booth') : undefined;
      let accessCode = p.session?.accessCode?.code;
      let customerNote = p.session?.accessCode?.customerNote || audit?.note || undefined;

      if (isCashCode) {
        accessCode = p.session?.accessCode?.code || (audit?.code ? String(audit.code) : undefined);
        cashierName = p.session?.accessCode?.cashierName || audit?.cashierName || 'Owner Remote';
      }

      const pkgName = isExtra
        ? `Tambahan Cetak (${p.session?.additionalPrints || 1} Lembar)`
        : p.session?.package?.name || 'Paket Foto Studio';

      const createdDate = new Date(p.createdAt);
      const isToday = createdDate >= todayStart;

      return {
        id: p.id,
        orderId: p.orderId,
        category,
        categoryLabel,
        categoryBadgeColor,
        grossAmount: p.grossAmount,
        baseAmount: basePrice,
        discountAmount,
        voucherCode,
        hasVoucher,
        status,
        statusLabel,
        isSettled: status === 'SETTLEMENT',
        paymentType: p.paymentType,
        sessionId: p.sessionId,
        sessionCode: formatSessionCode(p.sessionId),
        packageName: pkgName,
        itemType: isExtra ? 'EXTRA_PRINT' : 'PACKAGE',
        extraPrintsCount: p.session?.additionalPrints || (isExtra ? 1 : 0),
        cashierName,
        accessCode,
        customerNote,
        partnerId: p.session?.kiosk?.partnerId || null,
        partnerName: p.session?.kiosk?.partner?.name || (p.session?.kiosk ? 'Minja Pusat' : null),
        kioskId: p.session?.kioskId || null,
        kioskCode: p.session?.kiosk?.code || null,
        kioskName: p.session?.kiosk?.name || null,
        createdAt: p.createdAt.toISOString(),
        settlementTime: p.settlementTime ? p.settlementTime.toISOString() : null,
        isToday,
      };
    });

    // Filtering Engine
    let filtered = allCategorized;

    // Filter Mitra
    if (filters?.partnerId && filters.partnerId !== 'ALL') {
      filtered = filtered.filter((t) => t.partnerId === filters.partnerId);
    }

    // Filter Booth
    if (filters?.kioskId && filters.kioskId !== 'ALL') {
      filtered = filtered.filter((t) => t.kioskId === filters.kioskId);
    }

    // Filter Kategori
    if (filters?.category && filters.category !== 'ALL') {
      if (filters.category === 'VOUCHER_PROMO') {
        filtered = filtered.filter((t) => t.hasVoucher);
      } else {
        filtered = filtered.filter((t) => t.category === filters.category);
      }
    }

    // Filter Status
    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    // Filter Tanggal Multi-Mode: 'today' | 'monthly' | 'custom' | 'all'
    if (filters?.dateMode === 'today' || filters?.isTodayOnly) {
      const targetDate = filters?.selectedDate ? new Date(filters.selectedDate) : new Date();
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= start && d <= end;
      });
    } else if (filters?.dateMode === 'monthly' || filters?.selectedMonth) {
      const monthStr = filters?.selectedMonth || new Date().toISOString().slice(0, 7);
      const parts = monthStr.split('-').map(Number);
      const y = parts[0] ?? new Date().getFullYear();
      const m = parts[1] ?? (new Date().getMonth() + 1);
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= start && d <= end;
      });
    } else if (filters?.dateMode === 'custom' || filters?.startDate || filters?.endDate) {
      if (filters?.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter((t) => new Date(t.createdAt) >= start);
      }
      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter((t) => new Date(t.createdAt) <= end);
      }
    }

    // Filter Pencarian Teks
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter((t) => {
        return (
          t.orderId.toLowerCase().includes(q) ||
          t.sessionCode.toLowerCase().includes(q) ||
          t.packageName.toLowerCase().includes(q) ||
          (t.accessCode && t.accessCode.toLowerCase().includes(q)) ||
          (t.voucherCode && t.voucherCode.toLowerCase().includes(q)) ||
          (t.cashierName && t.cashierName.toLowerCase().includes(q)) ||
          (t.customerNote && t.customerNote.toLowerCase().includes(q))
        );
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: paginated,
      total,
      limit,
      offset,
      page,
      totalPages,
    };
  }

  /**
   * Menghasilkan ringkasan metrik finansial terinci per kategori dan periode
   */
  async getTransactionSummary(filters?: TransactionQueryFilters): Promise<TransactionSummaryDto> {
    const { items: all } = await this.getCategorizedTransactions({ limit: 10000 });
    const settledAll = all.filter((t) => t.isSettled);

    const totalGrossRevenue = settledAll.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const totalTransactions = settledAll.length;

    // Hari Ini
    const todaySettled = settledAll.filter((t) => t.isToday);
    const todayGrossRevenue = todaySettled.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const todayTransactionsCount = todaySettled.length;

    // Bulan Ini (Current Month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlySettled = settledAll.filter((t) => {
      const d = new Date(t.createdAt);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });
    const monthlyGrossRevenue = monthlySettled.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const monthlyTransactionsCount = monthlySettled.length;

    // Periode Terpilih Berdasarkan Filter (Harian, Bulanan, Custom, atau Semua)
    let periodSettled = settledAll;
    let periodLabel = 'Semua Waktu';

    if (filters?.dateMode === 'today' || filters?.isTodayOnly) {
      const targetDate = filters?.selectedDate ? new Date(filters.selectedDate) : new Date();
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);
      periodSettled = settledAll.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= start && d <= end;
      });
      periodLabel = `Harian (${targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (filters?.dateMode === 'monthly' || filters?.selectedMonth) {
      const monthStr = filters?.selectedMonth || now.toISOString().slice(0, 7);
      const parts = monthStr.split('-').map(Number);
      const y = parts[0] ?? now.getFullYear();
      const m = parts[1] ?? (now.getMonth() + 1);
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      periodSettled = settledAll.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= start && d <= end;
      });
      const monthName = start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      periodLabel = `Bulan ${monthName}`;
    } else if (filters?.dateMode === 'custom' || filters?.startDate || filters?.endDate) {
      if (filters?.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        periodSettled = periodSettled.filter((t) => new Date(t.createdAt) >= start);
      }
      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        periodSettled = periodSettled.filter((t) => new Date(t.createdAt) <= end);
      }
      const s = filters?.startDate ? new Date(filters.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Awal';
      const e = filters?.endDate ? new Date(filters.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari Ini';
      periodLabel = `Rentang (${s} - ${e})`;
    }

    const periodGrossRevenue = periodSettled.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const periodTransactionsCount = periodSettled.length;

    // Breakdown per kategori dari data periode terpilih
    let qrisCount = 0;
    let qrisRevenue = 0;
    let cashDeskCount = 0;
    let cashDeskRevenue = 0;
    let cashPasscodeCount = 0;
    let cashPasscodeRevenue = 0;
    let extraPrintsCount = 0;
    let extraPrintsRevenue = 0;
    let totalExtraPrintsSheets = 0;
    let voucherPromoCount = 0;
    let totalDiscountGiven = 0;

    for (const t of periodSettled) {
      if (t.category === 'QRIS_MIDTRANS') {
        qrisCount++;
        qrisRevenue += t.grossAmount;
      } else if (t.category === 'CASH_DESK') {
        cashDeskCount++;
        cashDeskRevenue += t.grossAmount;
      } else if (t.category === 'CASH_PASSCODE') {
        cashPasscodeCount++;
        cashPasscodeRevenue += t.grossAmount;
      } else if (t.category === 'EXTRA_PRINTS') {
        extraPrintsCount++;
        extraPrintsRevenue += t.grossAmount;
        totalExtraPrintsSheets += t.extraPrintsCount || 1;
      }

      if (t.hasVoucher) {
        voucherPromoCount++;
        totalDiscountGiven += t.discountAmount;
      }
    }

    const calcPct = (val: number) => (periodGrossRevenue > 0 ? Math.round((val / periodGrossRevenue) * 100) : 0);

    return {
      totalGrossRevenue,
      totalTransactions,
      todayGrossRevenue,
      todayTransactionsCount,
      monthlyGrossRevenue,
      monthlyTransactionsCount,
      periodGrossRevenue,
      periodTransactionsCount,
      periodLabel,
      breakdown: {
        qris: {
          count: qrisCount,
          totalRevenue: qrisRevenue,
          percentage: calcPct(qrisRevenue),
        },
        cashDesk: {
          count: cashDeskCount,
          totalRevenue: cashDeskRevenue,
          percentage: calcPct(cashDeskRevenue),
        },
        cashPasscode: {
          count: cashPasscodeCount,
          totalRevenue: cashPasscodeRevenue,
          percentage: calcPct(cashPasscodeRevenue),
        },
        extraPrints: {
          count: extraPrintsCount,
          totalRevenue: extraPrintsRevenue,
          totalPrints: totalExtraPrintsSheets,
        },
        voucherPromo: {
          count: voucherPromoCount,
          totalDiscountGiven,
        },
      },
      // Shorthand helpers for direct access
      qris: { count: qrisCount, totalAmount: qrisRevenue },
      cashDesk: { count: cashDeskCount, totalAmount: cashDeskRevenue },
      cashPasscode: { count: cashPasscodeCount, totalAmount: cashPasscodeRevenue },
      extraPrints: { count: extraPrintsCount, totalAmount: extraPrintsRevenue, totalPrints: totalExtraPrintsSheets },
      voucherPromo: { voucherUsageCount: voucherPromoCount, discountSavings: totalDiscountGiven },
    };
  }

  /**
   * Ekspor data transaksi terklasifikasi ke format CSV komprehensif
   */
  async exportTransactionsCsv(filters?: TransactionQueryFilters): Promise<string> {
    const { items } = await this.getCategorizedTransactions({ ...filters, limit: 10000, offset: 0 });

    const header = [
      'Waktu Transaksi',
      'Nomor Order ID',
      'Mitra',
      'Booth / Lokasi',
      'Kode Sesi',
      'Kategori',
      'Metode Pembayaran',
      'Paket / Item',
      'Harga Normal (Rp)',
      'Diskon Voucher (Rp)',
      'Total Bayar (Rp)',
      'Status',
      'Kasir / Petugas',
      'Kode Akses',
      'Kode Voucher',
      'Catatan',
    ];

    const rows = items.map((t) => [
      t.createdAt,
      t.orderId,
      t.partnerName || 'Minja Pusat',
      t.kioskName ? `${t.kioskCode} - ${t.kioskName}` : 'Lokal',
      t.sessionCode,
      t.categoryLabel,
      t.paymentType,
      t.packageName,
      t.baseAmount,
      t.discountAmount,
      t.grossAmount,
      t.statusLabel,
      t.cashierName || '-',
      t.accessCode || '-',
      t.voucherCode || '-',
      t.customerNote || '-',
    ]);

    const escapeCsv = (val: any) => `"${String(val).replace(/"/g, '""')}"`;

    const csvContent = [
      header.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\r\n');

    return csvContent;
  }
}
