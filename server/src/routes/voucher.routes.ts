// src/routes/voucher.routes.ts
// Route handler untuk Validasi & Konsumsi Voucher Promosi oleh Booth Kiosk

import type { FastifyInstance } from 'fastify';
import { VoucherService } from '../services/voucher.service.js';
import { validateVoucherSchema } from '../schemas/voucher.schema.js';
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
   * POST /api/vouchers/consume
   * Mengonsumsi kuota voucher saat pembayaran/sesi lunas
   */
  app.post('/api/vouchers/consume', async (request, reply) => {
    const { code, sessionId } = (request.body || {}) as { code?: string; sessionId?: string };
    if (!code) {
      return reply.status(400).send({
        success: false,
        error: { code: 'PARAM_REQUIRED', message: 'Kode voucher wajib disertakan.' },
      });
    }
    const result = await voucherService.recordVoucherUsage(code, sessionId);
    sendSuccess(reply, result);
  });
}
