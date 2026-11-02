// src/routes/settings.routes.ts
// Route handler untuk Konfigurasi & Branding
// Sesuai API_CONTRACT.md §3.2, §3.3

import type { FastifyInstance } from 'fastify';
import { SettingsService } from '../services/settings.service.js';
import { updateSettingsSchema } from '../schemas/admin.schema.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  const settingsService = new SettingsService(app.prisma);

  /**
   * GET /api/settings
   * Konfigurasi publik untuk tampilan booth (tidak perlu auth)
   */
  app.get('/api/settings', async (_request, reply) => {
    const publicSettings = await settingsService.getPublicSettings();
    sendSuccess(reply, publicSettings);
  });

  /**
   * GET /api/admin/settings
   * Seluruh konfigurasi sistem untuk admin (perlu token)
   */
  app.get(
    '/api/admin/settings',
    { preHandler: [requireAdminAuth] },
    async (_request, reply) => {
      const allSettings = await settingsService.getAllSettings();
      sendSuccess(reply, allSettings);
    }
  );

  /**
   * PUT /api/admin/settings
   * Update konfigurasi sistem
   */
  app.put(
    '/api/admin/settings',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = updateSettingsSchema.parse(request.body);
      const adminId = request.admin?.sub;

      const updated = await settingsService.updateSettings(
        body,
        adminId,
        request.ip
      );
      sendSuccess(reply, updated);
    }
  );
}
