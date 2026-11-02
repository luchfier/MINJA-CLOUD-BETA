// src/routes/asset.routes.ts
// Route handler untuk Font Tipografi & Stiker Kustom Studio

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AssetService } from '../services/asset.service.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

const createFontSchema = z.object({
  name: z.string().trim().min(1, 'Nama font wajib diisi').max(100),
  fontFamily: z.string().trim().min(1, 'Font family wajib diisi').max(100),
  googleFont: z.string().trim().optional(),
  previewText: z.string().trim().optional(),
});

const createStickerSchema = z.object({
  name: z.string().trim().min(1, 'Nama stiker wajib diisi').max(100),
  category: z.string().trim().optional(),
  type: z.enum(['emoji', 'image']),
  url: z.string().min(1, 'Konten URL/Emoji stiker wajib diisi'),
});

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  const assetService = new AssetService();

  // =================== PUBLIC / KIOSK CUSTOMER ROUTES ===================

  /**
   * GET /api/public/assets/fonts & GET /api/assets/fonts
   * Mengambil daftar font aktif untuk customer studio
   */
  const handleGetPublicFonts = async (_request: any, reply: any) => {
    const fonts = await assetService.getFonts(false);
    sendSuccess(reply, fonts);
  };
  app.get('/api/public/assets/fonts', handleGetPublicFonts);
  app.get('/api/assets/fonts', handleGetPublicFonts);

  /**
   * GET /api/public/assets/stickers & GET /api/assets/stickers
   * Mengambil daftar stiker (emoji & PNG) aktif untuk customer studio
   */
  const handleGetPublicStickers = async (_request: any, reply: any) => {
    const stickers = await assetService.getStickers(false);
    sendSuccess(reply, stickers);
  };
  app.get('/api/public/assets/stickers', handleGetPublicStickers);
  app.get('/api/assets/stickers', handleGetPublicStickers);

  // =================== ADMIN MANAGEMENT ROUTES ===================

  /**
   * GET /api/admin/assets/fonts
   */
  app.get(
    '/api/admin/assets/fonts',
    { preHandler: [requireAdminAuth] },
    async (_request, reply) => {
      const fonts = await assetService.getFonts(true);
      sendSuccess(reply, fonts);
    }
  );

  /**
   * POST /api/admin/assets/fonts
   */
  app.post(
    '/api/admin/assets/fonts',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = createFontSchema.parse(request.body);
      const font = await assetService.createFont(body);
      sendSuccess(reply, font, 201);
    }
  );

  /**
   * DELETE /api/admin/assets/fonts/:id
   */
  app.delete(
    '/api/admin/assets/fonts/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const success = await assetService.deleteFont(id);
      sendSuccess(reply, { success });
    }
  );

  /**
   * PATCH /api/admin/assets/fonts/:id/toggle
   */
  app.patch(
    '/api/admin/assets/fonts/:id/toggle',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const updated = await assetService.toggleFont(id);
      sendSuccess(reply, updated);
    }
  );

  /**
   * GET /api/admin/assets/stickers
   */
  app.get(
    '/api/admin/assets/stickers',
    { preHandler: [requireAdminAuth] },
    async (_request, reply) => {
      const stickers = await assetService.getStickers(true);
      sendSuccess(reply, stickers);
    }
  );

  /**
   * POST /api/admin/assets/stickers
   */
  app.post(
    '/api/admin/assets/stickers',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = createStickerSchema.parse(request.body);
      const sticker = await assetService.createSticker(body);
      sendSuccess(reply, sticker, 201);
    }
  );

  /**
   * DELETE /api/admin/assets/stickers/:id
   */
  app.delete(
    '/api/admin/assets/stickers/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const success = await assetService.deleteSticker(id);
      sendSuccess(reply, { success });
    }
  );

  /**
   * PATCH /api/admin/assets/stickers/:id/toggle
   */
  app.patch(
    '/api/admin/assets/stickers/:id/toggle',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const updated = await assetService.toggleSticker(id);
      sendSuccess(reply, updated);
    }
  );
}
