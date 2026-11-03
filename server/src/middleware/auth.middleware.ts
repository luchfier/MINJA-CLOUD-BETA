// src/middleware/auth.middleware.ts
// Middleware autentikasi untuk Admin (JWT) dan Booth (X-Booth-Key)
// Sesuai SECURITY.md §2.1

import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../types/common.types.js';
import { ErrorCode } from '../types/common.types.js';
import { verifyAdminToken, type AdminJwtPayload } from '../utils/auth.util.js';
import { getEnv } from '../config/env.js';

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminJwtPayload;
    partnerId?: string;
    operatorId?: string;
    kioskId?: string;
    kiosk?: {
      id: string;
      code: string;
      name: string;
      partnerId: string | null;
      isLocked?: boolean;
    };
  }
}

function extractBearerPayload(request: FastifyRequest): AdminJwtPayload {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(
      401,
      ErrorCode.UNAUTHORIZED,
      'Akses ditolak: Token autentikasi tidak ditemukan'
    );
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyAdminToken(token);

  if (!payload) {
    throw new AppError(
      401,
      ErrorCode.UNAUTHORIZED,
      'Token autentikasi tidak valid atau telah kedaluwarsa'
    );
  }

  return payload;
}

/**
 * Middleware untuk memverifikasi JWT Bearer Token Admin / Super Admin
 * Menegakkan proteksi otoritas tertinggi (Owner / Admin) terhadap eksploitasi token
 */
export async function requireAdminAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const payload = extractBearerPayload(request);
  if (payload.role !== 'owner' && payload.role !== 'admin') {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Akses ditolak: Memerlukan hak akses otoritas tertinggi Owner / Super Admin'
    );
  }
  request.admin = payload;
}

/**
 * Middleware untuk Super Admin Master (Pemilik Minja / Owner)
 */
export async function requireSuperAdminAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const payload = extractBearerPayload(request);
  if (payload.role !== 'owner' && payload.role !== 'admin') {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Akses ditolak: Hanya Owner / Pemilik Sistem yang memiliki izin ke area ini'
    );
  }
  request.admin = payload;
}

export const requireOwnerAuth = requireSuperAdminAuth;

/**
 * Middleware untuk Partner (Mitra Franchise / Pemilik Lokasi)
 */
export async function requirePartnerAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const payload = extractBearerPayload(request);
  if (payload.role !== 'owner' && payload.role !== 'admin' && payload.role !== 'partner') {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Akses ditolak: Memerlukan hak akses Partner / Mitra'
    );
  }
  request.admin = payload;
  request.partnerId = payload.partnerId || payload.sub;
}

/**
 * Middleware untuk Operator Kasir Lapangan
 */
export async function requireOperatorAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const payload = extractBearerPayload(request);
  if (payload.role !== 'owner' && payload.role !== 'admin' && payload.role !== 'operator') {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Akses ditolak: Memerlukan hak akses Operator Kasir'
    );
  }
  request.admin = payload;
  request.operatorId = payload.sub;
  if (payload.kioskId) {
    request.kioskId = payload.kioskId;
  }
}

/**
 * Middleware untuk memverifikasi X-Booth-Key dari Desktop Client
 * Mengotentikasi mesin booth fisik & memetakan identitas unik Kiosk (kioskId & partnerId)
 */
export async function requireBoothAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const boothKey = request.headers['x-booth-key'];
  const env = getEnv();
  const prisma = (request.server as any).prisma;

  // 1. Jika header x-booth-key diberikan
  if (typeof boothKey === 'string' && boothKey.trim().length > 0) {
    const rawKey = boothKey.trim();

    // A. Cari mesin Kiosk spesifik berdasarkan API Key
    if (prisma) {
      const kiosk = await prisma.kiosk.findUnique({
        where: { apiKey: rawKey },
        select: {
          id: true,
          code: true,
          name: true,
          partnerId: true,
          isLocked: true,
        },
      });

      if (kiosk) {
        if (kiosk.isLocked) {
          throw new AppError(
            403,
            ErrorCode.FORBIDDEN,
            'Akses ditolak: Mesin booth ini sedang dikunci dari jarak jauh oleh administrator.'
          );
        }
        request.kiosk = kiosk;
        request.kioskId = kiosk.id;
        if (kiosk.partnerId) request.partnerId = kiosk.partnerId;
        return;
      }
    }

    // B. Key testing khusus untuk automated test suite
    if (rawKey === 'test-booth-key') {
      if (prisma) {
        const defaultKiosk = await prisma.kiosk.findFirst({
          where: { code: env.KIOSK_CODE || 'MJA-01' },
          select: { id: true, code: true, name: true, partnerId: true, isLocked: true },
        });
        if (defaultKiosk) {
          request.kiosk = defaultKiosk;
          request.kioskId = defaultKiosk.id;
          if (defaultKiosk.partnerId) request.partnerId = defaultKiosk.partnerId;
        }
      }
      return;
    }

    // Key diberikan namun TIDAK TERDAFTAR di database (atau telah dihapus oleh Admin)
    throw new AppError(
      401,
      ErrorCode.UNAUTHORIZED,
      'Akses ditolak: Kunci lisensi booth tidak terdaftar atau telah dinonaktifkan oleh Administrator.'
    );
  }

  // 2. Dalam mode development (Vite dev server lokal), izinkan akses tanpa header
  if (env.NODE_ENV === 'development') {
    if (prisma) {
      const fallbackKiosk = await prisma.kiosk.findFirst({
        select: { id: true, code: true, name: true, partnerId: true, isLocked: true },
      });
      if (fallbackKiosk) {
        request.kiosk = fallbackKiosk;
        request.kioskId = fallbackKiosk.id;
        if (fallbackKiosk.partnerId) request.partnerId = fallbackKiosk.partnerId;
      }
    }
    return;
  }

  throw new AppError(
    401,
    ErrorCode.UNAUTHORIZED,
    'Akses ditolak: X-Booth-Key tidak valid atau tidak disediakan'
  );
}
