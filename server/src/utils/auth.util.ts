// src/utils/auth.util.ts
// Utility autentikasi: Argon2id hashing & JWT token management
// Sesuai SECURITY.md §2.2 & §2.4

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getEnv } from '../config/env.js';

/**
 * Parameter Argon2id sesuai rekomendasi OWASP & SECURITY.md §2.2
 */
const ARGON2_CONFIG: argon2.HashOptions & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterasi
  parallelism: 4,
  hashLength: 32,
  raw: false,
};

/**
 * Hash PIN menggunakan Argon2id
 */
export async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pin, ARGON2_CONFIG);
}

/**
 * Verifikasi PIN input dengan hash yang tersimpan
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, pin);
  } catch {
    return false;
  }
}

export type UserRole = 'admin' | 'owner' | 'partner' | 'operator';

export interface AdminJwtPayload {
  sub: string;
  role: UserRole;
  iss: string;
  partnerId?: string;
  kioskId?: string;
}

/**
 * Terbitkan JWT untuk sesi admin/owner (otoritas tertinggi Owner)
 */
export function signAdminToken(adminId: string, role: UserRole = 'owner'): { token: string; expiresAt: string } {
  return signCustomToken({
    sub: adminId,
    role,
    expiresIn: '4h',
  });
}

/**
 * Alias eksplisit untuk menerbitkan token otoritas tertinggi Owner
 */
export function signOwnerToken(ownerId: string): { token: string; expiresAt: string } {
  return signCustomToken({
    sub: ownerId,
    role: 'owner',
    expiresIn: '4h',
  });
}

export interface SignTokenOptions {
  sub: string;
  role: UserRole;
  partnerId?: string;
  kioskId?: string;
  expiresIn?: string;
}

/**
 * Terbitkan JWT untuk sesi beraneka peran (Admin, Owner, Partner, Operator)
 */
export function signCustomToken(options: SignTokenOptions): { token: string; expiresAt: string } {
  const env = getEnv();
  const expiresIn = options.expiresIn || '8h';

  // Estimasi expiresAt
  const hoursMatch = expiresIn.match(/^(\d+)h$/);
  const hours = hoursMatch && hoursMatch[1] ? parseInt(hoursMatch[1], 10) : 8;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const token = jwt.sign(
    {
      sub: options.sub,
      role: options.role,
      ...(options.partnerId ? { partnerId: options.partnerId } : {}),
      ...(options.kioskId ? { kioskId: options.kioskId } : {}),
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: (options.expiresIn || '8h') as any,
      issuer: 'minjaphotobooth',
    }
  );

  return { token, expiresAt };
}

/**
 * Verifikasi JWT token admin / user RBAC
 */
export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'minjaphotobooth',
    }) as AdminJwtPayload;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Enkripsi AES-256-GCM dua arah untuk field sensitif di database (contoh: rawPassword at rest)
 * Menjamin database Supabase PostgreSQL tidak menyimpan password plaintext
 */
export function encryptAtRest(plainText: string, secretKey = getEnv().JWT_SECRET): string {
  if (!plainText) return plainText;
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Dekripsi AES-256-GCM dua arah saat field sensitif dibutuhkan kembali oleh Super Admin
 * Mendukung backward-compatibility penuh jika data masih berupa teks biasa lama
 */
export function decryptAtRest(encryptedText: string, secretKey = getEnv().JWT_SECRET): string {
  if (!encryptedText || !encryptedText.startsWith('enc:')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) return encryptedText;
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const encrypted = Buffer.from(parts[3], 'hex');
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return encryptedText;
  }
}

