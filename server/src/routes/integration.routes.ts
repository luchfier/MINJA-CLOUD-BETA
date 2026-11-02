// server/src/routes/integration.routes.ts
// Route Handler untuk Pengelolaan Integrasi API & Kiosk Identity
// Mengelola kredensial Midtrans, Resend, Cloudflare R2, dan Kiosk Identity

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { IntegrationService } from '../services/integration.service.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

const updateIntegrationSchema = z.object({
  kioskCode: z.string().optional(),
  kioskName: z.string().optional(),
  kioskLocation: z.string().optional(),
  boothApiKey: z.string().optional(),
  midtransServerKey: z.string().optional(),
  midtransClientKey: z.string().optional(),
  midtransIsProduction: z.boolean().optional(),
  resendApiKey: z.string().optional(),
  resendFrom: z.string().optional(),
  s3Endpoint: z.string().optional(),
  s3AccessKey: z.string().optional(),
  s3SecretKey: z.string().optional(),
  s3BucketName: z.string().optional(),
  s3Region: z.string().optional(),
  galleryBaseUrl: z.string().optional(),
});

const testEmailSchema = z.object({
  testEmail: z.string().email('Format email tidak valid'),
});

export async function integrationRoutes(app: FastifyInstance): Promise<void> {
  const integrationService = new IntegrationService(app.prisma);

  /**
   * GET /api/admin/integrations
   * Mengambil konfigurasi integrasi & identitas kiosk saat ini
   */
  app.get(
    '/api/admin/integrations',
    { preHandler: [requireAdminAuth] },
    async (_request, reply) => {
      const config = integrationService.getIntegrations();
      sendSuccess(reply, config);
    }
  );

  /**
   * PUT /api/admin/integrations
   * Memperbarui konfigurasi integrasi & identitas kiosk (Hot-Reload)
   */
  app.put(
    '/api/admin/integrations',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = updateIntegrationSchema.parse(request.body);
      const adminId = request.admin?.sub;

      const updated = await integrationService.updateIntegrations(
        body,
        adminId,
        request.ip
      );
      sendSuccess(reply, updated);
    }
  );

  /**
   * POST /api/admin/integrations/test-email
   * Menguji pengiriman email uji coba via Resend REST API
   */
  app.post(
    '/api/admin/integrations/test-email',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = testEmailSchema.parse(request.body);
      const result = await integrationService.testEmail(body.testEmail);
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/admin/integrations/test-midtrans
   * Menguji validitas koneksi Midtrans Server Key
   */
  app.post(
    '/api/admin/integrations/test-midtrans',
    { preHandler: [requireAdminAuth] },
    async (_request, reply) => {
      const result = await integrationService.testMidtrans();
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/admin/integrations/test-s3
   * Menguji konektivitas Cloudflare R2 / AWS S3 Storage
   */
  app.post(
    '/api/admin/integrations/test-s3',
    { preHandler: [requireAdminAuth] },
    async (_request, reply) => {
      const result = await integrationService.testS3();
      sendSuccess(reply, result);
    }
  );
}
