// server/src/services/accessCode.service.ts
// Layanan Kode Akses Tunai Sesi & Otentikasi Pembayaran Booth Kiosk
// Sesuai PRD_VOUCHER_AND_ACCESS_CODE.md v2.1

import { PrismaClient, AccessCodeStatus } from '@prisma/client';
import { humanLogger } from '../utils/humanLogger.js';
import { AppError, ErrorCode } from '../types/common.types.js';

export interface CreateAccessCodeDTO {
  packageId?: string | null;
  amount?: number;
  type?: string;
  extraPrints?: number;
  customerNote?: string | null;
  cashierName?: string;
  expiresInHours?: number;
  kioskId?: string | null;
  operatorId?: string | null;
  partnerId?: string | null;
}

export class AccessCodeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Menghasilkan string kode akses unik yang mudah dibaca (tanpa karakter ambigu O/0, I/1)
   * Contoh: PASS-4921, PASS-8A7C
   */
  private generateRandomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PASS-${suffix}`;
  }

  /**
   * Membuat Kode Akses Tunai baru dari Owner Portal
   */
  async createAccessCode(dto: CreateAccessCodeDTO) {
    let finalAmount = dto.amount || 0;
    let packageName = dto.type === 'EXTRA_PRINT' ? `Cetak Tambahan (${dto.extraPrints || 1} Lembar)` : 'Custom Nominal';

    // Jika packageId diberikan, gunakan harga resmi dari database (Server-Side Price Authority)
    if (dto.packageId) {
      const pkg = await this.prisma.package.findUnique({
        where: { id: dto.packageId },
      });
      if (!pkg) {
        throw new Error('Paket foto tidak ditemukan');
      }
      finalAmount = pkg.price;
      packageName = pkg.name;
    }

    // Generate kode unik dengan retry jika tabrakan (collision)
    let code = this.generateRandomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await this.prisma.accessCode.findUnique({ where: { code } });
      if (!existing) break;
      code = this.generateRandomCode();
      attempts++;
    }

    const hours = dto.expiresInHours && dto.expiresInHours > 0 ? dto.expiresInHours : 24;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

    const accessCode = await this.prisma.accessCode.create({
      data: {
        code,
        packageId: dto.packageId || null,
        kioskId: dto.kioskId || null,
        operatorId: dto.operatorId || null,
        partnerId: dto.partnerId || null,
        amount: finalAmount,
        type: dto.type || 'SESSION',
        extraPrints: dto.extraPrints || 0,
        status: AccessCodeStatus.ACTIVE,
        customerNote: dto.customerNote || null,
        cashierName: dto.cashierName || 'Owner Remote',
        expiresAt,
      } as any,
      include: {
        package: true,
      },
    });

    humanLogger.cash(
      `Kode akses tunai dibuat: ${code} - Paket "${packageName}" (Rp ${finalAmount.toLocaleString('id-ID')})`
    );

    return accessCode;
  }

  /**
   * Mengambil daftar kode akses dengan opsi filter status
   */
  async getAccessCodes(filters?: { status?: AccessCodeStatus; limit?: number }) {
    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    }

    // Periksa dan perbarui status expired secara transparan
    const now = new Date();
    await this.prisma.accessCode.updateMany({
      where: {
        status: AccessCodeStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      data: {
        status: AccessCodeStatus.EXPIRED,
      },
    });

    return this.prisma.accessCode.findMany({
      where,
      include: {
        package: true,
        session: {
          select: {
            id: true,
            state: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit || 100,
    });
  }

  /**
   * Membatalkan kode akses yang belum terpakai (Revoke)
   */
  async revokeAccessCode(id: string, reason?: string) {
    const existing = await this.prisma.accessCode.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Kode akses tidak ditemukan');
    }
    if (existing.status !== AccessCodeStatus.ACTIVE) {
      throw new Error(`Kode akses tidak dapat dibatalkan (Status saat ini: ${existing.status})`);
    }

    const updated = await this.prisma.accessCode.update({
      where: { id },
      data: {
        status: AccessCodeStatus.REVOKED,
      },
    });

    humanLogger.warn('CASH', `Kode akses ${existing.code} dibatalkan oleh admin (${reason || 'Dibatalkan'})`);
    return updated;
  }

  /**
   * Menukarkan kode akses di Kiosk Pelanggan (Atomic Redemption)
   */
  async redeemAccessCode(sessionId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      // 1. Validasi Kode Akses
      const accessCode = await tx.accessCode.findUnique({
        where: { code },
        include: { package: true },
      });

      if (!accessCode) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Kode akses tidak valid atau tidak terdaftar');
      }

      if (accessCode.status === AccessCodeStatus.USED) {
        throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Kode akses ini sudah pernah digunakan sebelumnya');
      }

      if (accessCode.status === AccessCodeStatus.REVOKED) {
        throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Kode akses ini telah dibatalkan oleh kasir');
      }

      const now = new Date();
      if (accessCode.expiresAt < now || accessCode.status === AccessCodeStatus.EXPIRED) {
        await tx.accessCode.update({
          where: { id: accessCode.id },
          data: { status: AccessCodeStatus.EXPIRED },
        });
        throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Kode akses ini telah kedaluwarsa');
      }

      if (accessCode.type === 'EXTRA_PRINT') {
        throw new AppError(
          400,
          ErrorCode.VALIDATION_ERROR,
          `Kode ${code} adalah tiket Cetak Tambahan (${accessCode.extraPrints || 1} lembar), bukan untuk sesi foto baru. Gunakan kode ini pada layar Tambah Cetak.`
        );
      }

      // 2. Validasi Sesi Kiosk
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { package: true },
      });

      if (!session) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Sesi foto tidak ditemukan');
      }

      // Update paket sesi jika kode akses terikat ke paket tertentu
      let finalPackageId = session.packageId;
      if (accessCode.packageId && accessCode.packageId !== session.packageId) {
        finalPackageId = accessCode.packageId;
      }

      // 3. Ubah status kode akses menjadi USED
      await tx.accessCode.update({
        where: { id: accessCode.id },
        data: {
          status: AccessCodeStatus.USED,
          usedAt: now,
          usedSessionId: sessionId,
        },
      });

      // 4. Catat transaksi pembayaran tunai yang lunas
      const orderId = `CASH-CODE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      await tx.payment.create({
        data: {
          sessionId,
          orderId,
          grossAmount: accessCode.amount,
          paymentType: 'cash_access_code',
          transactionStatus: 'settlement',
          isVerified: true,
          expiryTime: new Date(Date.now() + 300000),
          settlementTime: now,
        },
      });

      // 5. Update status Sesi Kiosk menjadi PAYMENT_CONFIRMED & LUNAS
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          packageId: finalPackageId,
          state: 'PAYMENT_CONFIRMED',
          totalPrice: accessCode.amount,
        },
        include: {
          package: true,
        },
      });

      // 6. Catat audit log
      await tx.auditLog.create({
        data: {
          action: 'ACCESS_CODE_REDEEMED',
          details: {
            code,
            sessionId,
            amount: accessCode.amount,
            packageName: accessCode.package?.name || updatedSession.package.name,
          },
        },
      });

      humanLogger.payment(
        `Kode akses ${code} BERHASIL ditebus di booth! Sesi ${session.id} lunas (Rp ${accessCode.amount.toLocaleString('id-ID')})`
      );

      return {
        success: true,
        session: updatedSession,
        accessCode,
      };
    });
  }

  /**
   * Menukarkan kode akses CETAK TAMBAHAN (EXTRA_PRINT) di Kiosk Pelanggan
   */
  async redeemExtraPrintAccessCode(sessionId: string, rawCode: string, requiredPrints?: number) {
    const code = rawCode.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      // 1. Validasi Kode Akses
      const accessCode = await tx.accessCode.findUnique({
        where: { code },
        include: { package: true },
      });

      if (!accessCode) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Kode tiket tidak valid atau tidak terdaftar');
      }

      if (accessCode.status === AccessCodeStatus.USED) {
        throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Kode tiket ini sudah pernah digunakan sebelumnya');
      }

      if (accessCode.status === AccessCodeStatus.REVOKED) {
        throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Kode tiket ini telah dibatalkan oleh kasir');
      }

      const now = new Date();
      if (accessCode.expiresAt < now || accessCode.status === AccessCodeStatus.EXPIRED) {
        await tx.accessCode.update({
          where: { id: accessCode.id },
          data: { status: AccessCodeStatus.EXPIRED },
        });
        throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Kode tiket ini telah kedaluwarsa');
      }

      if (accessCode.type === 'SESSION') {
        throw new AppError(
          400,
          ErrorCode.VALIDATION_ERROR,
          `Kode ${code} adalah tiket Sesi Foto Baru, bukan untuk cetak tambahan.`
        );
      }

      const grantedPrints = accessCode.extraPrints > 0 ? accessCode.extraPrints : 1;
      if (requiredPrints && grantedPrints < requiredPrints) {
        throw new AppError(
          400,
          ErrorCode.VALIDATION_ERROR,
          `Kode ${code} hanya mencakup ${grantedPrints} lembar cetak tambahan, sedangkan Anda memilih ${requiredPrints} lembar.`
        );
      }

      // 2. Validasi Sesi Kiosk
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { package: true },
      });

      if (!session) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Sesi foto tidak ditemukan');
      }

      // Hindari tabrakan unique constraint jika sesi sudah terikat kode sesi awal
      const hasExistingPassLink = await tx.accessCode.findFirst({
        where: { usedSessionId: sessionId },
      });
      const safeUsedSessionId = hasExistingPassLink ? null : sessionId;

      // 3. Ubah status kode akses menjadi USED
      await tx.accessCode.update({
        where: { id: accessCode.id },
        data: {
          status: AccessCodeStatus.USED,
          usedAt: now,
          usedSessionId: safeUsedSessionId,
        },
      });

      // 4. Catat transaksi pembayaran cetak ekstra tunai yang lunas
      const orderId = `CASH-EXT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      await tx.payment.create({
        data: {
          sessionId,
          orderId,
          grossAmount: accessCode.amount,
          paymentType: 'cash_access_code',
          transactionStatus: 'settlement',
          isVerified: true,
          expiryTime: new Date(Date.now() + 300000),
          settlementTime: now,
        },
      });

      // 5. Update kuota lembar cetak sesi
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          additionalPrints: (session.additionalPrints || 0) + grantedPrints,
          totalPrice: (session.totalPrice || 0) + accessCode.amount,
        },
        include: {
          package: true,
        },
      });

      // 6. Catat audit log
      await tx.auditLog.create({
        data: {
          action: 'EXTRA_PRINT_CODE_REDEEMED',
          details: {
            code,
            sessionId,
            amount: accessCode.amount,
            grantedPrints,
          },
        },
      });

      humanLogger.payment(
        `Tiket Cetak Tambahan ${code} (+${grantedPrints} lembar) BERHASIL ditebus di booth! Sesi ${session.id}`
      );

      return {
        success: true,
        session: updatedSession,
        accessCode,
        extraPrints: grantedPrints,
      };
    });
  }
}

