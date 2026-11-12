// src/routes/package.routes.ts
// Route handler untuk Katalog Paket Sesi Publik & Sinkronisasi Booth

import type { FastifyInstance } from 'fastify';
import { PackageService } from '../services/package.service.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function packageRoutes(app: FastifyInstance): Promise<void> {
  const packageService = new PackageService(app.prisma);

  /**
   * GET /api/public/packages & GET /api/packages
   * Daftar paket aktif untuk pelanggan / sinkronisasi booth
   */
  const handleGetActive = async (request: any, reply: any) => {
    const kioskId = request.query?.kioskId as string | undefined;
    const packages = await packageService.getActivePackages(kioskId);
    sendSuccess(reply, packages);
  };

  app.get('/api/public/packages', handleGetActive);
  app.get('/api/packages', handleGetActive);
}
