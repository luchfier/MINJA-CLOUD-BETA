// src/routes/session.routes.ts
// Route handler untuk Sesi Pelanggan (Sessions)
// Sesuai API_CONTRACT.md §3.5

import type { FastifyInstance } from 'fastify';
import { SessionService } from '../services/session.service.js';
import {
  createSessionSchema,
  updateSessionStateSchema,
  completeSessionSchema,
  cancelSessionSchema,
} from '../schemas/session.schema.js';
import { requireBoothAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  const sessionService = new SessionService(app.prisma);

  /**
   * POST /api/sessions
   * Membuat sesi baru untuk pelanggan
   */
  app.post(
    '/api/sessions',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const body = createSessionSchema.parse(request.body);
      const created = await sessionService.createSession(body);
      sendSuccess(reply, created, 201);
    }
  );

  /**
   * GET /api/sessions/active
   * Mengambil sesi aktif saat ini di booth
   */
  app.get(
    '/api/sessions/active',
    { preHandler: [requireBoothAuth] },
    async (_request, reply) => {
      const active = await sessionService.getActiveSession();
      sendSuccess(reply, active);
    }
  );

  /**
   * GET /api/sessions/:id
   * Mengambil detail sesi berdasarkan ID
   */
  app.get(
    '/api/sessions/:id',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const session = await sessionService.getSession(id);
      sendSuccess(reply, session);
    }
  );

  /**
   * PATCH /api/sessions/:id/state
   * Update state lifecycle sesi foto
   */
  app.patch(
    '/api/sessions/:id/state',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateSessionStateSchema.parse(request.body);
      const updated = await sessionService.updateSessionState(id, body);
      sendSuccess(reply, updated);
    }
  );

  /**
   * POST /api/sessions/:id/complete
   * Menyelesaikan sesi foto
   */
  app.post(
    '/api/sessions/:id/complete',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = completeSessionSchema.parse(request.body);
      const completed = await sessionService.completeSession(id, body);
      sendSuccess(reply, completed);
    }
  );

  /**
   * POST /api/sessions/:id/cancel
   * Membatalkan sesi foto
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
