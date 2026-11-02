// src/services/delivery.service.ts
// Service Orkestrasi Distribusi Digital (Galeri Berbatas Waktu & Email Delivery API)
// Sesuai ARCHITECTURE.md §4.2, §6.3 & THE_NEXT_STEP.md §6

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import type { Archiver } from 'archiver';

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
import type { PrismaClient } from '@prisma/client';
import { StorageService, type SessionGalleryItem } from './storage.service.js';
import { EmailService } from './email.service.js';
import { AppError, ErrorCode } from '../types/common.types.js';
import { getEnv } from '../config/env.js';
import { formatSessionCode } from '../utils/session.util.js';
import { GalleryProgressEngine, GalleryProgressReport } from './galleryProgressEngine.service.js';

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
    private storageService: StorageService = new StorageService(),
    private emailService: EmailService = new EmailService(),
    progressEngine?: GalleryProgressEngine
  ) {
    this.progressEngine = progressEngine || new GalleryProgressEngine(this.storageService);
  }

  /**
   * Menentukan base URL galeri (bisa custom domain, cloudflare tunnel, atau auto-detect IP lokal)
   */
  public getBaseUrl(): string {
    const env = getEnv();
    if (env.GALLERY_BASE_URL && env.GALLERY_BASE_URL.trim().length > 0) {
      return env.GALLERY_BASE_URL.replace(/\/+$/, '');
    }

    // Auto-detect IP lokal mesin Kiosk di jaringan Wi-Fi / LAN (misal: 192.168.10.138)
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
          return `http://${net.address}:${env.PORT || 3000}`;
        }
      }
    }

    return `http://localhost:${env.PORT || 3000}`;
  }

  /**
   * Membuat atau mengambil galeri privat berbatas waktu (48 jam) untuk sebuah sesi
   */
  async getOrCreateGallery(sessionId: string): Promise<GalleryDetails> {
    const existing = await this.prisma.gallery.findUnique({
      where: { sessionId },
    });

    const settings = await this.prisma.settings.findFirst();
    const boothName = settings?.boothName || 'Minja Photobooth';

    // Ekstrak 4 digit nomor sesi harian
    const shortSessionNumber = sessionId.includes('-')
      ? sessionId.split('-').pop()!
      : (sessionId.slice(-4) || '0001');

    if (existing) {
      if (this.storageService.isCloudStorageActive()) {
        this.storageService.publishCloudGallery(
          sessionId,
          formatSessionCode(sessionId),
          existing.expiresAt.toISOString(),
          boothName
        ).catch((e) => console.warn('[DeliveryService] Cloud gallery backup publish failed:', e));
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

    // Pastikan session ada di database sebelum membuat Gallery (mencegah foreign key constraint error)
    const sessionExists = await this.prisma.session.findUnique({
      where: { id: sessionId },
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

    // Buat PIN 4 digit ramah mobile dan token kriptografis unik tanpa tabrakan
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const token = `${pin}-${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // 48 jam

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
      ).catch((e) => console.warn('[DeliveryService] Cloud gallery backup publish failed:', e));
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

    // Ambil nama booth dari settings jika ada
    const settings = await this.prisma.settings.findFirst();
    const boothName = settings?.boothName || 'Minja Photobooth';

    const sessionCode = formatSessionCode(sessionId);
    const sendRes = await this.emailService.sendGalleryNotification(
      email,
      gallery.galleryUrl,
      boothName,
      sessionCode
    );

    // Catat DeliveryJob ke database untuk audit pengiriman
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
   * Mengunggah file foto atau video ke penyimpanan galeri
   */
  async uploadGalleryFile(
    sessionId: string,
    fileType: 'layout_4r' | 'live_video' | 'raw_photo',
    dataUrl: string,
    customName?: string
  ): Promise<{ url: string; sizeBytes: number }> {
    let ext = fileType === 'live_video' ? 'mp4' : 'jpg';
    let mimeType = fileType === 'live_video' ? 'video/mp4' : 'image/jpeg';

    if (dataUrl.startsWith('data:')) {
      const mimeMatch = dataUrl.match(/^data:([^;,]+)/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1].toLowerCase();
        if (mimeType.includes('webm')) ext = 'webm';
        else if (mimeType.includes('mp4')) ext = 'mp4';
        else if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
      }
    }

    let fileName = customName;
    if (!fileName) {
      fileName = `${fileType}_${Date.now()}.${ext}`;
    }

    const result = await this.storageService.uploadFile(
      sessionId,
      fileName,
      dataUrl,
      mimeType
    );

    // Otomatis refresh publikasi galeri Cloudflare R2 di background agar file baru langsung muncul di HTML galeri
    if (this.storageService.isCloudStorageActive()) {
      (async () => {
        try {
          const gallery = await this.prisma.gallery.findUnique({ where: { sessionId } });
          const settings = await this.prisma.settings.findFirst();
          const boothName = settings?.boothName || 'Minja Photobooth';
          await this.storageService.publishCloudGallery(
            sessionId,
            formatSessionCode(sessionId),
            gallery?.expiresAt?.toISOString() || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
            boothName
          );
        } catch (err) {
          console.warn('[DeliveryService] Gagal merefresh Cloud Gallery setelah upload:', err);
        }
      })();
    }

    return {
      url: result.publicUrl,
      sizeBytes: result.sizeBytes,
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
      include: {
        session: true,
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

    // Update access count
    await this.prisma.gallery.update({
      where: { id: gallery.id },
      data: { accessCount: { increment: 1 } },
    });

    const files = await this.storageService.listSessionFiles(sessionId);

    return {
      sessionCode: formatSessionCode(gallery.session.id),
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

    // Cari galeri berdasarkan sessionId penuh atau 4 digit suffix, atau pencarian langsung via token PIN
    const galleries = await this.prisma.gallery.findMany({
      where: {
        OR: [
          { sessionId: cleanSession },
          { sessionId: { endsWith: cleanSession } },
          { sessionId: { endsWith: `-${cleanSession}` } },
          { token: { startsWith: cleanPin } },
          { token: cleanPin },
        ],
      },
      include: { session: true },
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

    const settings = await this.prisma.settings.findFirst();
    const studioAddress = settings?.studioAddress || 'Lokasi Booth Minja Studio';
    const createdAtIso = matchedGallery.createdAt.toISOString();

    if (new Date() > matchedGallery.expiresAt) {
      return {
        status: 'expired',
        sessionId: matchedGallery.sessionId,
        sessionCode: formatSessionCode(matchedGallery.sessionId),
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
        sessionCode: formatSessionCode(matchedGallery.sessionId),
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

    // Update access count
    await this.prisma.gallery.update({
      where: { id: matchedGallery.id },
      data: { accessCount: { increment: 1 } },
    });

    return {
      status: 'ready',
      sessionId: matchedGallery.sessionId,
      sessionCode: formatSessionCode(matchedGallery.sessionId),
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
      include: { session: true },
    });

    if (!gallery) {
      throw new AppError(404, ErrorCode.GALLERY_NOT_FOUND, 'Galeri tidak ditemukan.');
    }

    const gPin = gallery.token.includes('-') ? gallery.token.split('-')[0] : gallery.token.slice(0, 4);
    const isTokenMatch = gallery.token === token || gPin === token || gallery.token.startsWith(token);

    if (!isTokenMatch) {
      throw new AppError(403, ErrorCode.GALLERY_TOKEN_INVALID, 'Token verifikasi galeri tidak cocok.');
    }

    const settings = await this.prisma.settings.findFirst();
    const studioAddress = settings?.studioAddress || 'Lokasi Booth Minja Studio';
    const createdAtIso = gallery.createdAt.toISOString();

    if (new Date() > gallery.expiresAt) {
      return {
        status: 'expired',
        sessionId: gallery.sessionId,
        sessionCode: formatSessionCode(gallery.sessionId),
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
        sessionCode: formatSessionCode(gallery.sessionId),
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
      sessionCode: formatSessionCode(gallery.sessionId),
      token: gallery.token,
      expiresAt: gallery.expiresAt.toISOString(),
      createdAt: createdAtIso,
      studioAddress,
      items: progressReport.items,
    };
  }

  /**
   * Mengambil data galeri terstruktur untuk rendering template halaman web mobile
   */
  async getGalleryHtmlData(
    sessionId: string,
    token: string
  ): Promise<{
    boothName: string;
    sessionId: string;
    sessionCode: string;
    expiresAt: string;
    items: SessionGalleryItem[];
    token: string;
  }> {
    const gallery = await this.prisma.gallery.findUnique({
      where: { sessionId },
      include: {
        session: true,
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

    // Update access count
    await this.prisma.gallery.update({
      where: { id: gallery.id },
      data: { accessCount: { increment: 1 } },
    });

    const settings = await this.prisma.settings.findFirst();
    const boothName = settings?.boothName || 'Minja Photobooth';

    const items = await this.storageService.listSessionGalleryItems(sessionId);

    return {
      boothName,
      sessionId,
      sessionCode: formatSessionCode(gallery.session.id),
      expiresAt: gallery.expiresAt.toISOString(),
      items,
      token,
    };
  }

  /**
   * Mengemas dan melakukan streaming file ZIP galeri (foto cetak, foto mentah, video)
   * Menggunakan library archiver dengan streaming langsung ke klien (RAM-friendly)
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
      include: {
        session: true,
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

    // Catat kenaikan access count
    await this.prisma.gallery.update({
      where: { id: gallery.id },
      data: { accessCount: { increment: 1 } },
    });

    const safeSessionId = path.basename(sessionId);
    const sessionDir = path.join(this.storageService.getBaseDir(), safeSessionId);

    type MediaEntry = { name: string; localPath?: string; buffer?: Buffer };
    const mediaEntries: MediaEntry[] = [];

    if (fs.existsSync(sessionDir)) {
      // 1. Prioritaskan pembacaan berkas fisik dari penyimpanan lokal booth
      const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.webm', '.gif']);
      const allEntries = await fs.promises.readdir(sessionDir, { withFileTypes: true });
      const files = allEntries
        .filter((e) => e.isFile() && allowedExts.has(path.extname(e.name).toLowerCase()))
        .map((e) => ({
          name: e.name,
          localPath: path.join(sessionDir, e.name),
        }));
      mediaEntries.push(...files);
    } else {
      // 2. Fallback: Jika berjalan di VPS Cloud tanpa folder lokal booth, ambil buffer langsung dari R2/S3
      const cloudItems = await this.storageService.listSessionGalleryItems(sessionId);
      for (const item of cloudItems) {
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

    const sessionCode = formatSessionCode(gallery.session.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFileName = `Minja_Foto_${sessionCode}.zip`;

    const archive = createZipArchive({
      zlib: { level: 5 }, // Kompresi efisien & cepat untuk media
    });

    // Tambahkan tiap file fisik atau buffer ke dalam zip
    for (const entry of mediaEntries) {
      if (entry.localPath) {
        archive.file(entry.localPath, { name: entry.name });
      } else if (entry.buffer) {
        archive.append(entry.buffer, { name: entry.name });
      }
    }

    // Mulai proses finalisasi kompresi
    archive.finalize();

    return {
      archive,
      zipFileName,
      totalFiles: mediaEntries.length,
    };
  }
}
