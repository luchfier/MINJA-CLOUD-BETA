// server/src/routes/kiosk.routes.ts
// REST Endpoints untuk Armada Multi-Kiosk (Control Tower)
// Mengatur pendaftaran mesin booth, remote lock, rotasi API key, dan penerimaan heartbeat

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { KioskService } from '../services/kiosk.service.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

const createKioskSchema = z.object({
  name: z.string().min(2, 'Nama booth minimal 2 karakter'),
  location: z.string().min(2, 'Lokasi booth minimal 2 karakter'),
  code: z.string().optional(),
  paperRollCapacity: z.number().int().min(50).max(2000).optional(),
  partnerId: z.string().nullable().optional(),
});

const updateKioskSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().min(2).optional(),
  paperRollCapacity: z.number().int().min(50).max(2000).optional(),
  partnerId: z.string().nullable().optional(),
});

const lockKioskSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().optional(),
});

const heartbeatSchema = z.object({
  status: z.enum(['ONLINE', 'OFFLINE', 'IN_SESSION', 'PRINTING', 'MAINTENANCE']).optional(),
  paperRemaining: z.number().int().min(0).optional(),
  printerStatus: z.string().optional(),
  cameraStatus: z.string().optional(),
  appVersion: z.string().optional(),
  activeSessionId: z.string().optional(),
  hardwareId: z.string().optional(),
});

export async function kioskRoutes(app: FastifyInstance): Promise<void> {
  const kioskService = new KioskService(app.prisma);

  /**
   * GET /api/owner/kiosks
   * Mengambil daftar semua mesin booth beserta status dinamis dan metrik hari ini
   */
  app.get(
    '/api/owner/kiosks',
    { preHandler: [requireAdminAuth] },
    async (_request, reply) => {
      const list = await kioskService.listKiosks();
      sendSuccess(reply, list);
    }
  );

  /**
   * POST /api/owner/kiosks
   * Mendaftarkan mesin booth baru & auto-generate API Key kriptografis
   */
  app.post(
    '/api/owner/kiosks',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = createKioskSchema.parse(request.body);
      const created = await kioskService.createKiosk(body);
      sendSuccess(reply, created, 201);
    }
  );

  /**
   * PATCH /api/owner/kiosks/:id
   * Memperbarui detail nama/lokasi/kapasitas kertas booth
   */
  const handleUpdateKiosk = async (request: any, reply: any) => {
    const params = request.params as { id: string };
    const body = updateKioskSchema.parse(request.body);
    const updated = await kioskService.updateKiosk(params.id, body);
    sendSuccess(reply, updated);
  };
  app.patch('/api/owner/kiosks/:id', { preHandler: [requireAdminAuth] }, handleUpdateKiosk);
  app.patch('/api/admin/kiosks/:id', { preHandler: [requireAdminAuth] }, handleUpdateKiosk);

  /**
   * POST /api/owner/kiosks/:id/lock
   * Mengunci atau membuka mesin booth tertentu dari jarak jauh (Remote Lock)
   */
  app.post(
    '/api/owner/kiosks/:id/lock',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = lockKioskSchema.parse(request.body);
      const result = await kioskService.toggleLock(params.id, body.enabled, body.reason);
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/owner/kiosks/:id/rotate-key
   * Regenerasi API Key baru untuk komputer booth
   */
  app.post(
    '/api/owner/kiosks/:id/rotate-key',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const params = request.params as { id: string };
      const result = await kioskService.rotateApiKey(params.id);
      sendSuccess(reply, result);
    }
  );

  /**
   * DELETE /api/owner/kiosks/:id
   * Menghapus registrasi mesin booth
   */
  app.delete(
    '/api/owner/kiosks/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const params = request.params as { id: string };
      const result = await kioskService.deleteKiosk(params.id);
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/kiosk/heartbeat
   * Endpoint publik yang dipanggil berkala (15 detik) oleh setiap komputer booth fisik
   * Diotentikasi via header `x-booth-key`
   */
  app.post('/api/kiosk/heartbeat', async (request, reply) => {
    const rawKey = request.headers['x-booth-key'];
    const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';

    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Header X-Booth-Key wajib disertakan untuk otentikasi komputer booth.',
        },
      });
    }

    try {
      const body = heartbeatSchema.parse(request.body || {});
      const result = await kioskService.processHeartbeat(apiKey, body, request.ip);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      const statusCode = err.statusCode || err.status || (err.code === 'FORBIDDEN' ? 403 : 401);
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: err.code || (statusCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED'),
          message: err.message || 'Gagal memproses telemetri booth.',
        },
      });
    }
  });

  /**
   * POST /api/owner/kiosks/:id/reset-hardware
   * Melepas ikatan hardware ID booth fisik agar dapat dipasang di PC baru
   */
  app.post(
    '/api/owner/kiosks/:id/reset-hardware',
    { preHandler: [requireAdminAuth] },
    async (request: any, reply) => {
      const { id } = request.params;
      const result = await kioskService.resetHardwareBinding(id);
      sendSuccess(reply, result);
    }
  );
}
