// src/services/session.service.ts
// Service manajemen Sesi Pelanggan (Sessions)
// Sesuai ARCHITECTURE.md §6.3 & API_CONTRACT.md §3.5

import type { PrismaClient, SessionState } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import { getEnv } from '../config/env.js';
import { formatSessionCode } from '../utils/session.util.js';
import { humanLogger } from '../utils/humanLogger.js';
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
    const settings = await this.prisma.settings.findFirst();
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

    // Hasilkan ID sesi terstruktur non-random via SessionNameEngine (MJA01-YYYYMMDD-0001)
    let sessionPrefix = 'MJA';
    try {
      const code = (getEnv().KIOSK_CODE || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (code.length > 0) {
        sessionPrefix = code;
      }
    } catch {
      // fallback to MJA
    }
    const sessionId = await this.sessionNameEngine.generateNextSessionId({ prefix: sessionPrefix });

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
   * Menyelesaikan sesi foto
   */
  async completeSession(id: string, input: CompleteSessionInput): Promise<SessionDto> {
    const existing = await this.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        state: 'COMPLETED',
        completedAt: new Date(),
        shotsTaken: input.shotsTaken,
        photosSelected: input.photosSelected,
        photosPrinted: input.photosPrinted,
      },
      include: {
        package: true,
        payments: true,
      },
    });

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
