export interface ReportSummary {
  totalRevenue: number;
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  totalPrints: number;
  averageSessionDurationSeconds: number;
  qrisRevenue: number;
  cashRevenue: number;
  totalDiscountGiven: number;
  periodLabel?: string;
}

export interface ReportFilterParams {
  page?: number;
  limit?: number;
  dateMode?: 'today' | 'monthly' | 'custom' | 'all';
  selectedDate?: string;
  selectedMonth?: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionReportItem {
  id: string;
  orderId: string;
  sessionCode: string;
  packageName: string;
  paymentMethod: 'qris' | 'cash';
  subtotal: number; // Harga sebelum diskon
  voucherCode?: string; // Kode voucher
  discountAmount: number; // Nilai diskon
  grossAmount: number; // Total yang dibayar
  additionalPrints: number;
  status: 'settlement' | 'pending' | 'expire' | 'cancel' | 'deny';
  paymentType: string;
  confirmedBy?: string; // Petugas yang mengonfirmasi cash, jika ada
  createdAt: string;
  settlementTime?: string;
}
