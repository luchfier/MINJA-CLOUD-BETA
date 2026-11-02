// server/src/services/integration.service.ts
// Service Pengelolaan Integrasi API & Kiosk Identity
// Mengelola kredensial Midtrans, Resend, Cloudflare R2, dan Identitas Kiosk dengan Hot-Reload

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import { getEnv, reloadEnv } from '../config/env.js';
import { EmailService } from './email.service.js';
import { StorageService } from './storage.service.js';
import { logAuditEvent } from './audit.service.js';
import { humanLogger } from '../utils/humanLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, '../../.env');

export interface IntegrationConfigDto {
  kioskCode: string;
  kioskName: string;
  kioskLocation: string;
  boothApiKey: string;
  isActivated: boolean;
  midtransServerKey: string;
  midtransClientKey: string;
  midtransIsProduction: boolean;
  hasMidtransServerKey: boolean;
  resendApiKey: string;
  hasResendApiKey: boolean;
  resendFrom: string;
  galleryBaseUrl: string;
  // S3 properties kept for backwards type compatibility but sanitized
  s3Endpoint?: string;
  s3AccessKey?: string;
  hasS3SecretKey?: boolean;
  s3BucketName?: string;
  s3Region?: string;
}

export interface UpdateIntegrationInput {
  kioskCode?: string;
  kioskName?: string;
  kioskLocation?: string;
  boothApiKey?: string;
  midtransServerKey?: string;
  midtransClientKey?: string;
  midtransIsProduction?: boolean;
  resendApiKey?: string;
  resendFrom?: string;
  galleryBaseUrl?: string;
  s3Endpoint?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3BucketName?: string;
  s3Region?: string;
}

function maskSecret(val?: string, visibleChars = 4): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (trimmed.length <= visibleChars * 2) {
    return '••••••••';
  }
  const prefix = trimmed.slice(0, visibleChars);
  const suffix = trimmed.slice(-visibleChars);
  return `${prefix}••••••••${suffix}`;
}

export class IntegrationService {
  constructor(private prisma?: PrismaClient) {}

  /**
   * Mengambil konfigurasi integrasi & identitas kiosk saat ini (dengan nilai rahasia disamarkan)
   */
  public getIntegrations(): IntegrationConfigDto {
    const env = getEnv();
    const rawKey = env.BOOTH_API_KEY || '';
    const isActivated = Boolean(rawKey && rawKey !== 'dev-booth-key-for-testing' && rawKey !== 'ganti-dengan-string-unik-per-mesin');

    return {
      kioskCode: env.KIOSK_CODE || 'MJA-01',
      kioskName: env.KIOSK_NAME || 'Minja Photobooth — Kiosk 01',
      kioskLocation: env.KIOSK_LOCATION || 'Studio Utama',
      boothApiKey: maskSecret(rawKey, 6),
      isActivated,
      midtransServerKey: maskSecret(env.MIDTRANS_SERVER_KEY, 7),
      midtransClientKey: env.MIDTRANS_CLIENT_KEY || '',
      midtransIsProduction: Boolean(env.MIDTRANS_IS_PRODUCTION),
      hasMidtransServerKey: Boolean(env.MIDTRANS_SERVER_KEY && env.MIDTRANS_SERVER_KEY.trim().length > 0),
      resendApiKey: maskSecret(env.RESEND_API_KEY, 5),
      hasResendApiKey: Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.trim().length > 0),
      resendFrom: env.RESEND_FROM || 'Minja Photobooth <gallery@minja.my.id>',
      galleryBaseUrl: env.GALLERY_BASE_URL || 'https://gallery.minja.my.id',
    };
  }

  /**
   * Memperbarui konfigurasi file .env dan melakukan hot-reload in-memory
   */
  public async updateIntegrations(
    input: UpdateIntegrationInput,
    adminId?: string,
    ipAddress?: string
  ): Promise<IntegrationConfigDto> {
    // Map input fields to .env variable names
    const updates: Record<string, string> = {};

    if (input.kioskCode !== undefined) {
      updates['KIOSK_CODE'] = input.kioskCode.trim() || 'MJA-01';
    }
    if (input.kioskName !== undefined) {
      updates['KIOSK_NAME'] = `"${input.kioskName.trim() || 'Minja Photobooth — Kiosk 01'}"`;
    }
    if (input.kioskLocation !== undefined) {
      updates['KIOSK_LOCATION'] = `"${input.kioskLocation.trim() || 'Studio Utama'}"`;
    }
    if (input.boothApiKey !== undefined) {
      const raw = input.boothApiKey.trim();
      const val = raw
        .replace(/^BOOTH_API_KEY\s*=\s*/i, '')
        .replace(/^["']|["']$/g, '')
        .trim();
      if (!val.includes('••') && val.length > 0) {
        updates['BOOTH_API_KEY'] = val;
      }
    }

    // Midtrans
    if (input.midtransServerKey !== undefined) {
      const val = input.midtransServerKey.trim();
      // Jangan timpa jika mengandung titik-titik mask
      if (!val.includes('••') && val.length > 0) {
        updates['MIDTRANS_SERVER_KEY'] = val;
      }
    }
    if (input.midtransClientKey !== undefined) {
      updates['MIDTRANS_CLIENT_KEY'] = input.midtransClientKey.trim();
    }
    if (input.midtransIsProduction !== undefined) {
      updates['MIDTRANS_IS_PRODUCTION'] = input.midtransIsProduction ? 'true' : 'false';
    }

    // Resend
    if (input.resendApiKey !== undefined) {
      const val = input.resendApiKey.trim();
      if (!val.includes('••') && val.length > 0) {
        updates['RESEND_API_KEY'] = val;
      }
    }
    if (input.resendFrom !== undefined) {
      const val = input.resendFrom.trim();
      if (val.length > 0) {
        updates['RESEND_FROM'] = val.startsWith('"') ? val : `"${val}"`;
      }
    }

    // S3 / Cloudflare R2
    if (input.s3Endpoint !== undefined) {
      updates['S3_ENDPOINT'] = input.s3Endpoint.trim();
    }
    if (input.s3AccessKey !== undefined) {
      const val = input.s3AccessKey.trim();
      if (!val.includes('••') && val.length > 0) {
        updates['S3_ACCESS_KEY'] = val;
      }
    }
    if (input.s3SecretKey !== undefined) {
      const val = input.s3SecretKey.trim();
      if (!val.includes('••') && val.length > 0) {
        updates['S3_SECRET_KEY'] = val;
      }
    }
    if (input.s3BucketName !== undefined) {
      updates['S3_BUCKET_NAME'] = input.s3BucketName.trim();
    }
    if (input.s3Region !== undefined) {
      updates['S3_REGION'] = input.s3Region.trim() || 'auto';
    }

    // Domain Publik Galeri
    if (input.galleryBaseUrl !== undefined) {
      updates['GALLERY_BASE_URL'] = input.galleryBaseUrl.trim();
    }

    // 1. Tulis perubahan ke file .env
    this.writeEnvFile(updates);

    // 2. Update process.env in-memory seketika
    for (const [key, rawVal] of Object.entries(updates)) {
      // Hapus tanda kutip luar untuk process.env
      const cleanVal = rawVal.replace(/^"(.*)"$/, '$1');
      process.env[key] = cleanVal;
    }

    // 3. Reload config cache
    reloadEnv();

    // 4. Catat Audit Log
    if (this.prisma && adminId) {
      await logAuditEvent(this.prisma, {
        action: 'INTEGRATIONS_UPDATED',
        adminId,
        ipAddress,
        details: {
          updatedKeys: Object.keys(updates),
          kioskCode: process.env['KIOSK_CODE'],
          resendFrom: process.env['RESEND_FROM'],
          galleryBaseUrl: process.env['GALLERY_BASE_URL'],
        },
      });
    }

    humanLogger.success(
      'CONFIG',
      `Konfigurasi Integrasi & Kiosk Identity berhasil diperbarui (${Object.keys(updates).join(', ')})`
    );

    return this.getIntegrations();
  }

  /**
   * Membaca dan menimpa baris-baris tertentu pada file .env
   */
  private writeEnvFile(updates: Record<string, string>): void {
    let content = '';
    if (fs.existsSync(envFilePath)) {
      content = fs.readFileSync(envFilePath, 'utf-8');
    }

    const lines = content.split(/\r?\n/);
    const updatedKeys = new Set<string>();

    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) return line;

      const key = line.slice(0, equalIndex).trim();
      if (key in updates) {
        updatedKeys.add(key);
        return `${key}=${updates[key]}`;
      }
      return line;
    });

    // Tambahkan variabel baru yang belum ada di .env
    for (const [key, val] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}=${val}`);
      }
    }

    fs.writeFileSync(envFilePath, newLines.join('\n'), 'utf-8');
  }

  /**
   * Tes Pengiriman Email Uji Coba ke Alamat Tujuan
   */
  public async testEmail(targetEmail: string): Promise<{ sent: boolean; messageId: string; message: string }> {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const emailService = new EmailService();

    const result = await emailService.sendGalleryNotification(
      cleanEmail,
      `${getEnv().GALLERY_BASE_URL || 'https://gallery.minja.my.id'}/preview-test-session`,
      getEnv().KIOSK_NAME || 'Minja Photobooth'
    );

    if (result.isSimulated) {
      return {
        sent: true,
        messageId: result.messageId,
        message: 'Email dikirim dalam mode simulasi (kredensial Resend kosong).',
      };
    }

    return {
      sent: true,
      messageId: result.messageId,
      message: `Email uji coba berhasil dikirim ke ${cleanEmail} via Resend REST API!`,
    };
  }

  /**
   * Tes Validitas Kredensial Midtrans Server Key
   */
  public async testMidtrans(): Promise<{ success: boolean; message: string; isProduction: boolean }> {
    const env = getEnv();
    const serverKey = (env.MIDTRANS_SERVER_KEY || '').trim();

    if (!serverKey) {
      return {
        success: false,
        message: 'Server Key Midtrans belum diisi.',
        isProduction: env.MIDTRANS_IS_PRODUCTION,
      };
    }

    const isProduction = env.MIDTRANS_IS_PRODUCTION;
    const authHeader = Buffer.from(`${serverKey}:`).toString('base64');
    const baseUrl = isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';

    try {
      // Panggil endpoint dummy order status untuk memvalidasi otentikasi Server Key
      const response = await fetch(`${baseUrl}/MINJA-PING-TEST/status`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
      });

      // Status 404 (Not Found) membuktikan Server Key valid dan akun aktif (hanya transaksinya yang belum ada)
      // Status 401 berarti Server Key salah
      if (response.status === 404 || response.status === 200) {
        return {
          success: true,
          message: `Kredensial Midtrans Server Key VALID & Terhubung (${isProduction ? 'Production Live' : 'Sandbox Test Mode'})`,
          isProduction,
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Otentikasi Midtrans GAGAL (Status 401 Unauthorized). Periksa kembali Server Key Anda.',
          isProduction,
        };
      } else {
        const body = (await response.json().catch(() => ({}))) as any;
        return {
          success: true,
          message: `Koneksi Midtrans terverifikasi: ${body?.status_message || `HTTP ${response.status}`}`,
          isProduction,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menghubungi server Midtrans: ${err?.message || 'Network error'}`,
        isProduction,
      };
    }
  }

  /**
   * Tes Konektivitas Cloudflare R2 / AWS S3 Storage
   */
  public async testS3(): Promise<{ success: boolean; message: string }> {
    const env = getEnv();
    if (!env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !env.S3_ENDPOINT) {
      return {
        success: false,
        message: 'Kredensial Cloudflare R2 / S3 (Endpoint, Access Key, Secret Key) belum lengkap.',
      };
    }

    try {
      const storageService = new StorageService();
      if (!storageService.isCloudStorageActive()) {
        return {
          success: false,
          message: 'Kredensial Cloudflare R2 / S3 belum aktif atau tidak valid.',
        };
      }

      // Uji unggah file penanda kecil (ping)
      const testBuffer = Buffer.from('Minja S3 Connection Test');
      await storageService.uploadFile('system-health', `ping-${Date.now()}.txt`, testBuffer, 'text/plain');

      return {
        success: true,
        message: `Koneksi Cloudflare R2 / S3 Storage BERHASIL! Bucket "${env.S3_BUCKET_NAME}" aktif dan dapat ditulis.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal mengakses Cloudflare R2 / S3: ${err?.message || 'Storage error'}`,
      };
    }
  }
}
