// src/services/session.service.ts
// Service manajemen Sesi Pelanggan (Sessions)
// Sesuai ARCHITECTURE.md §6.3 & API_CONTRACT.md §3.5

import type { PrismaClient, SessionState } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import { getEnv } from '../config/env.js';
import { formatSessionCode } from '../utils/session.util.js';
import { humanLogger } from '../utils/humanLogger.js';
import { TransactionEngineService } from './transactionEngine.service.js';
import type {
  CreateSessionInput,
  UpdateSessionStateInput,
  CompleteSessionInput,
} from '../schemas/session.schema.js';

export interface SessionDto {
  id: string;
  sessionCode: string;
  packageId: string;
  packageName: string;
  state: SessionState;
  basePrice: number;
  additionalPrints: number;
  additionalPrintCost: number;
  totalPrice: number;
  maxShots: number;
  maxSelections: number;
  totalPrints: number;
  durationSeconds: number;
  shotsTaken: number;
  photosSelected: number;
  photosPrinted: number;
  createdAt: string;
  expiresAt: string;
  payment?: {
    orderId: string;
    grossAmount: number;
    transactionStatus: string;
    qrString?: string | null;
  } | null;
}

import { getSessionNameEngine, SessionNameEngine } from './sessionNameEngine.service.js';

export class SessionService {
  private sessionNameEngine: SessionNameEngine;

  constructor(
    private prisma: PrismaClient,
    sessionNameEngine?: SessionNameEngine
  ) {
    this.sessionNameEngine = sessionNameEngine || getSessionNameEngine(prisma);
  }

  private mapToDto(session: any): SessionDto {
    return {
      id: session.id,
      sessionCode: formatSessionCode(session.id),
      packageId: session.packageId,
      packageName: session.package?.name || 'Paket Foto',
      state: session.state,
      basePrice: session.basePrice,
      additionalPrints: session.additionalPrints,
      additionalPrintCost: session.additionalPrintCost,
      totalPrice: session.totalPrice,
      maxShots: session.maxShots,
      maxSelections: session.maxSelections,
      totalPrints: session.totalPrints,
      durationSeconds: session.durationSeconds,
      shotsTaken: session.shotsTaken,
      photosSelected: session.photosSelected,
      photosPrinted: session.photosPrinted,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      payment: Array.isArray(session.payments) && session.payments.length > 0
        ? {
            orderId: session.payments[session.payments.length - 1].orderId,
            grossAmount: session.payments[session.payments.length - 1].grossAmount,
            transactionStatus: session.payments[session.payments.length - 1].transactionStatus,
            qrString: session.payments[session.payments.length - 1].qrString,
          }
        : session.payment
        ? {
            orderId: session.payment.orderId,
            grossAmount: session.payment.grossAmount,
            transactionStatus: session.payment.transactionStatus,
            qrString: session.payment.qrString,
          }
        : null,
    };
  }

  /**
   * Membuat sesi baru berdasarkan paket yang dipilih pelanggan
   */
  async createSession(input: CreateSessionInput, callerKioskId?: string): Promise<SessionDto> {
    const settings = await this.prisma.settings.findFirst({ select: { maintenanceMode: true } });
    if (settings?.maintenanceMode) {
      throw new AppError(
        503,
        ErrorCode.KIOSK_IN_MAINTENANCE,
        'Kiosk sedang dalam mode pemeliharaan / pengisian kertas. Sesi baru tidak dapat dimulai saat ini.'
      );
    }

    const pkg = await this.prisma.package.findUnique({
      where: { id: input.packageId },
    });

    if (!pkg) {
      throw new AppError(404, ErrorCode.PACKAGE_NOT_FOUND, 'Paket foto tidak ditemukan');
    }

    if (!pkg.isActive) {
      throw new AppError(400, ErrorCode.PACKAGE_INACTIVE, 'Paket foto sedang tidak aktif');
    }

    const additionalPrints = input.additionalPrints || 0;
    const additionalPrintCost = additionalPrints * pkg.additionalPrintPrice;
    const totalPrice = pkg.price + additionalPrintCost;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    // Gunakan ID sesi dari Kiosk jika dikirim (Opsi 2 Local-First), atau hasilkan via SessionNameEngine
    let sessionId = input.id ? input.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    if (sessionId) {
      const existingSession = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          package: true,
          payments: true,
        },
      });
      if (existingSession) {
        return this.mapToDto(existingSession);
      }
    } else {
      let sessionPrefix = 'MJA';
      try {
        const code = (getEnv().KIOSK_CODE || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (code.length > 0) {
          sessionPrefix = code;
        }
      } catch {
        // fallback to MJA
      }
      sessionId = await this.sessionNameEngine.generateNextSessionId({ prefix: sessionPrefix });
    }

    // Temukan Kiosk ID jika diberikan oleh route / auth middleware atau jika booth memiliki API key terdaftar
    let matchedKioskId: string | null = callerKioskId || null;
    if (!matchedKioskId) {
      try {
        const apiKey = getEnv().BOOTH_API_KEY;
        if (apiKey && apiKey !== 'dev-booth-key-for-testing') {
          const kiosk = await this.prisma.kiosk.findUnique({ where: { apiKey } });
          if (kiosk) matchedKioskId = kiosk.id;
        }
      } catch {}
    }
    if (!matchedKioskId) {
      const firstKiosk = await this.prisma.kiosk.findFirst({ select: { id: true } }).catch(() => null);
      if (firstKiosk) matchedKioskId = firstKiosk.id;
    }

    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        packageId: pkg.id,
        kioskId: matchedKioskId,
        state: 'AWAITING_PAYMENT',
        basePrice: pkg.price,
        additionalPrints,
        additionalPrintCost,
        totalPrice,
        maxShots: pkg.maxShots,
        maxSelections: pkg.maxSelections,
        totalPrints: pkg.defaultPrints + additionalPrints,
        durationSeconds: pkg.durationSeconds,
        expiresAt,
      },
      include: {
        package: true,
        payments: true,
      },
    });

    humanLogger.session(`Sesi baru dimulai: ${formatSessionCode(session.id)} - Paket "${pkg.name}" (Rp ${totalPrice.toLocaleString('id-ID')})`);

    return this.mapToDto(session);
  }

  /**
   * Mengambil detail sesi berdasarkan ID
   */
  async getSession(id: string): Promise<SessionDto> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        package: true,
        payments: true,
        template: true,
      },
    });

    if (!session) {
      throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
    }

    return this.mapToDto(session);
  }

  /**
   * Mengambil sesi aktif saat ini di booth
   */
  async getActiveSession(): Promise<SessionDto | null> {
    const session = await this.prisma.session.findFirst({
      where: {
        state: {
          notIn: ['COMPLETED', 'CANCELLED', 'EXPIRED'],
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        package: true,
        payments: true,
      },
    });

    return session ? this.mapToDto(session) : null;
  }

  /**
   * Update state lifecycle sesi
   */
  async updateSessionState(id: string, input: UpdateSessionStateInput): Promise<SessionDto> {
    const existing = await this.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        state: input.state as SessionState,
        shotsTaken: input.shotsTaken !== undefined ? input.shotsTaken : undefined,
        photosSelected: input.photosSelected !== undefined ? input.photosSelected : undefined,
      },
      include: {
        package: true,
        payments: true,
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Menyelesaikan sesi foto (mendukung Lazy Cloud Sync jika sesi belum terdaftar di Supabase)
   */
  async completeSession(id: string, input: CompleteSessionInput, callerKioskId?: string): Promise<SessionDto> {
    let existing = await this.prisma.session.findUnique({ where: { id } });

    // Hitung total pembayaran riil dari settledPayments jika dikirim oleh Kiosk
    let syncedTotalPrice: number | undefined;
    let syncedAdditionalPrints: number | undefined;
    let syncedAdditionalPrintCost: number | undefined;

    if (Array.isArray(input.settledPayments) && input.settledPayments.length > 0) {
      let totalPaid = 0;
      let extraPrints = 0;
      let extraCost = 0;
      for (const sp of input.settledPayments) {
        const amt = Math.max(0, Number(sp.grossAmount) || 0);
        totalPaid += amt;
        if (String(sp.orderId || '').includes('-EXT-')) {
          extraCost += amt;
          extraPrints += Math.max(1, Number(sp.printCopies) || 1);
        }
      }
      syncedTotalPrice = totalPaid;
      if (extraPrints > 0) {
        syncedAdditionalPrints = extraPrints;
        syncedAdditionalPrintCost = extraCost;
      }
    }

    let updated: any;

    if (!existing) {
      let pkg = input.packageId
        ? await this.prisma.package.findUnique({ where: { id: input.packageId } })
        : null;
      if (!pkg) {
        pkg = await this.prisma.package.findFirst({ where: { isActive: true } });
      }
      if (!pkg) {
        throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
      }

      let matchedKioskId: string | null = callerKioskId || null;
      if (!matchedKioskId && id.includes('-')) {
        const prefix = id.split('-')[0];
        if (prefix && prefix.length >= 2) {
          const foundKiosk = await this.prisma.kiosk
            .findFirst({
              where: {
                OR: [
                  { code: { equals: prefix, mode: 'insensitive' } },
                  { code: { startsWith: prefix, mode: 'insensitive' } },
                ],
              },
              select: { id: true },
            })
            .catch(() => null);
          if (foundKiosk) matchedKioskId = foundKiosk.id;
        }
      }

      updated = await this.prisma.session.create({
        data: {
          id,
          packageId: pkg.id,
          kioskId: matchedKioskId,
          state: 'COMPLETED',
          completedAt: new Date(),
          basePrice: pkg.price,
          additionalPrints: syncedAdditionalPrints ?? 0,
          additionalPrintCost: syncedAdditionalPrintCost ?? 0,
          totalPrice: syncedTotalPrice ?? pkg.price,
          maxShots: pkg.maxShots,
          maxSelections: pkg.maxSelections,
          totalPrints: pkg.defaultPrints + (syncedAdditionalPrints ?? 0),
          durationSeconds: pkg.durationSeconds,
          shotsTaken: input.shotsTaken,
          photosSelected: input.photosSelected,
          photosPrinted: input.photosPrinted,
          ...(input.templateId ? { templateId: input.templateId } : {}),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
        },
        include: {
          package: true,
          payments: true,
        },
      });
      existing = updated;
    } else {
      let validPackageId: string | undefined;
      if (input.packageId && input.packageId !== existing.packageId) {
        const foundPkg = await this.prisma.package.findUnique({
          where: { id: input.packageId },
          select: { id: true },
        });
        if (foundPkg) validPackageId = foundPkg.id;
      }

      updated = await this.prisma.session.update({
        where: { id },
        data: {
          state: 'COMPLETED',
          completedAt: new Date(),
          shotsTaken: input.shotsTaken,
          photosSelected: input.photosSelected,
          photosPrinted: input.photosPrinted,
          ...(validPackageId ? { packageId: validPackageId } : {}),
          ...(callerKioskId && !existing.kioskId ? { kioskId: callerKioskId } : {}),
          ...(syncedTotalPrice !== undefined ? { totalPrice: syncedTotalPrice } : {}),
          ...(syncedAdditionalPrints !== undefined ? { additionalPrints: syncedAdditionalPrints } : {}),
          ...(syncedAdditionalPrintCost !== undefined ? { additionalPrintCost: syncedAdditionalPrintCost } : {}),
          ...(input.templateId ? { templateId: input.templateId } : {}),
        },
        include: {
          package: true,
          payments: true,
        },
      });
    }

    // Sinkronkan bukti transaksi lunas (settledPayments) dari Kiosk (offline/PROMO_FREE/Cash/Extra Prints)
    if (Array.isArray(input.settledPayments) && input.settledPayments.length > 0) {
      for (const sp of input.settledPayments) {
        if (!sp?.orderId) continue;
        const mRaw = String(sp.paymentMethod || '').toUpperCase();
        const paymentType =
          mRaw === 'CASH'
            ? 'cash'
            : mRaw === 'ACCESS_CODE'
            ? 'access_code'
            : mRaw === 'PROMO_FREE'
            ? 'promo_free'
            : mRaw === 'TEST_BYPASS'
            ? 'test_bypass'
            : 'qris';
        const settledAt = sp.settlementTime ? new Date(sp.settlementTime) : new Date();
        const validSettledAt = isNaN(settledAt.getTime()) ? new Date() : settledAt;

        await this.prisma.payment.upsert({
          where: { orderId: sp.orderId },
          create: {
            sessionId: id,
            orderId: sp.orderId,
            grossAmount: Math.max(0, Number(sp.grossAmount) || 0),
            paymentType,
            transactionStatus: 'settlement',
            isVerified: true,
            expiryTime: new Date(validSettledAt.getTime() + 15 * 60 * 1000),
            settlementTime: validSettledAt,
          },
          update: {
            grossAmount: Math.max(0, Number(sp.grossAmount) || 0),
            paymentType,
            transactionStatus: 'settlement',
            isVerified: true,
            settlementTime: validSettledAt,
          },
        }).catch((e) => console.warn('[SessionService] Gagal upsert settled payment:', e));
      }
      TransactionEngineService.invalidateCache();
    }

    if (input.finalPhotoUrl) {
      await this.prisma.photo.upsert({
        where: {
          sessionId_shotNumber: {
            sessionId: id,
            shotNumber: 1,
          },
        },
        create: {
          sessionId: id,
          shotNumber: 1,
          localFilePath: '',
          originalFilename: 'design_1.jpg',
          fileSizeBytes: 0,
          width: 1200,
          height: 1800,
          mimeType: 'image/jpeg',
          storageUrl: input.finalPhotoUrl,
          isSelected: true,
        },
        update: {
          storageUrl: input.finalPhotoUrl,
        },
      }).catch((e) => console.warn('[SessionService] Gagal upsert photo record:', e));
    }

    // Kurangi sisa kertas di booth HANYA JIKA pelacakan kertas diaktifkan oleh Mitra (Default: OFF)
    if (existing.kioskId) {
      try {
        const kiosk = await this.prisma.kiosk.findUnique({
          where: { id: existing.kioskId },
          select: { id: true, disabledPackageIds: true, paperRemaining: true },
        });

        const isPaperTrackingEnabled = Boolean(
          kiosk &&
          Array.isArray(kiosk.disabledPackageIds) &&
          kiosk.disabledPackageIds.includes('__CFG:PAPER_TRACKING_ON__')
        );

        if (isPaperTrackingEnabled) {
          const printsToDeduct = (input.photosPrinted !== undefined && input.photosPrinted > 0)
            ? input.photosPrinted
            : (existing.totalPrints || 1);

          await this.prisma.kiosk.update({
            where: { id: existing.kioskId },
            data: {
              paperRemaining: { decrement: printsToDeduct },
            },
          });
        }
      } catch {}
    }

    return this.mapToDto(updated);
  }

  /**
   * Membatalkan sesi
   */
  async cancelSession(id: string, reason?: string): Promise<SessionDto> {
    const existing = await this.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        state: 'CANCELLED',
        cancelReason: reason || 'Dibatalkan oleh pengguna',
      },
      include: {
        package: true,
        payments: true,
      },
    });

    return this.mapToDto(updated);
  }
}
