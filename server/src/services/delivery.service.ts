// src/services/delivery.service.ts
// Service Orkestrasi Distribusi Digital (Galeri Berbatas Waktu 48 Jam & Email Delivery API)

import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { Archiver } from 'archiver';
import type { PrismaClient } from '@prisma/client';
import { StorageService, type SessionGalleryItem } from './storage.service.js';
import { EmailService } from './email.service.js';
import { AppError, ErrorCode } from '../types/common.types.js';
import { getEnv } from '../config/env.js';
import { formatSessionCode, formatSessionDigits } from '../utils/session.util.js';
import { GalleryProgressEngine, GalleryProgressReport } from './galleryProgressEngine.service.js';

const require = createRequire(import.meta.url);
const rawArchiver = require('archiver');

function createZipArchive(options?: any): Archiver {
  if (typeof (rawArchiver as any)?.ZipArchive === 'function') {
    return new (rawArchiver as any).ZipArchive(options);
  }
  if (typeof (rawArchiver as any)?.default?.ZipArchive === 'function') {
    return new (rawArchiver as any).default.ZipArchive(options);
  }
  if (typeof (rawArchiver as any)?.create === 'function') {
    return (rawArchiver as any).create('zip', options);
  }
  if (typeof rawArchiver === 'function') {
    return (rawArchiver as any)('zip', options);
  }
  if (typeof (rawArchiver as any)?.default?.create === 'function') {
    return (rawArchiver as any).default.create('zip', options);
  }
  if (typeof (rawArchiver as any)?.default === 'function') {
    return (rawArchiver as any).default('zip', options);
  }
  throw new Error('Tidak dapat menginisialisasi archiver engine.');
}

export interface GalleryDetails {
  galleryId: string;
  sessionId: string;
  qrString: string;
  galleryUrl: string;
  token: string;
  shortSessionNumber: string;
  pin: string;
  expiresAt: string;
  accessCount: number;
}

export class DeliveryService {
  private progressEngine: GalleryProgressEngine;

  constructor(
    private prisma: PrismaClient,
    public storageService: StorageService = new StorageService(),
    private emailService: EmailService = new EmailService(),
    progressEngine?: GalleryProgressEngine
  ) {
    this.progressEngine = progressEngine || new GalleryProgressEngine(this.storageService);
  }

  /**
   * Menentukan base URL galeri Cloud resmi (default: https://gallery.minja.my.id)
   */
  public getBaseUrl(): string {
    const env = getEnv();
    if (env.GALLERY_BASE_URL && env.GALLERY_BASE_URL.trim().length > 0) {
      return env.GALLERY_BASE_URL.replace(/\/+$/, '');
    }
    return 'https://gallery.minja.my.id';
  }

  /**
   * Membuat atau mengambil galeri privat berbatas waktu (48 jam) untuk sebuah sesi
   */
  async getOrCreateGallery(sessionId: string): Promise<GalleryDetails> {
    const existing = await this.prisma.gallery.findUnique({
      where: { sessionId },
      select: {
        id: true,
        sessionId: true,
        token: true,
        expiresAt: true,
        accessCount: true,
      },
    });

    const settings = await this.prisma.settings.findFirst({
      select: { boothName: true },
    });
    const boothName = settings?.boothName || 'Minja Photobooth';
    const shortSessionNumber = formatSessionDigits(sessionId);

    if (existing) {
      if (this.storageService.isCloudStorageActive()) {
        this.storageService.publishCloudGallery(
          sessionId,
          formatSessionCode(sessionId),
          existing.expiresAt.toISOString(),
          boothName,
          existing.token
        ).catch((e) => console.warn('[DeliveryService] Cloud gallery publish failed:', e));
      }

      const galleryUrl = `${this.getBaseUrl()}/s/${sessionId}?token=${existing.token}`;
      const existingPin = existing.token.includes('-')
        ? existing.token.split('-')[0]
        : existing.token.slice(0, 4);

      return {
        galleryId: existing.id,
        sessionId: existing.sessionId,
        qrString: galleryUrl,
        galleryUrl,
        token: existing.token,
        shortSessionNumber,
        pin: existingPin,
        expiresAt: existing.expiresAt.toISOString(),
        accessCount: existing.accessCount,
      };
    }

    const sessionExists = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });

    if (!sessionExists) {
      let pkg = await this.prisma.package.findFirst();
      if (!pkg) {
        pkg = await this.prisma.package.create({
          data: {
            name: 'Paket Photobooth Standar',
            price: 50000,
            durationSeconds: 180,
            maxShots: 6,
            maxSelections: 3,
            defaultPrints: 2,
            additionalPrintPrice: 15000,
          },
        });
      }

      await this.prisma.session.create({
        data: {
          id: sessionId,
          packageId: pkg.id,
          basePrice: pkg.price,
          totalPrice: pkg.price,
          maxShots: pkg.maxShots,
          maxSelections: pkg.maxSelections,
          totalPrints: pkg.defaultPrints,
          durationSeconds: pkg.durationSeconds,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });
    }

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const token = `${pin}-${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

    const created = await this.prisma.gallery.create({
      data: {
        sessionId,
        token,
        expiresAt,
      },
    });

    if (this.storageService.isCloudStorageActive()) {
      this.storageService.publishCloudGallery(
        sessionId,
        formatSessionCode(sessionId),
        created.expiresAt.toISOString(),
        boothName,
        created.token
      ).catch((e) => console.warn('[DeliveryService] Cloud gallery publish failed:', e));
    }

    const galleryUrl = `${this.getBaseUrl()}/s/${sessionId}?token=${token}`;

    return {
      galleryId: created.id,
      sessionId: created.sessionId,
      qrString: galleryUrl,
      galleryUrl,
      token: created.token,
      shortSessionNumber,
      pin,
      expiresAt: created.expiresAt.toISOString(),
      accessCount: created.accessCount,
    };
  }

  /**
   * Mengirimkan notifikasi tautan unduhan galeri foto via Email
   */
  async sendEmailNotification(
    sessionId: string,
    email: string
  ): Promise<{ sent: boolean; messageId: string }> {
    const gallery = await this.getOrCreateGallery(sessionId);

    const settings = await this.prisma.settings.findFirst({
      select: { boothName: true },
    });
    const boothName = settings?.boothName || 'Minja Photobooth';

    const sessionCode = formatSessionCode(sessionId);
    const sendRes = await this.emailService.sendGalleryNotification(
      email,
      gallery.galleryUrl,
      boothName,
      sessionCode
    );

    try {
      await this.prisma.deliveryJob.create({
        data: {
          sessionId,
          galleryId: gallery.galleryId,
          channel: 'email',
          email: sendRes.recipientEmail,
          status: 'sent',
          messageId: sendRes.messageId,
          sentAt: new Date(),
        },
      });
    } catch (err) {
      console.warn('[DeliveryService] Gagal menyimpan DeliveryJob ke Prisma:', err);
    }

    return {
      sent: true,
      messageId: sendRes.messageId,
    };
  }

  /**
   * Akses publik untuk smartphone pelanggan mengunduh foto dari galeri
   */
  async getPublicGallery(
    sessionId: string,
    token: string
  ): Promise<{
    sessionCode: string;
    expiresAt: string;
    isExpired: boolean;
    files: string[];
    accessCount: number;
  }> {
    const gallery = await this.prisma.gallery.findUnique({
      where: { sessionId },
      select: {
        id: true,
        sessionId: true,
        token: true,
        expiresAt: true,
        accessCount: true,
      },
    });

    if (!gallery || gallery.token !== token) {
      throw new AppError(
        404,
        ErrorCode.GALLERY_TOKEN_INVALID,
        'Tautan galeri tidak valid atau token verifikasi salah.'
      );
    }

    const isExpired = new Date() > gallery.expiresAt;
    if (isExpired) {
      throw new AppError(
        410,
        ErrorCode.GALLERY_EXPIRED,
        'Masa aktif tautan galeri foto telah berakhir (maksimal 48 jam).'
      );
    }

    await this.prisma.gallery.update({
      where: { id: gallery.id },
      data: { accessCount: { increment: 1 } },
      select: { id: true },
    });

    const files = await this.storageService.listSessionFiles(sessionId);

    return {
      sessionCode: formatSessionDigits(gallery.sessionId),
      expiresAt: gallery.expiresAt.toISOString(),
      isExpired: false,
      files,
      accessCount: gallery.accessCount + 1,
    };
  }

  /**
   * Melakukan pencarian galeri berdasarkan nomor sesi (4 digit urut atau full ID) & PIN 4-digit
   */
  async lookupGallery(sessionInput: string, pinInput: string): Promise<{
    status: 'ready' | 'processing' | 'expired';
    sessionId: string;
    sessionCode: string;
    token: string;
    expiresAt: string;
    createdAt?: string;
    studioAddress?: string;
    message?: string;
    progress?: number;
    currentPhaseLabel?: string;
    steps?: GalleryProgressReport['steps'];
    items?: SessionGalleryItem[];
  }> {
    const cleanSession = sessionInput.trim();
    const cleanPin = pinInput.trim();

    if (!cleanSession || !cleanPin) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Nomor sesi dan PIN wajib diisi.');
    }

    const sessionDigits = cleanSession.replace(/\D/g, '');

    const orConditions: any[] = [
      { sessionId: cleanSession },
      { sessionId: { endsWith: cleanSession } },
      { sessionId: { endsWith: `-${cleanSession}` } },
      { token: { startsWith: cleanPin } },
      { token: cleanPin },
    ];

    if (sessionDigits.length > 0) {
      orConditions.push(
        { sessionId: { endsWith: sessionDigits } },
        { sessionId: { endsWith: `-${sessionDigits}` } },
        { sessionId: { endsWith: String(parseInt(sessionDigits, 10)) } }
      );
    }

    const galleries = await this.prisma.gallery.findMany({
      where: {
        OR: orConditions,
      },
      select: {
        id: true,
        sessionId: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const matchedGallery = galleries.find((g) => {
      const gPin = g.token.includes('-') ? g.token.split('-')[0] : g.token.slice(0, 4);
      return g.token === cleanPin || gPin === cleanPin || g.token.startsWith(cleanPin);
    });

    if (!matchedGallery) {
      throw new AppError(404, ErrorCode.GALLERY_TOKEN_INVALID, 'Nomor sesi atau PIN tidak ditemukan.');
    }

    const studioAddress = 'Lokasi Booth Minja Studio';
    const createdAtIso = matchedGallery.createdAt.toISOString();

    if (new Date() > matchedGallery.expiresAt) {
      return {
        status: 'expired',
        sessionId: matchedGallery.sessionId,
        sessionCode: formatSessionDigits(matchedGallery.sessionId),
        token: matchedGallery.token,
        expiresAt: matchedGallery.expiresAt.toISOString(),
        createdAt: createdAtIso,
        studioAddress,
        message: 'Masa aktif galeri foto telah berakhir (maksimal 48 jam).',
      };
    }

    const progressReport = await this.progressEngine.computeSessionProgress(
      matchedGallery.sessionId,
      matchedGallery.createdAt
    );

    if (progressReport.status === 'processing') {
      return {
        status: 'processing',
        sessionId: matchedGallery.sessionId,
        sessionCode: formatSessionDigits(matchedGallery.sessionId),
        token: matchedGallery.token,
        expiresAt: matchedGallery.expiresAt.toISOString(),
        createdAt: createdAtIso,
        studioAddress,
        progress: progressReport.progressPercent,
        currentPhaseLabel: progressReport.currentPhaseLabel,
        message: progressReport.message,
        steps: progressReport.steps,
      };
    }

    await this.prisma.gallery.update({
      where: { id: matchedGallery.id },
      data: { accessCount: { increment: 1 } },
    });

    return {
      status: 'ready',
      sessionId: matchedGallery.sessionId,
      sessionCode: formatSessionDigits(matchedGallery.sessionId),
      token: matchedGallery.token,
      expiresAt: matchedGallery.expiresAt.toISOString(),
      createdAt: createdAtIso,
      studioAddress,
      items: progressReport.items,
    };
  }

  /**
   * Mengecek status ketersediaan galeri secara instan (untuk auto-polling)
   */
  async getGalleryStatus(sessionId: string, token: string): Promise<{
    status: 'ready' | 'processing' | 'expired';
    sessionId: string;
    sessionCode: string;
    token: string;
    expiresAt: string;
    createdAt?: string;
    studioAddress?: string;
    message?: string;
    progress?: number;
    currentPhaseLabel?: string;
    steps?: GalleryProgressReport['steps'];
    items?: SessionGalleryItem[];
  }> {
    const gallery = await this.prisma.gallery.findUnique({
      where: { sessionId },
      select: {
        id: true,
        sessionId: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!gallery) {
      throw new AppError(404, ErrorCode.GALLERY_NOT_FOUND, 'Galeri tidak ditemukan.');
    }

    const gPin = gallery.token.includes('-') ? gallery.token.split('-')[0] : gallery.token.slice(0, 4);
    const isTokenMatch = gallery.token === token || gPin === token || gallery.token.startsWith(token);

    if (!isTokenMatch) {
      throw new AppError(403, ErrorCode.GALLERY_TOKEN_INVALID, 'Token verifikasi galeri tidak cocok.');
    }

    const studioAddress = 'Lokasi Booth Minja Studio';
    const createdAtIso = gallery.createdAt.toISOString();

    if (new Date() > gallery.expiresAt) {
      return {
        status: 'expired',
        sessionId: gallery.sessionId,
        sessionCode: formatSessionDigits(gallery.sessionId),
        token: gallery.token,
        expiresAt: gallery.expiresAt.toISOString(),
        createdAt: createdAtIso,
        studioAddress,
        message: 'Masa aktif galeri telah berakhir.',
      };
    }

    const progressReport = await this.progressEngine.computeSessionProgress(
      sessionId,
      gallery.createdAt
    );

    if (progressReport.status === 'processing') {
      return {
        status: 'processing',
        sessionId: gallery.sessionId,
        sessionCode: formatSessionDigits(gallery.sessionId),
        token: gallery.token,
        expiresAt: gallery.expiresAt.toISOString(),
        createdAt: createdAtIso,
        studioAddress,
        progress: progressReport.progressPercent,
        currentPhaseLabel: progressReport.currentPhaseLabel,
        message: progressReport.message,
        steps: progressReport.steps,
      };
    }

    return {
      status: 'ready',
      sessionId: gallery.sessionId,
      sessionCode: formatSessionDigits(gallery.sessionId),
      token: gallery.token,
      expiresAt: gallery.expiresAt.toISOString(),
      createdAt: createdAtIso,
      studioAddress,
      items: progressReport.items,
    };
  }

  /**
   * Mengemas dan melakukan streaming file ZIP galeri langsung dari Cloudflare R2 (RAM-friendly)
   */
  async streamGalleryZip(
    sessionId: string,
    token: string
  ): Promise<{
    archive: Archiver;
    zipFileName: string;
    totalFiles: number;
  }> {
    const gallery = await this.prisma.gallery.findUnique({
      where: { sessionId },
      select: {
        id: true,
        sessionId: true,
        token: true,
        expiresAt: true,
      },
    });

    const gPin = gallery?.token?.includes('-') ? gallery.token.split('-')[0] : gallery?.token?.slice(0, 4);
    const isTokenMatch = gallery && (gallery.token === token || gPin === token || gallery.token.startsWith(token));

    if (!gallery || !isTokenMatch) {
      throw new AppError(
        404,
        ErrorCode.GALLERY_TOKEN_INVALID,
        'Tautan galeri tidak valid atau token verifikasi salah.'
      );
    }

    if (new Date() > gallery.expiresAt) {
      throw new AppError(
        410,
        ErrorCode.GALLERY_EXPIRED,
        'Masa aktif galeri foto telah berakhir (maksimal 48 jam).'
      );
    }

    await this.prisma.gallery.update({
      where: { id: gallery.id },
      data: { accessCount: { increment: 1 } },
      select: { id: true },
    });

    type MediaEntry = {
      name: string;
      stream?: import('node:stream').Readable;
      buffer?: Buffer;
    };
    const mediaEntries: MediaEntry[] = [];

    const cloudItems = await this.storageService.listSessionGalleryItems(sessionId);
    for (const item of cloudItems) {
      const stream = await this.storageService.getObjectStream(item.key);
      if (stream) {
        mediaEntries.push({
          name: item.fileName,
          stream,
        });
      } else {
        const buf = await this.storageService.getObjectBuffer(item.key);
        if (buf && buf.length > 0) {
          mediaEntries.push({
            name: item.fileName,
            buffer: buf,
          });
        }
      }
    }

    if (mediaEntries.length === 0) {
      throw new AppError(
        404,
        ErrorCode.NOT_FOUND,
        'Belum ada berkas foto atau video yang siap diunduh pada sesi ini.'
      );
    }

    const sessionCode = formatSessionCode(gallery.sessionId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFileName = `Minja_Foto_${sessionCode}.zip`;

    const archive = createZipArchive({
      zlib: { level: 5 },
    });

    for (const entry of mediaEntries) {
      if (entry.stream) {
        archive.append(entry.stream, { name: entry.name });
      } else if (entry.buffer) {
        archive.append(entry.buffer, { name: entry.name });
      }
    }

    archive.finalize();

    return {
      archive,
      zipFileName,
      totalFiles: mediaEntries.length,
    };
  }
}
