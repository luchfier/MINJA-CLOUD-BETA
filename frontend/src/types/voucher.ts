export type VoucherType = 'percentage' | 'fixed';

export type VoucherErrorCode =
  | 'VOUCHER_NOT_FOUND'
  | 'VOUCHER_EXPIRED'
  | 'VOUCHER_QUOTA_EXCEEDED'
  | 'VOUCHER_MIN_NOT_MET'
  | 'VOUCHER_INACTIVE'
  | 'VOUCHER_PACKAGE_NOT_ELIGIBLE';

export interface VoucherItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  discountValue: number; // Nilai diskon: e.g. 20 (untuk 20%) atau 10000 (untuk Rp 10.000)
  maxDiscount?: number; // Batas maksimum diskon (untuk persentase, e.g. 20000)
  minTransaction?: number; // Nilai transaksi minimum (sebelum diskon)
  quota: number; // Kuota pemakaian total
  usedCount: number; // Jumlah yang telah digunakan
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string
  applicablePackageIds?: string[]; // Kosong/undefined = berlaku untuk semua paket
  isActive: boolean;
  createdAt: string;
}

export interface ValidateVoucherRequest {
  code: string;
  packageId: string;
  subtotal: number;
}

export interface ValidateVoucherResponse {
  isValid: boolean;
  voucher?: {
    code: string;
    name: string;
    type: VoucherType;
    discountValue: number;
    discountAmount: number;
  };
  errorMessage?: string;
  errorCode?: VoucherErrorCode;
}
