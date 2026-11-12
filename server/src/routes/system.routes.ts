// src/routes/system.routes.ts
// System endpoints: health check & version info Minja Cloud VPS

import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../middleware/error.middleware.js';

const APP_VERSION = '2.0.0';
const startTime = Date.now();

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;

  /**
   * GET /api
   * Root API Welcome info
   */
  app.get('/api', async (_request, reply) => {
    sendSuccess(reply, {
      name: 'Minja Cloud Platform API Server',
      version: APP_VERSION,
      status: 'online',
      healthCheck: '/api/system/health',
    });
  });

  /**
   * GET /api/system/health
   * Health check endpoint — tidak memerlukan autentikasi.
   */
  app.get('/api/system/health', async (_request, reply) => {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    sendSuccess(reply, {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      database: dbStatus,
      uptime: uptimeSeconds,
      version: APP_VERSION,
    });
  });
}
