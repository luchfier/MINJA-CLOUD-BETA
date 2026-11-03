// src/services/syncQueue.service.ts
// Auto-Sync Engine & Offline Session Recovery Daemon
// Menangani pemulihan sesi saat crash, internet terputus, sinkronisasi file ke R2/S3, dan sinkronisasi database ke Supabase

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import { StorageService } from './storage.service.js';
import { EmailService } from './email.service.js';
import { formatSessionCode } from '../utils/session.util.js';
import { humanLogger } from '../utils/humanLogger.js';
import { getEnv } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PendingSyncSession {
  id: string;
  sessionId: string;
  sessionCode: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  recipientEmail?: string;
  customerName?: string;
  emailSent?: boolean;
  galleryPublished?: boolean;
  databaseSynced?: boolean;
  filesSynced?: string[];
  localFilesCount?: number;
}

export interface SyncEngineStatus {
  isOnline: boolean;
  isDatabaseConnected: boolean;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  totalQueued: number;
  lastSyncAt: string | null;
  items: PendingSyncSession[];
}

export class SyncQueueService {
  private queueFilePath: string;
  private queue: PendingSyncSession[] = [];
  private isProcessing = false;
  private checkIntervalTimer: NodeJS.Timeout | null = null;
  private storageService: StorageService;
  private emailService: EmailService;
  private isOnline = false;
  private isDatabaseConnected = false;
  private lastSyncAt: string | null = null;

  constructor(private prisma: PrismaClient) {
    this.storageService = new StorageService();
    this.emailService = new EmailService();

    const storageDir = path.resolve(__dirname, '../../storage');
    try {
      fs.mkdirSync(storageDir, { recursive: true });
    } catch {}

    this.queueFilePath = path.join(storageDir, 'sync-queue.json');
    this.loadQueueFromDisk();
  }

  /**
   * Membaca antrean dari disk
   */
  private loadQueueFromDisk(): void {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const raw = fs.readFileSync(this.queueFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.queue = parsed;
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Gagal memuat sync-queue.json dari disk, menggunakan queue baru:', err);
      this.queue = [];
    }
  }

  /**
   * Menyimpan antrean ke disk secara persisten
   */
  private saveQueueToDisk(): void {
    try {
      // Simpan maksimal 500 item terakhir agar file tetap ringan
      if (this.queue.length > 500) {
        this.queue = this.queue.slice(-500);
      }
      fs.writeFileSync(this.queueFilePath, JSON.stringify(this.queue, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SyncEngine] Gagal menyimpan sync-queue.json ke disk:', err);
    }
  }

  private currentIntervalSeconds: number = 20;

  /**
   * Menjalankan daemon background worker dan pemeriksaan berkala
   */
  public start(intervalSeconds = 20): void {
    this.currentIntervalSeconds = intervalSeconds;
    humanLogger.sync(`Auto-Sync Engine AKTIF (Pengecekan setiap ${this.currentIntervalSeconds} detik)`);

    // 1. Pulihkan sesi jika aplikasi sebelumnya mengalami crash atau mati listrik
    this.recoverCrashSessions().catch((err) => {
      humanLogger.warn('SYNC', `Gagal melakukan pemindaian recovery: ${err?.message || err}`);
    });

    // 2. Periksa konektivitas segera saat startup
    this.checkConnectivity().then(() => {
      if (this.isOnline) {
        this.drainQueue().catch(() => {});
      }
    });

    // 3. Pasang timer loop pemeriksaan berkala
    if (this.checkIntervalTimer) clearInterval(this.checkIntervalTimer);
    this.checkIntervalTimer = setInterval(async () => {
      await this.checkConnectivity();
      if (this.isOnline && this.hasPendingItems()) {
        await this.drainQueue();
      }
    }, this.currentIntervalSeconds * 1000);
  }

  /**
   * Mengatur interval pemeriksaan berkala secara dinamis
   */
  public setIntervalSeconds(seconds: number): void {
    if (seconds >= 5 && seconds <= 3600) {
      this.currentIntervalSeconds = seconds;
      if (this.checkIntervalTimer) {
        clearInterval(this.checkIntervalTimer);
        this.checkIntervalTimer = setInterval(async () => {
          await this.checkConnectivity();
          if (this.isOnline && this.hasPendingItems()) {
            await this.drainQueue();
          }
        }, this.currentIntervalSeconds * 1000);
      }
      humanLogger.sync(`Interval sinkronisasi diperbarui: setiap ${this.currentIntervalSeconds} detik`);
    }
  }

  public getIntervalSeconds(): number {
    return this.currentIntervalSeconds;
  }

  /**
   * Menghentikan daemon background worker
   */
  public stop(): void {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
    humanLogger.sync('Auto-Sync Engine dihentikan');
  }

  /**
   * Mengecek apakah ada antrean yang perlu diproses
   */
  public hasPendingItems(): boolean {
    return this.queue.some(
      (item) => item.status === 'pending' || (item.status === 'failed' && item.retryCount < item.maxRetries)
    );
  }

  /**
   * Mendaftarkan sesi ke antrean sinkronisasi
   */
  public enqueueSession(params: {
    sessionId: string;
    sessionCode?: string;
    recipientEmail?: string;
    customerName?: string;
  }): PendingSyncSession {
    const existing = this.queue.find((q) => q.sessionId === params.sessionId);
    const code = params.sessionCode || formatSessionCode(params.sessionId);

    if (existing) {
      if (params.recipientEmail && !existing.recipientEmail) {
        existing.recipientEmail = params.recipientEmail;
        existing.emailSent = false;
      }
      // Jika status selesai atau gagal tetapi dipanggil ulang (misal: ada file video slideshow baru), buka kembali ke pending!
      if (existing.status === 'completed' || existing.status === 'failed') {
        existing.status = 'pending';
        existing.retryCount = 0;
      }
      existing.updatedAt = new Date().toISOString();
      this.saveQueueToDisk();

      if (this.isOnline) {
        setImmediate(() => this.drainQueue());
      }
      return existing;
    }

    const newItem: PendingSyncSession = {
      id: 'sync_' + Math.random().toString(36).substring(2, 9),
      sessionId: params.sessionId,
      sessionCode: code,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      recipientEmail: params.recipientEmail,
      customerName: params.customerName,
      emailSent: false,
      galleryPublished: false,
      databaseSynced: false,
      filesSynced: [],
    };

    this.queue.unshift(newItem);
    this.saveQueueToDisk();

    humanLogger.sync(`Sesi ${code} masuk antrean upload Cloud & Supabase`);

    if (this.isOnline) {
      setImmediate(() => this.drainQueue());
    }

    return newItem;
  }

  /**
   * Mendaftarkan permintaan email ke sesi yang tertunda
   */
  public recordEmailPending(sessionId: string, email: string): void {
    this.enqueueSession({
      sessionId,
      recipientEmail: email,
    });
  }

  /**
   * Memulihkan sesi yatim / crash setelah aplikasi restart atau mati mendadak
   */
  public async recoverCrashSessions(): Promise<number> {
    let recoveredCount = 0;

    // Reset status item yang macet di 'processing' saat server crash sebelumnya
    for (const item of this.queue) {
      if (item.status === 'processing') {
        item.status = 'pending';
        item.updatedAt = new Date().toISOString();
      }
    }

    // Pindai folder penyimpanan lokal di server/storage/galleries
    const baseDir = this.storageService.getBaseDir();
    if (!fs.existsSync(baseDir)) return 0;

    try {
      const folders = fs.readdirSync(baseDir);
      for (const dirName of folders) {
        const sessionPath = path.join(baseDir, dirName);
        try {
          const stat = fs.statSync(sessionPath);
          if (!stat.isDirectory()) continue;

          // Periksa apakah folder memiliki file foto hasil jepretan
          const files = fs.readdirSync(sessionPath).filter(
            (f) => !f.endsWith('.tmp') && !f.endsWith('.lock') && f !== 'gallery.html'
          );

          if (files.length === 0) continue;

          // Cek apakah sudah ada di queue dan selesai
          const existing = this.queue.find((item) => item.sessionId === dirName);
          if (existing && existing.status === 'completed') {
            continue;
          }

          if (!existing) {
            const recoveredItem: PendingSyncSession = {
              id: 'recov_' + Math.random().toString(36).substring(2, 9),
              sessionId: dirName,
              sessionCode: formatSessionCode(dirName),
              createdAt: stat.birthtime.toISOString(),
              updatedAt: new Date().toISOString(),
              status: 'pending',
              retryCount: 0,
              maxRetries: 5,
              emailSent: false,
              galleryPublished: false,
              databaseSynced: false,
              filesSynced: [],
              localFilesCount: files.length,
            };
            this.queue.unshift(recoveredItem);
            recoveredCount++;
            humanLogger.sync(`Pemulihan Sesi: Ditemukan sesi lokal ${recoveredItem.sessionCode} (${files.length} file). Didaftarkan ke antrean.`);
          }
        } catch {
          // Abaikan kesalahan akses file individu
        }
      }

      if (recoveredCount > 0) {
        this.saveQueueToDisk();
      }
    } catch (err) {
      console.warn('[SyncEngine:Recovery] Gagal memindai folder lokal:', err);
    }

    return recoveredCount;
  }

  /**
   * Mengambil item antrean berdasarkan sessionId
   */
  public getItem(sessionId: string): PendingSyncSession | undefined {
    return this.queue.find((item) => item.sessionId === sessionId);
  }

  /**
   * Memeriksa status konektivitas internet & database Supabase
   */
  public async checkConnectivity(): Promise<{ isOnline: boolean; isDatabaseConnected: boolean }> {
    const wasOnline = this.isOnline;

    // 1. Cek Internet via ping HEAD request (Cloudflare DNS 1.1.1.1 atau Google)
    let onlineDetected = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://1.1.1.1', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      onlineDetected = res.ok || res.status < 500;
    } catch {
      try {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 3500);
        const res2 = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
          method: 'GET',
          signal: controller2.signal,
        });
        clearTimeout(timeout2);
        onlineDetected = res2.ok;
      } catch {
        onlineDetected = false;
      }
    }

    // 2. Cek Koneksi Database PostgreSQL / Supabase via Prisma
    let dbDetected = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbDetected = true;
    } catch {
      dbDetected = false;
    }

    this.isOnline = onlineDetected;
    this.isDatabaseConnected = dbDetected;

    // Jika terjadi transisi dari OFFLINE -> ONLINE, log dan picu proses antrean
    if (!wasOnline && this.isOnline) {
      humanLogger.network('Koneksi internet kembali AKTIF! Memulai sinkronisasi otomatis ke Cloud & Supabase...', true);
    }

    return { isOnline: this.isOnline, isDatabaseConnected: this.isDatabaseConnected };
  }

  /**
   * Menguras dan memproses seluruh antrean yang tertunda ke Cloud & Supabase
   */
  public async drainQueue(batchSize = 5): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const pendingItems = this.queue
        .filter(
          (item) => item.status === 'pending' || (item.status === 'failed' && item.retryCount < item.maxRetries)
        )
        .slice(0, batchSize);

      if (pendingItems.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      humanLogger.sync(`Memproses sinkronisasi ${pendingItems.length} sesi yang tertunda...`);

      for (const item of pendingItems) {
        processed++;
        item.status = 'processing';
        item.updatedAt = new Date().toISOString();
        this.saveQueueToDisk();

        try {
          await this.syncSession(item);
          item.status = 'completed';
          item.completedAt = new Date().toISOString();
          item.lastError = undefined;
          succeeded++;
          humanLogger.success('SYNC', `Sesi ${item.sessionCode} berhasil disinkronkan ke Cloud & Supabase!`);
        } catch (err: any) {
          failed++;
          item.retryCount++;
          item.lastError = err?.message || 'Gagal sinkronisasi';
          item.status = item.retryCount >= item.maxRetries ? 'failed' : 'pending';
          humanLogger.warn('SYNC', `Sesi ${item.sessionCode} tertunda (Percobaan ${item.retryCount}/${item.maxRetries}): ${err?.message || ''}`);
        }

        this.saveQueueToDisk();
      }

      this.lastSyncAt = new Date().toISOString();
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Memproses sinkronisasi satu sesi
   */
  private async syncSession(item: PendingSyncSession): Promise<void> {
    const sessionDir = path.join(this.storageService.getBaseDir(), item.sessionId);

    // Ambil nama booth
    let boothName = 'Minja Photobooth';
    try {
      const settings = await this.prisma.settings.findFirst();
      if (settings?.boothName) boothName = settings.boothName;
    } catch {}

    // 1. Upload Soft Files dari harddisk lokal ke Cloudflare R2 / S3
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir).filter(
        (f) => !f.endsWith('.tmp') && !f.endsWith('.lock') && f !== 'gallery.html'
      );

      item.localFilesCount = files.length;
      if (!item.filesSynced) item.filesSynced = [];

      for (const fileName of files) {
        if (item.filesSynced.includes(fileName)) continue;

        const filePath = path.join(sessionDir, fileName);
        try {
          const stat = fs.statSync(filePath);
          if (stat.size <= 100) {
            console.warn(`[SyncEngine] Mengabaikan dan membersihkan file kosong / rusak: ${fileName} (${stat.size} bytes)`);
            try { fs.unlinkSync(filePath); } catch {}
            continue;
          }

          const content = fs.readFileSync(filePath);
          const ext = path.extname(fileName).toLowerCase();
          let mime = 'image/jpeg';
          if (ext === '.png') mime = 'image/png';
          else if (ext === '.mp4') mime = 'video/mp4';

          await this.storageService.uploadFile(item.sessionId, fileName, content, mime);
          item.filesSynced.push(fileName);
        } catch (uploadErr) {
          console.warn(`[SyncEngine] Gagal upload file ${fileName}:`, uploadErr);
          throw uploadErr;
        }
      }
    }

    // 2. Terbitkan Galeri Web Mobile ke Cloudflare R2
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    let cloudGalleryUrl = '';
    try {
      if (this.storageService.isCloudStorageActive()) {
        cloudGalleryUrl = await this.storageService.publishCloudGallery(
          item.sessionId,
          item.sessionCode,
          expiresAt,
          boothName
        );
        item.galleryPublished = true;
      }
    } catch (galErr) {
      console.warn(`[SyncEngine] Gagal publish Cloud Gallery untuk ${item.sessionId}:`, galErr);
      throw galErr;
    }

    // 3. Sinkronkan Metadata Sesi & Transaksi ke Supabase / PostgreSQL (jika DB terhubung)
    if (this.isDatabaseConnected) {
      try {
        await this.syncDatabaseRecords(item, expiresAt);
        item.databaseSynced = true;
      } catch (dbErr) {
        console.warn(`[SyncEngine] Gagal sync ke database Supabase untuk ${item.sessionId}:`, dbErr);
      }
    }

    // 4. Kirim Email Soft File ke Pelanggan jika ada alamat email dan belum terkirim
    if (item.recipientEmail && !item.emailSent) {
      try {
        const finalUrl = cloudGalleryUrl || `http://localhost:3000/s/${item.sessionId}`;
        const emailRes = await this.emailService.sendGalleryNotification(
          item.recipientEmail,
          finalUrl,
          boothName,
          item.sessionCode
        );

        if (emailRes.sent) {
          item.emailSent = true;
          humanLogger.email(`Soft file berhasil dikirim ke: ${item.recipientEmail} (Sesi: ${item.sessionCode})`);

          // Simpan catatan DeliveryJob di database
          if (this.isDatabaseConnected) {
            await this.prisma.deliveryJob.create({
              data: {
                sessionId: item.sessionId,
                channel: 'email',
                email: emailRes.recipientEmail,
                status: 'sent',
                messageId: emailRes.messageId,
                sentAt: new Date(),
              },
            }).catch(() => {});
          }
        }
      } catch (emailErr) {
        console.warn(`[SyncEngine] Gagal mengirim email yang tertunda ke ${item.recipientEmail}:`, emailErr);
        throw emailErr;
      }
    }
  }

  /**
   * Menjamin data sesi, galeri, dan pembayaran terdaftar di database Supabase
   */
  private async syncDatabaseRecords(item: PendingSyncSession, expiresAtIso: string): Promise<void> {
    // 1. Pastikan paket aktif ada di Supabase
    let pkg = await this.prisma.package.findFirst({ where: { isActive: true } });
    if (!pkg) {
      pkg = await this.prisma.package.create({
        data: {
          id: 'pkg-default-sync',
          name: 'Paket Studio Standard',
          price: 45000,
          durationSeconds: 300,
          defaultPrints: 2,
          maxShots: 6,
          maxSelections: 2,
          additionalPrintPrice: 15000,
          isActive: true,
          sortOrder: 1,
        },
      });
    }

    // 2. Pastikan record Session ada di Supabase
    let syncKioskId: string | null = null;
    try {
      const apiKey = getEnv().BOOTH_API_KEY;
      if (apiKey && apiKey !== 'dev-booth-key-for-testing') {
        const k = await this.prisma.kiosk.findUnique({ where: { apiKey } });
        if (k) syncKioskId = k.id;
      }
      if (!syncKioskId) {
        const code = getEnv().KIOSK_CODE;
        if (code) {
          const k = await this.prisma.kiosk.findFirst({ where: { code } });
          if (k) syncKioskId = k.id;
        }
      }
    } catch {}

    const existingSession = await this.prisma.session.findUnique({
      where: { id: item.sessionId },
    });

    if (!existingSession) {
      await this.prisma.session.create({
        data: {
          id: item.sessionId,
          packageId: pkg.id,
          kioskId: syncKioskId,
          state: 'COMPLETED',
          basePrice: pkg.price,
          additionalPrints: 0,
          additionalPrintCost: 0,
          totalPrice: pkg.price,
          maxShots: pkg.maxShots,
          maxSelections: pkg.maxSelections,
          totalPrints: pkg.defaultPrints,
          durationSeconds: pkg.durationSeconds,
          completedAt: new Date(),
          expiresAt: new Date(expiresAtIso),
        },
      });
    } else if (!existingSession.kioskId && syncKioskId) {
      // Pulihkan asosiasi booth untuk sesi yang sebelumnya sempat sync tanpa kioskId
      await this.prisma.session.update({
        where: { id: existingSession.id },
        data: { kioskId: syncKioskId },
      }).catch(() => {});
    }

    // 3. Pastikan record Gallery ada di Supabase
    const existingGallery = await this.prisma.gallery.findUnique({
      where: { sessionId: item.sessionId },
    });

    if (!existingGallery) {
      const token = crypto.randomBytes(16).toString('hex');
      await this.prisma.gallery.create({
        data: {
          sessionId: item.sessionId,
          token,
          expiresAt: new Date(expiresAtIso),
        },
      });
    }

    // 4. Pastikan record Payment tunai tercatat di Supabase jika belum ada
    const existingPayment = await this.prisma.payment.findFirst({
      where: { sessionId: item.sessionId },
    });

    if (!existingPayment) {
      const cleanCode = item.sessionCode.replace(/[^A-Z0-9]/g, '');
      await this.prisma.payment.create({
        data: {
          sessionId: item.sessionId,
          orderId: `MINJA-SYNC-${cleanCode}`,
          grossAmount: pkg.price,
          paymentType: 'cash',
          transactionStatus: 'settlement',
          isVerified: true,
          expiryTime: new Date(Date.now() + 15 * 60 * 1000),
          settlementTime: new Date(),
        },
      });
    }
  }

  /**
   * Mengambil status komprehensif Auto-Sync Engine
   */
  public getStatus(): SyncEngineStatus {
    const pendingCount = this.queue.filter((i) => i.status === 'pending').length;
    const processingCount = this.queue.filter((i) => i.status === 'processing').length;
    const completedCount = this.queue.filter((i) => i.status === 'completed').length;
    const failedCount = this.queue.filter((i) => i.status === 'failed' && i.retryCount >= i.maxRetries).length;

    return {
      isOnline: this.isOnline,
      isDatabaseConnected: this.isDatabaseConnected,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      totalQueued: this.queue.length,
      lastSyncAt: this.lastSyncAt,
      items: this.queue.slice(0, 50),
    };
  }
}
