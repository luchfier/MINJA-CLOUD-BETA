// src/routes/delivery.routes.ts
// Route handler untuk Distribusi Digital (Galeri Cloudflare R2 & Pengiriman Soft File Email)

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { DeliveryService } from '../services/delivery.service.js';
import { sendEmailSchema } from '../schemas/delivery.schema.js';
import { requireBoothAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';
import { createRateLimiter } from '../middleware/rateLimit.middleware.js';
import { formatSessionDigits } from '../utils/session.util.js';

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
   * Mengirimkan tautan galeri foto langsung ke alamat email pelanggan
   */
  app.post(
    '/api/sessions/:sessionId/email',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = sendEmailSchema.parse(request.body);
      const result = await deliveryService.sendEmailNotification(
        sessionId,
        body.email
      );
      sendSuccess(reply, result);
    }
  );

  // Rate limiters untuk melindungi endpoint publik dari brute force PIN & spam download ZIP
  const galleryLookupRateLimiter = createRateLimiter({
    max: 10,
    timeWindowMs: 60 * 1000,
    keyPrefix: 'gal-lookup',
    message: 'Terlalu banyak percobaan pencarian PIN galeri. Silakan tunggu 1 menit sebelum mencoba lagi.',
  });

  const galleryZipRateLimiter = createRateLimiter({
    max: 6,
    timeWindowMs: 60 * 1000,
    keyPrefix: 'gal-zip',
    message: 'Pengunduhan berkas ZIP dibatasi maksimal 6 kali per menit. Silakan tunggu sesaat.',
  });

  /**
   * POST /api/public/gallery/lookup
   * Pencarian galeri foto oleh pelanggan via Nomor Sesi (4 digit / full) & PIN 4-digit
   */
  app.post(
    '/api/public/gallery/lookup',
    { preHandler: [galleryLookupRateLimiter] },
    async (request, reply) => {
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
    }
  );

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
   * Menyajikan React Stitch Lumina SPA (index.html) langsung dari backend Fastify
   */
  const handleHtmlGallery = async (request: any, reply: any) => {
    const { sessionId } = request.params as { sessionId: string };
    let { token } = (request.query as { token?: string }) || {};

    if (!token) {
      const existingGal = await app.prisma.gallery.findUnique({
        where: { sessionId },
        select: { token: true },
      });
      if (existingGal?.token) {
        token = existingGal.token;
      }
    }

    const spaDistCandidates = [
      path.resolve(process.cwd(), 'frontend/dist'),
      path.resolve(process.cwd(), '../frontend/dist'),
      path.resolve(process.cwd(), 'minja-cloud/frontend/dist'),
      '/var/www/minja-cloud/frontend/dist',
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist'),
    ];

    for (const distDir of spaDistCandidates) {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8');

        try {
          const sessionCode = formatSessionDigits(sessionId);
          const sessionTitle = `Foto Sesi #${sessionCode} — Galeri Minja Studio`;
          const sessionDesc = `Lihat dan unduh foto studio tahan air serta video momen sesi #${sessionCode} dari Minja Photobooth.`;
          const sessionUrl = `https://gallery.minja.my.id/s/${encodeURIComponent(sessionId)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

          let imageUrl = 'https://minja.my.id/images/landing/showcase-candid-1.jpg';
          const items = await deliveryService.storageService.listSessionGalleryItems(sessionId);
          const firstFrame = items.find((i) => i.fileType === 'layout_4r') || items[0];
          if (firstFrame?.url) {
            imageUrl = firstFrame.url;
          }

          html = html
            .replace(/<title>.*?<\/title>/i, `<title>${sessionTitle}</title>`)
            .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${sessionTitle}" />`)
            .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${sessionTitle}" />`)
            .replace(/<meta\s+property="og:description"[\s\S]*?\/?>/i, `<meta property="og:description" content="${sessionDesc}" />`)
            .replace(/<meta\s+name="twitter:description"[\s\S]*?\/?>/i, `<meta name="twitter:description" content="${sessionDesc}" />`)
            .replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i, `<meta property="og:image" content="${imageUrl}" />`)
            .replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${imageUrl}" />`)
            .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, `<meta property="og:url" content="${sessionUrl}" />`);
        } catch {
          // Fallback ke template default tanpa injeksi jika sesi baru belum tercatat
        }

        return reply.type('text/html').send(html);
      }
    }

    const queryPart = token ? `?token=${encodeURIComponent(token)}` : '';
    return reply.redirect(302, `https://gallery.minja.my.id/s/${encodeURIComponent(sessionId)}${queryPart}`);
  };

  app.get('/s/:sessionId', handleHtmlGallery);
  app.get('/gallery/:sessionId', handleHtmlGallery);

  /**
   * GET /api/public/gallery/:sessionId/download/:fileName
   * Endpoint unduh soft file langsung dari Cloudflare R2 dengan header Content-Disposition attachment
   */
  app.get('/api/public/gallery/:sessionId/download/:fileName', async (request, reply) => {
    const { sessionId, fileName } = request.params as { sessionId: string; fileName: string };
    const safeSessionId = path.basename(sessionId);
    const safeFileName = path.basename(fileName);

    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFileName)}"`);
    reply.header('Access-Control-Allow-Origin', '*');

    const stream = await deliveryService.storageService.getObjectStream(`${safeSessionId}/${safeFileName}`);
    if (stream) {
      const ext = path.extname(safeFileName).toLowerCase();
      const mime = ext === '.mp4' ? 'video/mp4' : ext === '.png' ? 'image/png' : 'image/jpeg';
      reply.header('Content-Type', mime);
      return reply.send(stream);
    }

    return reply.status(404).send({
      success: false,
      error: { code: 'FILE_NOT_FOUND', message: 'Berkas tidak ditemukan di penyimpanan Cloud R2.' },
    });
  });

  /**
   * GET /api/public/gallery/:sessionId/download-zip
   * Mengemas seluruh foto & video sesi dari Cloudflare R2 menjadi satu file ZIP tunggal secara streaming
   */
  app.get(
    '/api/public/gallery/:sessionId/download-zip',
    { preHandler: [galleryZipRateLimiter] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const query = (request.query || {}) as { token?: string };
      let token = query.token;

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
    }
  );
}
