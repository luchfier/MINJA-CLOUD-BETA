// src/routes/delivery.routes.ts
// Route handler untuk Distribusi Digital (Galeri S3/R2 & Pengiriman Soft File Email)
// Sesuai ARCHITECTURE.md §4.2, §5.1 & THE_NEXT_STEP.md §6

import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { DeliveryService } from '../services/delivery.service.js';
import {
  sendEmailSchema,
  uploadGalleryFileSchema,
  composeLivePhotoSchema,
  composeSlideshowSchema,
} from '../schemas/delivery.schema.js';
import { requireBoothAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';
import { renderMobileGalleryHtml } from '../templates/mobileGalleryPage.js';
import { livePhotoTranscoder } from '../services/livePhotoTranscoder.service.js';

export async function deliveryRoutes(app: FastifyInstance): Promise<void> {
  const deliveryService = new DeliveryService(app.prisma);

  /**
   * GET /api/sessions/:sessionId/gallery & /api/sessions/:sessionId/gallery-url
   * Mengambil tautan galeri privat berbatas waktu (48 jam) & QR code string
   */
  const handleGetGallery = async (request: any, reply: any) => {
    const { sessionId } = request.params as { sessionId: string };
    const gallery = await deliveryService.getOrCreateGallery(sessionId);
    sendSuccess(reply, gallery);
  };

  app.get('/api/sessions/:sessionId/gallery', { preHandler: [requireBoothAuth] }, handleGetGallery);
  app.get('/api/sessions/:sessionId/gallery-url', { preHandler: [requireBoothAuth] }, handleGetGallery);

  /**
   * POST /api/sessions/:sessionId/email
   * Mengirimkan tautan galeri foto langsung ke alamat email pelanggan (dengan auto-sync queue fallback)
   */
  app.post(
    '/api/sessions/:sessionId/email',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = sendEmailSchema.parse(request.body);

      try {
        const result = await deliveryService.sendEmailNotification(
          sessionId,
          body.email
        );
        app.syncQueueService.enqueueSession({
          sessionId,
          recipientEmail: body.email,
        });
        sendSuccess(reply, result);
      } catch (err) {
        // Jika gagal karena internet offline / timeout, simpan ke antrean sinkronisasi otomatis!
        app.syncQueueService.recordEmailPending(sessionId, body.email);
        sendSuccess(reply, {
          sent: false,
          queued: true,
          message: 'Koneksi offline: email telah disimpan dalam antrean pemulihan dan akan dikirim otomatis saat internet normal.',
        });
      }
    }
  );

  /**
   * POST /api/sessions/:sessionId/gallery/upload
   * Mengunggah file foto atau video ke galeri sesi (tersimpan lokal dan otomatis didaftarkan ke sync queue)
   */
  app.post(
    '/api/sessions/:sessionId/gallery/upload',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = uploadGalleryFileSchema.parse(request.body);
      const uploaded = await deliveryService.uploadGalleryFile(
        sessionId,
        body.fileType,
        body.dataUrl,
        body.fileName
      );

      // Otomatis daftarkan sesi ke Sync Engine
      app.syncQueueService.enqueueSession({ sessionId });

      sendSuccess(reply, uploaded, 201);
    }
  );

  /**
   * POST /api/sessions/:sessionId/live-photo/compose
   * Menggabungkan video klip tiap slot dengan overlay template frame PNG (Model A) via FFmpeg
   */
  app.post(
    '/api/sessions/:sessionId/live-photo/compose',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = composeLivePhotoSchema.parse(request.body);

      const result = await livePhotoTranscoder.composeLiveFrame(
        sessionId,
        body.slots,
        body.frameOverlayDataUrl,
        body.options
      );

      if (result.success) {
        // Otomatis daftarkan sesi ke Sync Engine agar MP4 ter-upload ke Cloudflare R2
        app.syncQueueService.enqueueSession({ sessionId });
      }

      sendSuccess(reply, result, result.success ? 200 : 500);
    }
  );

  /**
   * POST /api/sessions/:sessionId/slideshow/compose
   * Menggabungkan semua foto mentah menjadi 1 video slideshow MP4 (Vertical 9:16 Beat Cut) via FFmpeg
   */
  app.post(
    '/api/sessions/:sessionId/slideshow/compose',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = composeSlideshowSchema.parse(request.body);

      const result = await livePhotoTranscoder.composeSlideshowVideo(
        sessionId,
        body.photos,
        body.options
      );

      if (result.success) {
        // Otomatis daftarkan sesi ke Sync Engine agar MP4 ter-upload ke Cloudflare R2
        app.syncQueueService.enqueueSession({ sessionId });
      }

      sendSuccess(reply, result, result.success ? 200 : 500);
    }
  );

  /**
   * POST /api/public/gallery/lookup
   * Pencarian galeri foto oleh pelanggan via Nomor Sesi (4 digit / full) & PIN 4-digit
   */
  app.post('/api/public/gallery/lookup', async (request, reply) => {
    const { sessionNumber, pin } = (request.body || {}) as {
      sessionNumber?: string;
      pin?: string;
    };

    const cleanSession = (sessionNumber || pin || '').trim();
    const cleanPin = (pin || sessionNumber || '').trim();

    if (!cleanSession && !cleanPin) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'PARAM_REQUIRED',
          message: 'Nomor sesi atau PIN wajib diisi.',
        },
      });
    }

    const result = await deliveryService.lookupGallery(cleanSession, cleanPin);
    sendSuccess(reply, result);
  });

  /**
   * GET /api/public/gallery/:sessionId/status
   * Pengecekan status ketersediaan foto secara cepat untuk auto-polling di mobile web
   */
  app.get('/api/public/gallery/:sessionId/status', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { token } = (request.query as { token?: string }) || {};

    if (!token) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Token verifikasi wajib disertakan.',
        },
      });
    }

    const result = await deliveryService.getGalleryStatus(sessionId, token);
    sendSuccess(reply, result);
  });

  /**
   * GET /api/public/gallery/:sessionId
   * Akses publik untuk smartphone pelanggan mengunduh foto (JSON format)
   */
  app.get('/api/public/gallery/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { token } = (request.query as { token?: string }) || {};

    if (!token) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Parameter token verifikasi galeri wajib disertakan.',
        },
      });
    }

    const galleryData = await deliveryService.getPublicGallery(sessionId, token);
    sendSuccess(reply, galleryData);
  });

  /**
   * GET /s/:sessionId & GET /gallery/:sessionId
   * Halaman web galeri mobile interaktif untuk smartphone pelanggan
   */
  const handleHtmlGallery = async (request: any, reply: any) => {
    const { sessionId } = request.params as { sessionId: string };
    let { token } = (request.query as { token?: string }) || {};

    if (!token) {
      const existingGal = await app.prisma.gallery.findUnique({ where: { sessionId } });
      if (existingGal?.token) {
        token = existingGal.token;
      }
    }

    if (!token) {
      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html><head><title>Akses Ditolak</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif; background:#070B14; color:#FFF; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px;">
          <div>
            <h1 style="color:#F59E0B; font-size:24px; margin-bottom:8px;">Akses Galeri Ditolak</h1>
            <p style="color:#94A3B8; font-size:14px;">Token verifikasi galeri tidak ditemukan pada tautan QR.</p>
          </div>
        </body></html>
      `);
    }

    try {
      const data = await deliveryService.getGalleryHtmlData(sessionId, token);
      const html = renderMobileGalleryHtml(data);
      reply.type('text/html').send(html);
    } catch (err: any) {
      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html><head><title>Galeri Tidak Ditemukan</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif; background:#070B14; color:#FFF; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px;">
          <div>
            <h1 style="color:#EF4444; font-size:24px; margin-bottom:8px;">Galeri Tidak Ditemukan</h1>
            <p style="color:#94A3B8; font-size:14px;">${err.message || 'Tautan galeri tidak valid atau masa berlaku 48 jam telah berakhir.'}</p>
          </div>
        </body></html>
      `);
    }
  };

  app.get('/s/:sessionId', handleHtmlGallery);
  app.get('/gallery/:sessionId', handleHtmlGallery);

  /**
   * GET /api/public/gallery/:sessionId/download/:fileName
   * Endpoint unduh soft file langsung dari local storage booth dengan header Content-Disposition attachment
   */
  app.get('/api/public/gallery/:sessionId/download/:fileName', async (request, reply) => {
    const { sessionId, fileName } = request.params as { sessionId: string; fileName: string };
    const safeSessionId = path.basename(sessionId);
    const safeFileName = path.basename(fileName);
    const relativePath = `galleries/${safeSessionId}/${safeFileName}`;

    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFileName)}"`);
    reply.header('Access-Control-Allow-Origin', '*');

    // Gunakan reply.sendFile dari @fastify/static
    try {
      return (reply as any).sendFile(relativePath);
    } catch {
      return reply.status(404).send({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Berkas tidak ditemukan di penyimpanan lokal.' },
      });
    }
  });

  /**
   * GET /api/public/gallery/:sessionId/download-zip
   * Mengemas seluruh foto & video sesi menjadi satu file ZIP tunggal secara streaming
   * Ramah perangkat mobile (iPhone iOS Safari & Android) tanpa terblokir download popup
   */
  app.get('/api/public/gallery/:sessionId/download-zip', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const query = (request.query || {}) as { token?: string };
    let token = query.token;

    // Fallback ambil token dari database jika tidak disematkan di query (misal navigasi langsung)
    if (!token) {
      const existingGal = await app.prisma.gallery.findUnique({ where: { sessionId } });
      if (existingGal?.token) {
        token = existingGal.token;
      }
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token verifikasi galeri tidak ditemukan.' },
      });
    }

    try {
      const { archive, zipFileName } = await deliveryService.streamGalleryZip(sessionId, token);

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);
      reply.header('Access-Control-Allow-Origin', '*');

      return reply.send(archive);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: err.code || 'ZIP_DOWNLOAD_FAILED',
          message: err.message || 'Gagal mengemas berkas ZIP galeri.',
        },
      });
    }
  });
}
