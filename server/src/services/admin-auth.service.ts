// src/services/admin-auth.service.ts
// Service autentikasi admin: login, PIN change, lockout protection
// Sesuai SECURITY.md §2.2, §2.3 & API_CONTRACT.md §3.1

import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import { hashPin, verifyPin, signAdminToken } from '../utils/auth.util.js';
import { logAuditEvent } from './audit.service.js';

const BRUTE_FORCE_CONFIG = {
  maxAttempts: 5,
  lockoutMinutes: 10,
};

export class AdminAuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Login Admin dengan validasi PIN & proteksi lockout
   */
  async login(pin: string, ipAddress?: string, userAgent?: string) {
    const admin = await this.prisma.admin.findFirst();

    if (!admin) {
      throw new AppError(
        500,
        ErrorCode.ADMIN_NOT_INITIALIZED,
        'Akun admin belum diinisialisasi di database. Jalankan seed terlebih dahulu.'
      );
    }

    const now = new Date();

    // 1. Cek status lockout
    if (admin.lockedUntil && admin.lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (admin.lockedUntil.getTime() - now.getTime()) / (60 * 1000)
      );

      await logAuditEvent(this.prisma, {
        action: 'ADMIN_LOGIN_REJECTED_LOCKED',
        adminId: admin.id,
        ipAddress,
        userAgent,
        details: { remainingMinutes, lockedUntil: admin.lockedUntil.toISOString() },
      });

      throw new AppError(
        423,
        ErrorCode.ADMIN_LOCKED_OUT,
        `Akun admin terkunci karena terlalu banyak percobaan salah. Coba lagi dalam ${remainingMinutes} menit.`,
        { lockedUntil: admin.lockedUntil.toISOString(), remainingMinutes }
      );
    }

    // 2. Verifikasi PIN menggunakan Argon2id
    const isValid = await verifyPin(pin, admin.pinHash);

    if (!isValid) {
      const newAttempts = admin.failedAttempts + 1;
      let lockedUntil: Date | null = null;

      if (newAttempts >= BRUTE_FORCE_CONFIG.maxAttempts) {
        lockedUntil = new Date(now.getTime() + BRUTE_FORCE_CONFIG.lockoutMinutes * 60 * 1000);
      }

      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedAttempts: newAttempts,
          lockedUntil,
        },
      });

      if (lockedUntil) {
        await logAuditEvent(this.prisma, {
          action: 'ADMIN_LOCKED_OUT',
          adminId: admin.id,
          ipAddress,
          userAgent,
          details: { failedAttempts: newAttempts, lockedUntil: lockedUntil.toISOString() },
        });

        throw new AppError(
          423,
          ErrorCode.ADMIN_LOCKED_OUT,
          `PIN salah ${BRUTE_FORCE_CONFIG.maxAttempts} kali berturut-turut. Akun dikunci selama ${BRUTE_FORCE_CONFIG.lockoutMinutes} menit.`,
          { lockedUntil: lockedUntil.toISOString() }
        );
      }

      const remainingAttempts = BRUTE_FORCE_CONFIG.maxAttempts - newAttempts;

      await logAuditEvent(this.prisma, {
        action: 'ADMIN_LOGIN_FAILED',
        adminId: admin.id,
        ipAddress,
        userAgent,
        details: { failedAttempts: newAttempts, remainingAttempts },
      });

      throw new AppError(
        401,
        ErrorCode.INVALID_PIN,
        `PIN tidak valid. Sisa percobaan: ${remainingAttempts} kali sebelum dikunci.`,
        { remainingAttempts }
      );
    }

    // 3. Login berhasil — reset percobaan gagal & update waktu login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });

    const { token, expiresAt } = signAdminToken(admin.id);

    await logAuditEvent(this.prisma, {
      action: 'ADMIN_LOGIN_SUCCESS',
      adminId: admin.id,
      ipAddress,
      userAgent,
      details: { expiresAt },
    });

    return { token, expiresAt };
  }

  /**
   * Verifikasi PIN Admin untuk aksi sensitif (Maintenance Mode, dll)
   */
  async verifyAdminPin(pin: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    const admin = await this.prisma.admin.findFirst();

    if (!admin) {
      throw new AppError(
        500,
        ErrorCode.ADMIN_NOT_INITIALIZED,
        'Akun admin belum diinisialisasi di database.'
      );
    }

    const now = new Date();
    if (admin.lockedUntil && admin.lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (admin.lockedUntil.getTime() - now.getTime()) / (60 * 1000)
      );
      throw new AppError(
        423,
        ErrorCode.ADMIN_LOCKED_OUT,
        `Akun admin terkunci karena terlalu banyak percobaan salah. Coba lagi dalam ${remainingMinutes} menit.`,
        { lockedUntil: admin.lockedUntil.toISOString(), remainingMinutes }
      );
    }

    const isValid = await verifyPin(pin, admin.pinHash);

    if (!isValid) {
      const newAttempts = admin.failedAttempts + 1;
      let lockedUntil: Date | null = null;

      if (newAttempts >= BRUTE_FORCE_CONFIG.maxAttempts) {
        lockedUntil = new Date(now.getTime() + BRUTE_FORCE_CONFIG.lockoutMinutes * 60 * 1000);
      }

      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedAttempts: newAttempts,
          lockedUntil,
        },
      });

      if (lockedUntil) {
        await logAuditEvent(this.prisma, {
          action: 'ADMIN_LOCKED_OUT',
          adminId: admin.id,
          ipAddress,
          userAgent,
          details: { failedAttempts: newAttempts, lockedUntil: lockedUntil.toISOString() },
        });

        throw new AppError(
          423,
          ErrorCode.ADMIN_LOCKED_OUT,
          `PIN salah ${BRUTE_FORCE_CONFIG.maxAttempts} kali berturut-turut. Akun dikunci selama ${BRUTE_FORCE_CONFIG.lockoutMinutes} menit.`,
          { lockedUntil: lockedUntil.toISOString() }
        );
      }

      const remainingAttempts = BRUTE_FORCE_CONFIG.maxAttempts - newAttempts;
      throw new AppError(
        401,
        ErrorCode.INVALID_PIN,
        `PIN tidak valid. Sisa percobaan: ${remainingAttempts} kali sebelum dikunci.`,
        { remainingAttempts }
      );
    }

    // Reset failed attempts on success
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    return true;
  }

  /**
   * Mengubah PIN Admin
   */
  async changePin(adminId: string, currentPin: string, newPin: string, ipAddress?: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Admin tidak ditemukan');
    }

    const isCurrentValid = await verifyPin(currentPin, admin.pinHash);
    if (!isCurrentValid) {
      throw new AppError(
        400,
        ErrorCode.INVALID_PIN,
        'PIN saat ini tidak valid. Verifikasi gagal.'
      );
    }

    const newHash = await hashPin(newPin);

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        pinHash: newHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await logAuditEvent(this.prisma, {
      action: 'ADMIN_PIN_CHANGED',
      adminId: admin.id,
      ipAddress,
      details: { timestamp: new Date().toISOString() },
    });

    return { message: 'PIN admin berhasil diperbarui' };
  }

  /**
   * Dapatkan profil admin saat ini
   */
  async getMe(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Admin tidak ditemukan');
    }

    return admin;
  }
}
