// src/routes/settings.routes.ts
// Route handler untuk Konfigurasi & Branding Publik Landing Page

import type { FastifyInstance } from 'fastify';
import { SettingsService } from '../services/settings.service.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  const settingsService = new SettingsService(app.prisma);

  /**
   * GET /api/settings
   * Konfigurasi publik untuk tampilan Landing Page & Galeri Cloud (tidak perlu auth)
   */
  app.get('/api/settings', async (_request, reply) => {
    const publicSettings = await settingsService.getPublicSettings();
    sendSuccess(reply, publicSettings);
  });
}
