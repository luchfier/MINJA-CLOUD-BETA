// src/services/admin-auth.service.ts
// Service autentikasi admin: login, PIN change, lockout protection
// Sesuai SECURITY.md §2.2, §2.3 & API_CONTRACT.md §3.1

import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import { hashPin, verifyPin, signAdminToken, calculateGraduatedLockout } from '../utils/auth.util.js';
import { logAuditEvent } from './audit.service.js';

const BRUTE_FORCE_CONFIG = {
  maxAttempts: 5,
  lockoutMinutes: 10,
};

export class AdminAuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Login Admin dengan validasi Username/Email + Password & proteksi lockout
   */
  async login(
    input: { username?: string; password?: string; pin?: string } | string,
    passwordOrIp?: string,
    maybeIp?: string,
    maybeUserAgent?: string
  ) {
    let username = 'admin';
    let password = '';
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (typeof input === 'object') {
      username = (input.username || 'admin').trim();
      password = (input.password || input.pin || '').trim();
      ipAddress = passwordOrIp;
      userAgent = maybeIp;
    } else if (passwordOrIp && (maybeIp !== undefined || passwordOrIp.length < 20)) {
      username = input.trim();
      password = passwordOrIp.trim();
      ipAddress = maybeIp;
      userAgent = maybeUserAgent;
    } else {
      // Legacy fallback: login(pin, ip, ua)
      username = 'admin';
      password = input.trim();
      ipAddress = passwordOrIp;
      userAgent = maybeIp;
    }

    const normalizedUsername = username.toLowerCase();
    const admin = await this.prisma.admin.findFirst({
      where: {
        OR: [
          { username: normalizedUsername },
          { email: normalizedUsername },
        ],
      },
    });

    if (!admin) {
      throw new AppError(
        401,
        ErrorCode.UNAUTHORIZED,
        'Username atau password Super Admin salah.'
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

    // 2. Verifikasi Password menggunakan Argon2id
    const isValid = await verifyPin(password, admin.passwordHash);

    if (!isValid) {
      const newAttempts = admin.failedAttempts + 1;
      const lockoutTier = calculateGraduatedLockout(newAttempts);
      const lockedUntil = lockoutTier ? lockoutTier.lockedUntil : null;

      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedAttempts: newAttempts,
          lockedUntil,
        },
      });

      if (lockoutTier && lockedUntil) {
        await logAuditEvent(this.prisma, {
          action: 'ADMIN_LOCKED_OUT',
          adminId: admin.id,
          ipAddress,
          userAgent,
          details: { failedAttempts: newAttempts, lockedUntil: lockedUntil.toISOString(), minutes: lockoutTier.minutes },
        });

        throw new AppError(
          423,
          ErrorCode.ADMIN_LOCKED_OUT,
          `Password salah ${newAttempts} kali berturut-turut. Akun dikunci sementara selama ${lockoutTier.minutes} menit demi keamanan.`,
          { lockedUntil: lockedUntil.toISOString(), remainingMinutes: lockoutTier.minutes }
        );
      }

      const remainingAttempts = Math.max(1, 3 - newAttempts);

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
        `Password salah. Sisa percobaan: ${remainingAttempts} kali sebelum dikunci.`,
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

    return {
      token,
      expiresAt,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
      },
    };
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

    const isValid = await verifyPin(pin, admin.passwordHash);

    if (!isValid) {
      const newAttempts = admin.failedAttempts + 1;
      const lockoutTier = calculateGraduatedLockout(newAttempts);
      const lockedUntil = lockoutTier ? lockoutTier.lockedUntil : null;

      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedAttempts: newAttempts,
          lockedUntil,
        },
      });

      if (lockoutTier && lockedUntil) {
        await logAuditEvent(this.prisma, {
          action: 'ADMIN_LOCKED_OUT',
          adminId: admin.id,
          ipAddress,
          userAgent,
          details: { failedAttempts: newAttempts, lockedUntil: lockedUntil.toISOString(), minutes: lockoutTier.minutes },
        });

        throw new AppError(
          423,
          ErrorCode.ADMIN_LOCKED_OUT,
          `PIN salah ${newAttempts} kali berturut-turut. Akun dikunci sementara selama ${lockoutTier.minutes} menit demi keamanan.`,
          { lockedUntil: lockedUntil.toISOString(), remainingMinutes: lockoutTier.minutes }
        );
      }

      const remainingAttempts = Math.max(1, 3 - newAttempts);
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
   * Mengubah Password Admin
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string, ipAddress?: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Admin tidak ditemukan');
    }

    const isCurrentValid = await verifyPin(currentPassword, admin.passwordHash);
    if (!isCurrentValid) {
      throw new AppError(
        400,
        ErrorCode.INVALID_PIN,
        'Password saat ini tidak valid. Verifikasi gagal.'
      );
    }

    if (!newPassword || newPassword.length < 6) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Password baru minimal harus 6 karakter.'
      );
    }

    const newHash = await hashPin(newPassword);

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        passwordHash: newHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await logAuditEvent(this.prisma, {
      action: 'ADMIN_PASSWORD_CHANGED',
      adminId: admin.id,
      ipAddress,
      details: { timestamp: new Date().toISOString() },
    });

    return { message: 'Password Super Admin berhasil diperbarui' };
  }

  // Alias untuk kompatibilitas ke belakang
  async changePin(adminId: string, currentPin: string, newPin: string, ipAddress?: string) {
    return this.changePassword(adminId, currentPin, newPin, ipAddress);
  }

  /**
   * Dapatkan profil admin saat ini
   */
  async getMe(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
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
