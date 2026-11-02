// src/routes/system.routes.ts
// System endpoints: health check, version
// Sesuai API_CONTRACT.md §3.14

import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../middleware/error.middleware.js';
import { OwnerService } from '../services/owner.service.js';

const APP_VERSION = '1.0.0';
const startTime = Date.now();

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;

  /**
   * GET /api & GET /api/system/info
   * Root API Welcome info
   */
  app.get('/api', async (_request, reply) => {
    sendSuccess(reply, {
      name: 'MinjaPhotobooth API Server',
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

  /**
   * GET /api/system/sync-status
   * Status Auto-Sync Engine & antrean sinkronisasi offline
   */
  app.get('/api/system/sync-status', async (_request, reply) => {
    const status = app.syncQueueService.getStatus();
    sendSuccess(reply, status);
  });

  /**
   * GET /api/system/kiosk-status
   * Status publik ringan untuk layar kiosk (status maintenance, nama booth, sinyal remote test trigger, dan sisa kertas printer)
   */
  app.get('/api/system/kiosk-status', async (_request, reply) => {
    const settings = await prisma.settings.findFirst();
    const isMaintenance = Boolean(settings?.maintenanceMode);
    const pendingTestTrigger = OwnerService.getPendingTestTrigger();

    let paperRemaining = 400;
    let paperRollCapacity = 400;
    try {
      const apiKey = process.env['BOOTH_API_KEY'];
      if (apiKey) {
        const kiosk = await prisma.kiosk.findFirst({
          where: { apiKey },
          select: { paperRemaining: true, paperRollCapacity: true },
        });
        if (kiosk) {
          paperRemaining = kiosk.paperRemaining;
          paperRollCapacity = kiosk.paperRollCapacity;
        }
      }
    } catch {
      // Abaikan fallback
    }

    sendSuccess(reply, {
      isMaintenance,
      maintenanceReason: isMaintenance ? OwnerService.getMaintenanceReason() : undefined,
      boothName: settings?.boothName || 'Minja Photobooth',
      kioskStatus: isMaintenance ? 'MAINTENANCE' : 'STANDBY',
      pendingTestTrigger,
      paperRemaining,
      paperRollCapacity,
      isPaperLow: paperRemaining <= 30,
      isPaperOut: paperRemaining <= 0,
    });
  });

  /**
   * POST /api/system/ack-test-trigger
   * Acknowledge sinyal sesi uji coba dari layar kiosk sehingga tidak dipicu berulang
   */
  app.post('/api/system/ack-test-trigger', async (request, reply) => {
    const body = (request.body as any) || {};
    const consumed = OwnerService.consumeTestTrigger(body.id);
    sendSuccess(reply, {
      acknowledged: consumed,
    });
  });

  /**
   * POST /api/system/sync-now
   * Memicu sinkronisasi antrean tertunda segera ke Cloud & Supabase
   */
  app.post('/api/system/sync-now', async (_request, reply) => {
    await app.syncQueueService.checkConnectivity();
    const result = await app.syncQueueService.drainQueue();
    const status = app.syncQueueService.getStatus();
    sendSuccess(reply, {
      ...result,
      status,
      message: result.processed > 0
        ? `Berhasil memproses ${result.succeeded} dari ${result.processed} sesi tertunda.`
        : 'Tidak ada sesi tertunda dalam antrean.',
    });
  });

  /**
   * GET /api/system/timing-config & GET /api/system/timing (Alias)
   * Mengambil konfigurasi interval auto-sync dan pembersihan file disk
   */
  const handleGetTiming = async (_request: any, reply: any) => {
    const config = app.timingConfigService.getConfig();
    sendSuccess(reply, config);
  };
  app.get('/api/system/timing-config', handleGetTiming);
  app.get('/api/system/timing', handleGetTiming);

  /**
   * PUT /api/system/timing-config & PUT /api/system/timing (Alias)
   * Memperbarui interval auto-sync, retensi cetak, dan pembersihan otomatis
   */
  const handlePutTiming = async (request: any, reply: any) => {
    const body = (request.body as any) || {};
    const updated = await app.timingConfigService.updateConfig(body);
    sendSuccess(reply, {
      ...updated,
      message: 'Konfigurasi waktu sinkronisasi dan pembersihan berhasil disimpan.',
    });
  };
  app.put('/api/system/timing-config', handlePutTiming);
  app.put('/api/system/timing', handlePutTiming);
}


