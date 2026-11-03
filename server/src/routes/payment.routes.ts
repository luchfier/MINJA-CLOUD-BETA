// src/routes/payment.routes.ts
// Route handler untuk Pembayaran (QRIS Midtrans & Cash Desk)
// Sesuai API_CONTRACT.md §3.6

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service.js';
import { MidtransService } from '../services/midtrans.service.js';
import { AccessCodeService } from '../services/accessCode.service.js';
import {
  createPaymentSchema,
  createExtraPrintsPaymentSchema,
  cashConfirmationSchema,
} from '../schemas/payment.schema.js';
import { requireBoothAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  const midtransService = new MidtransService();
  const paymentService = new PaymentService(app.prisma, midtransService);

  /**
   * POST /api/payments & POST /api/payments/qris
   * Membuat transaksi pembayaran untuk sesi yang berjalan
   */
  const handleCreatePayment = async (request: any, reply: any) => {
    const body = createPaymentSchema.parse(request.body);
    const created = await paymentService.createPayment(body);
    sendSuccess(reply, created, 201);
  };

  app.post('/api/payments', { preHandler: [requireBoothAuth] }, handleCreatePayment);
  app.post('/api/payments/qris', { preHandler: [requireBoothAuth] }, handleCreatePayment);

  /**
   * POST /api/payments/extra-prints
   * Membuat transaksi pembayaran Midtrans untuk lembar cetak tambahan
   */
  app.post(
    '/api/payments/extra-prints',
    { preHandler: [requireBoothAuth] },
    async (request: any, reply: any) => {
      const body = createExtraPrintsPaymentSchema.parse(request.body);
      const created = await paymentService.createExtraPrintsPayment(body);
      sendSuccess(reply, created, 201);
    }
  );

  /**
   * GET /api/payments/:orderId/status
   * Polling status pembayaran terkini (dengan rekonsiliasi aktif ke Midtrans)
   */
  app.get(
    '/api/payments/:orderId/status',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string };
      const status = await paymentService.getPaymentStatus(orderId);
      sendSuccess(reply, status);
    }
  );

  /**
   * POST /api/webhooks/midtrans
   * Webhook HTTP notification receiver dari Midtrans
   */
  app.post('/api/webhooks/midtrans', async (request, reply) => {
    const payload = request.body as any;
    const result = await paymentService.handleMidtransWebhook(payload);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/admin/cash/confirm & POST /api/cash/confirm (Alias)
   * Konfirmasi pembayaran tunai oleh petugas booth / kasir dengan PIN
   */
  const handleConfirmCash = async (request: any, reply: any) => {
    const body = cashConfirmationSchema.parse(request.body);
    const result = await paymentService.confirmCashPayment(body);
    sendSuccess(reply, result);
  };
  app.post('/api/admin/cash/confirm', handleConfirmCash);
  app.post('/api/cash/confirm', handleConfirmCash);

  /**
   * POST /api/payments/:orderId/force-settle
   * Helper test & demo untuk melunaskan pembayaran seketika (Hanya aktif di Sandbox/Dev)
   */
  app.post(
    '/api/payments/:orderId/force-settle',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const isProduction = process.env['MIDTRANS_IS_PRODUCTION'] === 'true';
      if (isProduction) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN_IN_PRODUCTION',
            message: 'Endpoint simulasi force-settle dinonaktifkan di mode produksi live.',
          },
        });
      }
      const { orderId } = request.params as { orderId: string };
      const result = await paymentService.forceSettlement(orderId);
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/payments/redeem-access-code
   * Penukaran kode akses tunai oleh pelanggan di layar booth kiosk
   */
  const accessCodeService = new AccessCodeService(app.prisma);
  app.post(
    '/api/payments/redeem-access-code',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const schema = z.object({
        sessionId: z.string().min(1),
        code: z.string().min(1),
      });
      const { sessionId, code } = schema.parse(request.body);
      const result = await accessCodeService.redeemAccessCode(sessionId, code, request.kiosk);
      sendSuccess(reply, result);
    }
  );

  app.post(
    '/api/access-codes/redeem',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const schema = z.object({
        sessionId: z.string().min(1),
        code: z.string().min(1),
      });
      const { sessionId, code } = schema.parse(request.body);
      const result = await accessCodeService.redeemAccessCode(sessionId, code, request.kiosk);
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/payments/redeem-extra-print-code
   * Menukarkan kode akses tiket CETAK TAMBAHAN (EXTRA_PRINT) di bilik booth
   */
  app.post(
    '/api/payments/redeem-extra-print-code',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const schema = z.object({
        sessionId: z.string().min(1),
        code: z.string().min(1),
        requiredPrints: z.number().int().positive().optional(),
      });
      const { sessionId, code, requiredPrints } = schema.parse(request.body);
      const result = await accessCodeService.redeemExtraPrintAccessCode(
        sessionId,
        code,
        requiredPrints,
        request.kiosk
      );
      sendSuccess(reply, result);
    }
  );
}
