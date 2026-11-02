// src/services/storage.service.ts
// Service Penyimpanan Object Storage (Cloudflare R2 / AWS S3 / Local Fallback)
// Sesuai ARCHITECTURE.md §5.1 & THE_NEXT_STEP.md §6.1

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '../config/env.js';
import { renderMobileGalleryHtml } from '../templates/mobileGalleryPage.js';
import { humanLogger } from '../utils/humanLogger.js';
import { softFileOptimizer } from './softFileOptimizer.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UploadResult {
  key: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
}

export interface SessionGalleryItem {
  key: string;
  fileName: string;
  fileType: 'layout_4r' | 'live_video' | 'raw_photo' | 'other';
  label: string;
  url: string;
  downloadUrl?: string;
  sizeBytes?: number;
}

export class StorageService {
  private baseDir: string;
  private s3Endpoint: string;
  private s3Bucket: string;
  private isS3Configured: boolean;
  private s3Client: S3Client | null = null;
  private r2PublicDomain: string;

  constructor() {
    let env: any;
    try {
      env = getEnv();
    } catch {
      env = process.env;
    }
    this.s3Endpoint = env.S3_ENDPOINT || '';
    this.s3Bucket = env.S3_BUCKET_NAME || 'backup';
    const rawR2Domain = (env.R2_PUBLIC_DOMAIN || '').trim();
    this.r2PublicDomain = rawR2Domain ? rawR2Domain.replace(/\/+$/, '') : '';
    this.isS3Configured =
      this.s3Endpoint.trim().length > 0 &&
      (env.S3_ACCESS_KEY || '').trim().length > 0 &&
      (env.S3_SECRET_KEY || '').trim().length > 0;

    if (this.isS3Configured) {
      this.s3Client = new S3Client({
        region: env.S3_REGION || 'auto',
        endpoint: this.s3Endpoint,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
        },
      });
    }

    // Direktori penyimpanan lokal: server/storage/galleries
    this.baseDir = path.resolve(__dirname, '../../storage/galleries');
    try {
      fs.mkdirSync(this.baseDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  public isCloudStorageActive(): boolean {
    return this.isS3Configured;
  }

  public getBucketName(): string {
    return this.s3Bucket;
  }

  public getEndpoint(): string {
    return this.s3Endpoint;
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Mengunggah file ke penyimpanan lokal terlebih dahulu, lalu di-mirror ke Cloudflare R2
   */
  async uploadFile(
    sessionId: string,
    fileName: string,
    content: Buffer | string,
    mimeType = 'image/jpeg'
  ): Promise<UploadResult> {
    let buffer: Buffer;

    if (typeof content === 'string') {
      const commaIdx = content.indexOf(',');
      if (content.startsWith('data:') && commaIdx !== -1) {
        const header = content.slice(0, commaIdx);
        // Hapus whitespace & line breaks dari base64 string
        const dataPart = content.slice(commaIdx + 1).replace(/\s/g, '');

        const mimeMatch = header.match(/^data:([^;,]+)/);
        if (mimeMatch && mimeMatch[1]) {
          mimeType = mimeMatch[1].toLowerCase();
        }

        if (header.includes(';base64')) {
          buffer = Buffer.from(dataPart, 'base64');
        } else {
          buffer = Buffer.from(decodeURIComponent(dataPart), 'utf-8');
        }
      } else {
        const cleaned = content.trim().replace(/\s/g, '');
        if (/^[A-Za-z0-9+/=]+$/.test(cleaned) && cleaned.length % 4 === 0 && cleaned.length > 50) {
          buffer = Buffer.from(cleaned, 'base64');
        } else {
          buffer = Buffer.from(content, 'utf-8');
        }
      }
    } else {
      buffer = content;
    }

    if (!buffer || buffer.length === 0) {
      throw new Error(`Buffer untuk file ${fileName} kosong (0 byte). Upload dibatalkan untuk mencegah file korup.`);
    }

    // Optimasi Soft File Mutu Studio Lab (>= 1MB, 300 DPI, unsharp mask, 4:4:4)
    // Berlaku untuk foto pose asli (pose_*.jpg) & frame desain (design_*.jpg / layout_*.jpg)
    const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(fileName);
    const isThumbnail = fileName.includes('thumb') || fileName.endsWith('.webp');
    const isTransparentOverlay = fileName.includes('overlay') || fileName.includes('mask');

    if (isImage && !isThumbnail && !isTransparentOverlay) {
      try {
        const optimized = await softFileOptimizer.optimizeSoftFile(buffer, fileName);
        buffer = optimized.buffer;
        mimeType = optimized.mimeType;
      } catch (optErr) {
        console.warn(`[StorageService] SoftFileOptimizer warning untuk ${fileName}:`, optErr);
      }
    }

    // 1. Simpan salinan lokal di harddisk booth terlebih dahulu (Local Storage First)
    const sessionDir = path.join(this.baseDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const localFilePath = path.join(sessionDir, fileName);
    fs.writeFileSync(localFilePath, buffer);

    const stat = fs.statSync(localFilePath);
    if (stat.size !== buffer.length) {
      throw new Error(`Verifikasi penyimpanan lokal gagal untuk ${fileName}. Terbaca ${stat.size} bytes, diharapkan ${buffer.length} bytes.`);
    }
    humanLogger.storage(`Foto tersimpan di lokal: ${fileName} (${(stat.size / 1024).toFixed(1)} KB)`);

    const key = `${sessionId}/${fileName}`;
    const publicUrl = `/storage/galleries/${sessionId}/${fileName}`;

    // 2. Unggah ke Cloudflare R2 setelah file tersimpan aman di lokal
    if (this.s3Client && this.isS3Configured) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.s3Bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
          })
        );
        humanLogger.sync(`Upload selesai: ${fileName} -> Cloudflare R2`);
      } catch (err) {
        humanLogger.warn('SYNC', `Gagal upload ${fileName} ke Cloudflare R2 (file lokal tetap aman)`);
      }
    }

    return {
      key,
      publicUrl,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  /**
   * Menghasilkan URL unduh langsung yang aman (Presigned URL) dari Cloudflare R2
   * Berlaku selama expiresInSeconds (default: 48 jam / 172800 detik)
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds = 48 * 3600,
    contentDispositionFilename?: string
  ): Promise<string> {
    // 1. Jika custom domain Cloudflare R2 dikonfigurasi (e.g. https://tampung.minja.my.id), gunakan URL CDN langsung!
    if (this.r2PublicDomain) {
      const cleanKey = key.replace(/^\/+/, '');
      return `${this.r2PublicDomain}/${cleanKey}`;
    }

    if (this.s3Client && this.isS3Configured) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          ResponseContentDisposition: contentDispositionFilename
            ? `attachment; filename="${encodeURIComponent(contentDispositionFilename)}"`
            : undefined,
        });
        const signedUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: expiresInSeconds,
        });
        return signedUrl;
      } catch (err) {
        console.warn(`[StorageService:R2] Gagal membuat presigned URL untuk ${key}:`, err);
      }
    }
    return `/storage/galleries/${key}`;
  }

  /**
   * Mengambil daftar file digital galeri secara terstruktur (Layout Cetak, Live Video, Raw Poses)
   * Berbasis Local Storage dengan fallback/overlay Cloudflare R2 Presigned URLs
   */
  async listSessionGalleryItems(sessionId: string): Promise<SessionGalleryItem[]> {
    const itemsMap = new Map<string, SessionGalleryItem>();
    const sessionDir = path.join(this.baseDir, sessionId);

    // 1. Baca direktori lokal booth (Local Storage First)
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      const hasNativeMp4 = files.some((f) => f.toLowerCase().endsWith('.mp4'));

      for (const fileName of files) {
        const lower = fileName.toLowerCase();
        if (lower.includes('gallery.html')) continue;
        if (lower.endsWith('.gif')) continue; // Fitur GIF telah dihapus
        if (lower.endsWith('.tmp') || lower.startsWith('.')) continue;
        if (lower.includes('thumb') || lower.endsWith('.webp')) continue; // Abaikan thumbnail internal

        // Abaikan file .webm warisan jika video native .mp4 sudah ada
        if (lower.endsWith('.webm') && hasNativeMp4) continue;

        const filePath = path.join(sessionDir, fileName);
        try {
          const stat = fs.statSync(filePath);
          // Abaikan file kosong atau korup (< 100 bytes)
          if (stat.size < 100) continue;

          let fileType: SessionGalleryItem['fileType'] = 'other';
          let label = 'File Foto';

          // ATURAN 1 (PRIORITAS UTAMA): Ekstensi video (.mp4, .webm, .mov) mutlak live_video
          if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
            fileType = 'live_video';
            label = lower.includes('slideshow') ? 'Video Slideshow' : 'Live Motion';
          } else if (lower.includes('strip') || lower.includes('layout') || lower.includes('4r') || lower.includes('design') || lower.includes('frame')) {
            fileType = 'layout_4r';
            label = 'Photo Frame';
          } else if (lower.includes('photo') || lower.includes('pose') || lower.includes('raw') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
            fileType = 'raw_photo';
            label = 'Single Cut';
          }

          let viewUrl = `/storage/galleries/${sessionId}/${fileName}`;
          let downloadUrl = `/api/public/gallery/${sessionId}/download/${fileName}`;

          // Jika Cloudflare R2 aktif, buatkan Presigned URL publik
          if (this.s3Client && this.isS3Configured) {
            try {
              const cloudView = await this.getPresignedDownloadUrl(`${sessionId}/${fileName}`, 48 * 3600);
              const cloudDown = await this.getPresignedDownloadUrl(`${sessionId}/${fileName}`, 48 * 3600, fileName);
              if (cloudView.startsWith('http')) {
                viewUrl = cloudView;
              }
              if (cloudDown.startsWith('http')) {
                downloadUrl = cloudDown;
              }
            } catch {
              // fallback ke url lokal
            }
          }

          // Deduplikasi pintar untuk frame cetak, pose mentah, dan video agar tidak pernah dobel di galeri
          let dedupeKey = fileName;
          if (fileType === 'layout_4r') {
            const match = lower.match(/(?:frame|design|slot|strip)[-_]?(\d+)/i) || lower.match(/[-_](\d+)\.[a-z0-9]+$/i);
            if (match && match[1]) {
              dedupeKey = `frame_${parseInt(match[1], 10)}`;
            } else {
              dedupeKey = 'frame_1';
            }
          } else if (fileType === 'raw_photo') {
            const match = lower.match(/(?:pose|photo|cut)[-_]?(\d+)/i) || lower.match(/[-_](\d+)\.[a-z0-9]+$/i);
            if (match && match[1]) {
              dedupeKey = `pose_${parseInt(match[1], 10)}`;
            }
          } else if (fileType === 'live_video') {
            if (lower.includes('slideshow')) {
              dedupeKey = 'slideshow';
            } else if (lower.includes('layout_live_4r') || lower.includes('layout_live_1')) {
              dedupeKey = 'live_frame_1';
            } else {
              const match = lower.match(/(?:layout_live|live_layout|live_photo)[-_](\d+)/i) || lower.match(/[-_](\d+)\.[a-z0-9]+$/i);
              if (match && match[1]) {
                dedupeKey = `live_frame_${parseInt(match[1], 10)}`;
              } else {
                dedupeKey = `live_frame_${fileName}`;
              }
            }
          }

          if (itemsMap.has(dedupeKey)) {
            const existing = itemsMap.get(dedupeKey)!;
            // Jika item sudah ada, utamakan file yang lebih besar / valid
            if (stat.size <= (existing.sizeBytes || 0)) {
              continue;
            }
          }

          itemsMap.set(dedupeKey, {
            key: `${sessionId}/${fileName}`,
            fileName,
            fileType,
            label,
            url: viewUrl,
            downloadUrl,
            sizeBytes: stat.size,
          });
        } catch {
          // Abaikan error stat lokal
        }
      }
    }

    // 2. Jika Cloudflare R2 memiliki file tambahan yang mungkin belum ada di lokal
    if (this.s3Client && this.isS3Configured) {
      try {
        const res = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.s3Bucket,
            Prefix: `${sessionId}/`,
          })
        );

        if (res.Contents && res.Contents.length > 0) {
          const hasR2Mp4 = res.Contents.some((c) => (c.Key || '').toLowerCase().endsWith('.mp4'));

          for (const obj of res.Contents) {
            if (!obj.Key) continue;
            const fileName = path.basename(obj.Key);
            const lower = fileName.toLowerCase();
            if (lower.includes('gallery.html')) continue;
            if (lower.endsWith('.gif')) continue;
            if (lower.endsWith('.webm') && hasR2Mp4) continue;
            if (obj.Size && obj.Size < 100) continue; // Abaikan object R2 yang korup/kosong

            let fileType: SessionGalleryItem['fileType'] = 'other';
            let label = 'File Foto';

            // ATURAN 1 (PRIORITAS UTAMA): Ekstensi video (.mp4, .webm, .mov) mutlak live_video
            if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
              fileType = 'live_video';
              label = lower.includes('slideshow') ? 'Video Slideshow' : 'Live Motion';
            } else if (lower.includes('strip') || lower.includes('layout') || lower.includes('4r') || lower.includes('design') || lower.includes('frame')) {
              fileType = 'layout_4r';
              label = 'Photo Frame';
            } else if (lower.includes('photo') || lower.includes('pose') || lower.includes('raw') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
              fileType = 'raw_photo';
              label = 'Single Cut';
            }

            // Deduplikasi pintar untuk Cloudflare R2 dengan key yang identik dengan lokal
            let dedupeKey = fileName;
            if (fileType === 'layout_4r') {
              const match = lower.match(/(?:frame|design|slot|strip)[-_]?(\d+)/i) || lower.match(/[-_](\d+)\.[a-z0-9]+$/i);
              if (match && match[1]) {
                dedupeKey = `frame_${parseInt(match[1], 10)}`;
              } else {
                dedupeKey = 'frame_1';
              }
            } else if (fileType === 'raw_photo') {
              const match = lower.match(/(?:pose|photo|cut)[-_]?(\d+)/i) || lower.match(/[-_](\d+)\.[a-z0-9]+$/i);
              if (match && match[1]) {
                dedupeKey = `pose_${parseInt(match[1], 10)}`;
              }
            } else if (fileType === 'live_video') {
              if (lower.includes('slideshow')) {
                dedupeKey = 'slideshow';
              } else if (lower.includes('layout_live_4r') || lower.includes('layout_live_1')) {
                dedupeKey = 'live_frame_1';
              } else {
                const match = lower.match(/(?:layout_live|live_layout|live_photo)[-_](\d+)/i) || lower.match(/[-_](\d+)\.[a-z0-9]+$/i);
                if (match && match[1]) {
                  dedupeKey = `live_frame_${parseInt(match[1], 10)}`;
                } else {
                  dedupeKey = `live_frame_${fileName}`;
                }
              }
            }

            // Jika item sudah ada dari lokal booth, jangan duplikat!
            if (itemsMap.has(dedupeKey)) {
              continue;
            }

            const viewUrl = await this.getPresignedDownloadUrl(obj.Key, 48 * 3600);
            const downloadUrl = await this.getPresignedDownloadUrl(obj.Key, 48 * 3600, fileName);

            itemsMap.set(dedupeKey, {
              key: obj.Key,
              fileName,
              fileType,
              label,
              url: viewUrl,
              downloadUrl,
              sizeBytes: obj.Size,
            });
          }
        }
      } catch (err) {
        console.warn(`[StorageService:R2] Gagal sync ListObjects dari R2:`, err);
      }
    }

    return Array.from(itemsMap.values());
  }

  /**
   * Mengambil konten binary objek dari R2/S3 sebagai Buffer (berguna saat server berjalan di VPS cloud)
   */
  async getObjectBuffer(key: string): Promise<Buffer | null> {
    if (!this.s3Client || !this.isS3Configured) {
      return null;
    }
    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      if (!response.Body) return null;
      const byteArray = await (response.Body as any).transformToByteArray();
      return Buffer.from(byteArray);
    } catch (err) {
      console.warn(`[StorageService:R2] Gagal getObjectBuffer untuk key: ${key}`, err);
      return null;
    }
  }

  /**
   * Mempublikasikan halaman galeri HTML mandiri langsung ke Local Storage & Cloudflare R2
   */
  async publishCloudGallery(
    sessionId: string,
    sessionCode: string,
    expiresAt: string,
    boothName = 'Minja Photobooth',
    token = ''
  ): Promise<string> {
    const items = await this.listSessionGalleryItems(sessionId);
    const html = renderMobileGalleryHtml({
      boothName,
      sessionId,
      sessionCode,
      expiresAt,
      items,
      token,
    });

    // 1. Simpan salinan lokal gallery.html
    const sessionDir = path.join(this.baseDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });
    const localHtmlPath = path.join(sessionDir, 'gallery.html');
    fs.writeFileSync(localHtmlPath, html, 'utf-8');

    // 2. Siapkan URL publik galeri dari domain cloud resmi (VPS)
    const env = getEnv();
    const baseUrl = (env.GALLERY_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const publicCloudUrl = `${baseUrl}/s/${sessionId}${token ? `?token=${token}` : ''}`;
    humanLogger.sync(`Tautan Galeri Cloud disiapkan: ${publicCloudUrl}`);
    return publicCloudUrl;
  }

  /**
   * Mengambil daftar tautan unduh file digital untuk suatu sesi
   */
  async listSessionFiles(sessionId: string): Promise<string[]> {
    const items = await this.listSessionGalleryItems(sessionId);
    return items.map((it) => it.url);
  }

  /**
   * Mengambil file foto lokal untuk suatu sesi secara sinkron (untuk portal owner)
   */
  getSessionFiles(sessionId: string): Array<{ fileName: string; publicUrl: string; sizeBytes: number }> {
    const sessionDir = path.join(this.baseDir, sessionId);
    if (!fs.existsSync(sessionDir)) return [];
    try {
      const files = fs.readdirSync(sessionDir);
      return files
        .filter((f) => !f.toLowerCase().includes('gallery.html'))
        .map((f) => {
          const filePath = path.join(sessionDir, f);
          const stat = fs.statSync(filePath);
          return {
            fileName: f,
            publicUrl: `/storage/galleries/${sessionId}/${f}`,
            sizeBytes: stat.size,
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Menghapus file sesi yang telah kedaluwarsa (retensi 48 jam)
   */
  async cleanupExpiredSessions(retentionHours = 48): Promise<number> {
    let cleaned = 0;
    const now = Date.now();
    const maxAgeMs = retentionHours * 3600 * 1000;

    if (!fs.existsSync(this.baseDir)) return 0;

    const sessionFolders = fs.readdirSync(this.baseDir);
    for (const folder of sessionFolders) {
      const folderPath = path.join(this.baseDir, folder);
      try {
        const stat = fs.statSync(folderPath);
        if (stat.isDirectory() && now - stat.mtimeMs > maxAgeMs) {
          fs.rmSync(folderPath, { recursive: true, force: true });
          cleaned++;
        }
      } catch {
        // ignore errors
      }
    }

    return cleaned;
  }
}

export const storageService = new StorageService();

