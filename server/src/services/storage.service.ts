// src/services/storage.service.ts
// Service Penyimpanan Object Storage Murni Cloudflare R2 (Zero Local Session Files on VPS)

import path from 'node:path';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '../config/env.js';
import { humanLogger } from '../utils/humanLogger.js';

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
    const rawR2Domain = (env.R2_PUBLIC_DOMAIN || 'https://tampung.minja.my.id').trim();
    this.r2PublicDomain = rawR2Domain ? rawR2Domain.replace(/\/+$/, '') : 'https://tampung.minja.my.id';
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

  /**
   * Menghasilkan URL unduh langsung dari Cloudflare R2 (CDN Public Domain atau Presigned URL)
   * Berlaku selama expiresInSeconds (default: 48 jam / 172800 detik)
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds = 48 * 3600,
    contentDispositionFilename?: string
  ): Promise<string> {
    if (this.r2PublicDomain && !contentDispositionFilename) {
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

    const cleanKey = key.replace(/^\/+/, '');
    return `${this.r2PublicDomain}/${cleanKey}`;
  }

  /**
   * Mengambil daftar file digital galeri secara terstruktur (Layout Cetak, Live Video, Raw Poses)
   * 100% dari Cloudflare R2 Object Storage (Zero Local VPS Disk I/O)
   */
  async listSessionGalleryItems(sessionId: string): Promise<SessionGalleryItem[]> {
    const itemsMap = new Map<string, SessionGalleryItem>();

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
            if (obj.Size && obj.Size < 100) continue;

            let fileType: SessionGalleryItem['fileType'] = 'other';
            let label = 'File Foto';

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

            let dedupeKey = fileName;
            if (fileType === 'layout_4r') {
              const match = lower.match(/(?:frame|design|slot|strip)[-_]?(\d+)/i) || lower.match(/[-_](\d+)\.[a-z0-9]+$/i);
              dedupeKey = match && match[1] ? `frame_${parseInt(match[1], 10)}` : 'frame_1';
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
                dedupeKey = match && match[1] ? `live_frame_${parseInt(match[1], 10)}` : `live_frame_${fileName}`;
              }
            }

            if (itemsMap.has(dedupeKey)) {
              const existing = itemsMap.get(dedupeKey)!;
              if ((obj.Size || 0) <= (existing.sizeBytes || 0)) {
                continue;
              }
            }

            const viewUrl = await this.getPresignedDownloadUrl(obj.Key, 48 * 3600);
            const downloadUrl = `/api/public/gallery/${encodeURIComponent(sessionId)}/download/${encodeURIComponent(fileName)}`;

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
   * Mengambil konten binary objek dari R2/S3 sebagai Buffer
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
   * Mengambil konten binary objek dari Cloudflare R2 / S3 sebagai Readable Stream
   * Menghemat memori RAM VPS saat streaming unduhan file & ZIP galeri
   */
  async getObjectStream(key: string): Promise<import('node:stream').Readable | null> {
    if (!this.s3Client || !this.isS3Configured) {
      return null;
    }
    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      return (response.Body as import('node:stream').Readable) || null;
    } catch (err) {
      console.warn(`[StorageService:R2] Gagal getObjectStream untuk key: ${key}`, err);
      return null;
    }
  }

  /**
   * Menghasilkan URL publik galeri pada domain cloud resmi (VPS)
   */
  async publishCloudGallery(
    sessionId: string,
    _sessionCode: string,
    _expiresAt: string,
    _boothName = 'Minja Photobooth',
    token = ''
  ): Promise<string> {
    const env = getEnv();
    const baseUrl = (env.GALLERY_BASE_URL || 'https://gallery.minja.my.id').replace(/\/+$/, '');
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
}

export const storageService = new StorageService();
