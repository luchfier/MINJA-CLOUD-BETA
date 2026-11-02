// src/routes/voucher.routes.ts
// Route handler untuk Voucher Promosi & Validasi Diskon
// Sesuai API_CONTRACT.md §3.7

import type { FastifyInstance } from 'fastify';
import { VoucherService } from '../services/voucher.service.js';
import {
  validateVoucherSchema,
  createVoucherSchema,
  updateVoucherSchema,
} from '../schemas/voucher.schema.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function voucherRoutes(app: FastifyInstance): Promise<void> {
  const voucherService = new VoucherService(app.prisma);

  /**
   * POST /api/vouchers/validate
   * Validasi kode voucher untuk pelanggan booth
   */
  app.post('/api/vouchers/validate', async (request, reply) => {
    const body = validateVoucherSchema.parse(request.body);
    const result = await voucherService.validateVoucher(body);
    sendSuccess(reply, result);
  });

  /**
   * GET /api/admin/vouchers
   * Mengambil semua voucher untuk dashboard admin
   */
  app.get(
    '/api/admin/vouchers',
    { preHandler: [requireAdminAuth] },
    async (_request, reply) => {
      const list = await voucherService.listVouchers();
      sendSuccess(reply, list);
    }
  );

  /**
   * POST /api/admin/vouchers
   * Menambahkan voucher baru
   */
  app.post(
    '/api/admin/vouchers',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = createVoucherSchema.parse(request.body);
      const created = await voucherService.createVoucher(body);
      reply.status(201);
      sendSuccess(reply, created);
    }
  );

  /**
   * PUT /api/admin/vouchers/:id
   * Memperbarui voucher
   */
  app.put(
    '/api/admin/vouchers/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateVoucherSchema.parse(request.body);
      const updated = await voucherService.updateVoucher(id, body);
      sendSuccess(reply, updated);
    }
  );

  /**
   * DELETE /api/admin/vouchers/:id
   * Menghapus voucher
   */
  app.delete(
    '/api/admin/vouchers/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await voucherService.deleteVoucher(id);
      sendSuccess(reply, result);
    }
  );
}
