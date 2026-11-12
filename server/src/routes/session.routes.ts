// src/routes/session.routes.ts
// Route handler untuk Sinkronisasi Sesi Pelanggan dari Booth Kiosk ke Cloud VPS

import type { FastifyInstance } from 'fastify';
import { SessionService } from '../services/session.service.js';
import {
  createSessionSchema,
  completeSessionSchema,
  cancelSessionSchema,
} from '../schemas/session.schema.js';
import { requireBoothAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  const sessionService = new SessionService(app.prisma);

  /**
   * POST /api/sessions
   * Membuat sesi baru dari Booth Kiosk
   */
  app.post(
    '/api/sessions',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const body = createSessionSchema.parse(request.body);
      const created = await sessionService.createSession(body, request.kioskId);
      sendSuccess(reply, created, 201);
    }
  );

  /**
   * POST /api/sessions/:id/complete
   * Menyelesaikan sesi foto & mencatat jumlah cetak dari Booth Kiosk
   */
  app.post(
    '/api/sessions/:id/complete',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = completeSessionSchema.parse(request.body);
      const completed = await sessionService.completeSession(id, body, request.kioskId);
      sendSuccess(reply, completed);
    }
  );

  /**
   * POST /api/sessions/:id/cancel
   * Membatalkan sesi foto dari Booth Kiosk
   */
  app.post(
    '/api/sessions/:id/cancel',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = cancelSessionSchema.parse(request.body);
      const cancelled = await sessionService.cancelSession(id, body.reason);
      sendSuccess(reply, cancelled);
    }
  );
}
