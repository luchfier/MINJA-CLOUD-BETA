// src/services/voucher.service.ts
// Service Manajemen & Validasi Voucher Diskon
// Sesuai API_CONTRACT.md §3.7

import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import type {
  ValidateVoucherInput,
  CreateVoucherInput,
  UpdateVoucherInput,
} from '../schemas/voucher.schema.js';

export class VoucherService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validasi kode voucher dan kalkulasi nominal potongan harga
   */
  async validateVoucher(input: ValidateVoucherInput): Promise<{
    isValid: boolean;
    valid: boolean;
    discountAmount: number;
    finalPrice: number;
    message: string;
    voucher?: {
      code: string;
      name: string;
      type: 'percentage' | 'fixed';
      discountValue: number;
      discountAmount: number;
    };
    errorMessage?: string;
    errorCode?: string;
  }> {
    const code = input.code.trim().toUpperCase();

    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher) {
      return {
        isValid: false,
        valid: false,
        discountAmount: 0,
        finalPrice: input.subtotal,
        message: 'Kode voucher tidak ditemukan atau salah ketik.',
        errorCode: 'VOUCHER_NOT_FOUND',
        errorMessage: 'Kode voucher tidak ditemukan atau salah ketik.',
      };
    }

    if (!voucher.isActive) {
      return {
        isValid: false,
        valid: false,
        discountAmount: 0,
        finalPrice: input.subtotal,
        message: 'Voucher promosi ini sedang dinonaktifkan.',
        errorCode: 'VOUCHER_INACTIVE',
        errorMessage: 'Voucher promosi ini sedang dinonaktifkan.',
      };
    }

    const now = new Date();
    if (voucher.validFrom && now < voucher.validFrom) {
      return {
        isValid: false,
        valid: false,
        discountAmount: 0,
        finalPrice: input.subtotal,
        message: 'Voucher belum memasuki periode aktif.',
        errorCode: 'VOUCHER_NOT_YET_ACTIVE',
        errorMessage: 'Voucher belum memasuki periode aktif.',
      };
    }

    if (now > voucher.validUntil) {
      return {
        isValid: false,
        valid: false,
        discountAmount: 0,
        finalPrice: input.subtotal,
        message: 'Masa berlaku voucher telah berakhir.',
        errorCode: 'VOUCHER_EXPIRED',
        errorMessage: 'Masa berlaku voucher telah berakhir.',
      };
    }

    if (voucher.usedCount >= voucher.usageLimit) {
      return {
        isValid: false,
        valid: false,
        discountAmount: 0,
        finalPrice: input.subtotal,
        message: 'Kuota pemakaian voucher promo telah habis.',
        errorCode: 'VOUCHER_QUOTA_EXCEEDED',
        errorMessage: 'Kuota pemakaian voucher promo telah habis.',
      };
    }

    // Validasi booth target (jika voucher dibatasi ke booth tertentu)
    if (voucher.kioskId && input.kioskId && voucher.kioskId !== input.kioskId) {
      return {
        isValid: false,
        valid: false,
        discountAmount: 0,
        finalPrice: input.subtotal,
        message: 'Kode voucher ini hanya berlaku di unit booth tertentu.',
        errorCode: 'VOUCHER_BOOTH_INELIGIBLE',
        errorMessage: 'Kode voucher ini hanya berlaku di unit booth tertentu.',
      };
    }

    if (input.subtotal < voucher.minSpend) {
      const msg = `Minimum transaksi untuk voucher ini adalah Rp ${voucher.minSpend.toLocaleString('id-ID')}.`;
      return {
        isValid: false,
        valid: false,
        discountAmount: 0,
        finalPrice: input.subtotal,
        message: msg,
        errorCode: 'VOUCHER_MIN_NOT_MET',
        errorMessage: msg,
      };
    }

    // Kalkulasi diskon
    let discountAmount = 0;
    if (voucher.discountType === 'percentage') {
      discountAmount = Math.round((input.subtotal * voucher.discountValue) / 100);
      if (voucher.maxDiscount && voucher.maxDiscount > 0) {
        discountAmount = Math.min(discountAmount, voucher.maxDiscount);
      }
    } else {
      discountAmount = Math.min(input.subtotal, voucher.discountValue);
    }

    const finalPrice = Math.max(0, input.subtotal - discountAmount);

    return {
      isValid: true,
      valid: true,
      discountAmount,
      finalPrice,
      message: `Voucher ${voucher.code} berhasil digunakan. Hemat Rp ${discountAmount.toLocaleString('id-ID')}!`,
      voucher: {
        code: voucher.code,
        name: voucher.code,
        type: voucher.discountType as 'percentage' | 'fixed',
        discountValue: voucher.discountValue,
        discountAmount,
      },
    };
  }

  /**
   * Mengambil semua daftar voucher untuk admin
   */
  async listVouchers(): Promise<any[]> {
    const list = await this.prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        kiosk: { select: { id: true, code: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
    });

    return list.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name || v.code,
      type: v.discountType,
      discountValue: v.discountValue,
      maxDiscount: v.maxDiscount || undefined,
      minTransaction: v.minSpend,
      quota: v.usageLimit,
      usedCount: v.usedCount,
      validFrom: v.validFrom.toISOString(),
      validUntil: v.validUntil.toISOString(),
      isActive: v.isActive,
      partnerId: v.partnerId,
      partnerName: v.partner?.name,
      kioskId: v.kioskId,
      kioskCode: v.kiosk?.code,
      kioskName: v.kiosk?.name,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  /**
   * Mengambil voucher milik partner tertentu
   */
  async getPartnerVouchers(partnerId: string): Promise<any[]> {
    const list = await this.prisma.voucher.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      include: {
        kiosk: { select: { id: true, code: true, name: true } },
      },
    });

    return list.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name || v.code,
      type: v.discountType,
      discountValue: v.discountValue,
      maxDiscount: v.maxDiscount || undefined,
      minTransaction: v.minSpend,
      quota: v.usageLimit,
      usedCount: v.usedCount,
      validFrom: v.validFrom.toISOString(),
      validUntil: v.validUntil.toISOString(),
      isActive: v.isActive,
      kioskId: v.kioskId,
      kioskCode: v.kiosk?.code,
      kioskName: v.kiosk?.name,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  /**
   * Membuat voucher baru (admin atau partner)
   */
  async createVoucher(input: CreateVoucherInput): Promise<any> {
    const existing = await this.prisma.voucher.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, `Voucher dengan kode '${input.code}' sudah terdaftar.`);
    }

    const created = await this.prisma.voucher.create({
      data: {
        code: input.code,
        name: input.name || input.code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minSpend: input.minSpend || 0,
        maxDiscount: input.maxDiscount || null,
        validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
        validUntil: new Date(input.validUntil),
        usageLimit: input.usageLimit || 100,
        isActive: input.isActive ?? true,
        partnerId: input.partnerId || null,
        kioskId: input.kioskId || null,
      },
      include: {
        kiosk: { select: { id: true, code: true, name: true } },
      },
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name || created.code,
      type: created.discountType,
      discountValue: created.discountValue,
      maxDiscount: created.maxDiscount || undefined,
      minTransaction: created.minSpend,
      quota: created.usageLimit,
      usedCount: created.usedCount,
      validFrom: created.validFrom.toISOString(),
      validUntil: created.validUntil.toISOString(),
      isActive: created.isActive,
      partnerId: created.partnerId,
      kioskId: created.kioskId,
      kioskCode: created.kiosk?.code,
      kioskName: created.kiosk?.name,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Toggle status aktif voucher
   */
  async toggleVoucher(id: string, partnerId?: string): Promise<any> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Voucher tidak ditemukan.');
    }

    if (partnerId && voucher.partnerId !== partnerId) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Anda tidak memiliki hak akses untuk voucher ini.');
    }

    const updated = await this.prisma.voucher.update({
      where: { id },
      data: { isActive: !voucher.isActive },
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name || updated.code,
      isActive: updated.isActive,
    };
  }

  /**
   * Memperbarui voucher
   */
  async updateVoucher(id: string, input: UpdateVoucherInput): Promise<any> {
    const data: any = {};
    if (input.code) data.code = input.code;
    if (input.name) data.name = input.name;
    if (input.discountType) data.discountType = input.discountType;
    if (input.discountValue !== undefined) data.discountValue = input.discountValue;
    if (input.minSpend !== undefined) data.minSpend = input.minSpend;
    if (input.maxDiscount !== undefined) data.maxDiscount = input.maxDiscount;
    if (input.validFrom) data.validFrom = new Date(input.validFrom);
    if (input.validUntil) data.validUntil = new Date(input.validUntil);
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.kioskId !== undefined) data.kioskId = input.kioskId;

    const updated = await this.prisma.voucher.update({
      where: { id },
      data,
      include: {
        kiosk: { select: { id: true, code: true, name: true } },
      },
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name || updated.code,
      type: updated.discountType,
      discountValue: updated.discountValue,
      maxDiscount: updated.maxDiscount || undefined,
      minTransaction: updated.minSpend,
      quota: updated.usageLimit,
      usedCount: updated.usedCount,
      validFrom: updated.validFrom.toISOString(),
      validUntil: updated.validUntil.toISOString(),
      isActive: updated.isActive,
      partnerId: updated.partnerId,
      kioskId: updated.kioskId,
      kioskCode: updated.kiosk?.code,
      kioskName: updated.kiosk?.name,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Menghapus voucher
   */
  async deleteVoucher(id: string, partnerId?: string): Promise<{ success: boolean; message: string }> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Voucher tidak ditemukan.');
    }

    if (partnerId && voucher.partnerId !== partnerId) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Anda tidak memiliki hak akses untuk voucher ini.');
    }

    await this.prisma.voucher.delete({
      where: { id },
    });

    return { success: true, message: 'Voucher berhasil dihapus.' };
  }
}

