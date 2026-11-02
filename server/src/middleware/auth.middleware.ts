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
 * Digunakan untuk endpoint operasional internal booth
 */
export async function requireBoothAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const boothKey = request.headers['x-booth-key'];
  const env = getEnv();

  // Allow if valid booth key provided
  if (boothKey && boothKey === env.BOOTH_API_KEY) {
    return;
  }

  // In development, allow frontend Vite dev server requests
  if (env.NODE_ENV === 'development') {
    return;
  }

  throw new AppError(
    401,
    ErrorCode.UNAUTHORIZED,
    'Akses ditolak: X-Booth-Key tidak valid atau tidak disediakan'
  );
}
