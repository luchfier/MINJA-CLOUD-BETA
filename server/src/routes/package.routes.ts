// src/routes/package.routes.ts
// Route handler untuk Paket Sesi (Packages)
// Sesuai API_CONTRACT.md §3.3

import type { FastifyInstance } from 'fastify';
import { PackageService } from '../services/package.service.js';
import { createPackageSchema, updatePackageSchema } from '../schemas/package.schema.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function packageRoutes(app: FastifyInstance): Promise<void> {
  const packageService = new PackageService(app.prisma);

  /**
   * GET /api/public/packages & GET /api/packages
   * Daftar paket aktif untuk pelanggan / booth
   */
  const handleGetActive = async (request: any, reply: any) => {
    const kioskId = request.query?.kioskId as string | undefined;
    const packages = await packageService.getActivePackages(kioskId);
    sendSuccess(reply, packages);
  };

  app.get('/api/public/packages', handleGetActive);
  app.get('/api/packages', handleGetActive);

  /**
   * POST /api/packages/calculate-price
   * Menghitung total harga paket, lembar cetak tambahan, dan diskon secara akurat & konsisten
   */
  app.post('/api/packages/calculate-price', async (request, reply) => {
    const { packageId, additionalPrints = 0 } = (request.body as any) || {};

    const pkg = await app.prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PACKAGE_NOT_FOUND', message: 'Paket tidak ditemukan' },
      });
    }

    const unitPrice = pkg.additionalPrintPrice || 15000;
    const count = Math.max(0, Number(additionalPrints) || 0);
    const additionalTotal = count * unitPrice;
    const basePrice = pkg.price;
    const subtotal = basePrice + additionalTotal;

    sendSuccess(reply, {
      basePrice,
      additionalPrints: count,
      additionalPrintUnitPrice: unitPrice,
      additionalPrintTotal: additionalTotal,
      discountAmount: 0,
      grossAmount: subtotal,
      subtotal,
    });
  });

  /**
   * GET /api/admin/packages
   * Semua paket (termasuk nonaktif) dengan pagination
   */
  app.get(
    '/api/admin/packages',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      const result = await packageService.getAllPackages(page, limit);
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/admin/packages
   * Membuat paket baru
   */
  app.post(
    '/api/admin/packages',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = createPackageSchema.parse(request.body);
      const adminId = request.admin?.sub;

      const created = await packageService.createPackage(
        body,
        adminId,
        request.ip
      );
      reply.status(201);
      sendSuccess(reply, created);
    }
  );

  /**
   * PUT /api/admin/packages/:id
   * Memperbarui paket yang ada
   */
  app.put(
    '/api/admin/packages/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updatePackageSchema.parse(request.body);
      const adminId = request.admin?.sub;

      const updated = await packageService.updatePackage(
        id,
        body,
        adminId,
        request.ip
      );
      sendSuccess(reply, updated);
    }
  );

  /**
   * DELETE /api/admin/packages/:id
   * Menonaktifkan paket (soft delete)
   */
  app.delete(
    '/api/admin/packages/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const adminId = request.admin?.sub;

      const result = await packageService.deactivatePackage(
        id,
        adminId,
        request.ip
      );
      sendSuccess(reply, result);
    }
  );
}
