// server/src/routes/operator.routes.ts
// REST Endpoints untuk Kasir Lapangan Booth (Tier 3 RBAC)
// Menangani login kasir, generate kode tunai PASS, pratinjau sesi terakhir, dan reprint darurat

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OperatorService } from '../services/operator.service.js';
import { requireOperatorAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

const operatorLoginSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  pin: z.string().min(4, 'PIN minimal 4 karakter'),
});

const generatePassSchema = z.object({
  packageId: z.string().optional(),
  amount: z.number().int().min(0).optional(),
  type: z.enum(['SESSION', 'EXTRA_PRINT']).optional(),
  extraPrints: z.number().int().min(0).max(20).optional(),
  customerNote: z.string().optional(),
  expiresInMinutes: z.number().int().min(5).max(180).optional(),
});

const updatePaperSchema = z.object({
  paperRemaining: z.number().int().min(0).max(2000),
});

const reprintSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID wajib disertakan'),
  copies: z.number().int().min(1).max(4).optional(),
  reason: z.string().optional(),
});

export async function operatorRoutes(app: FastifyInstance): Promise<void> {
  const operatorService = new OperatorService(app.prisma);

  /**
   * POST /api/operator/login & /api/operator/auth/login
   * Login cepat kasir lapangan dengan Username & PIN
   */
  const handleOperatorLogin = async (request: any, reply: any) => {
    const body = operatorLoginSchema.parse(request.body);
    const result = await operatorService.operatorLogin(body.username, body.pin);
    sendSuccess(reply, result);
  };
  app.post('/api/operator/login', handleOperatorLogin);
  app.post('/api/operator/auth/login', handleOperatorLogin);

  /**
   * GET /api/operator/kiosk-status
   * Memeriksa telemetri booth tempat kasir bertugas
   */
  app.get('/api/operator/kiosk-status', { preHandler: [requireOperatorAuth] }, async (request, reply) => {
    const operatorId = request.operatorId!;
    const status = await operatorService.getKioskStatus(operatorId);
    sendSuccess(reply, status);
  });

  /**
   * GET /api/operator/packages
   * Mengambil katalog paket sesi aktif khusus milik mitra tempat operator bertugas
   */
  app.get('/api/operator/packages', { preHandler: [requireOperatorAuth] }, async (request, reply) => {
    const operatorId = request.operatorId!;
    const packages = await operatorService.getOperatorPackages(operatorId);
    sendSuccess(reply, packages);
  });

  /**
   * GET /api/operator/shift-summary
   * Mengambil ringkasan penerimaan uang kasir & total tiket PASS shift hari ini
   */
  app.get('/api/operator/shift-summary', { preHandler: [requireOperatorAuth] }, async (request, reply) => {
    const operatorId = request.operatorId!;
    const summary = await operatorService.getOperatorShiftSummary(operatorId);
    sendSuccess(reply, summary);
  });

  /**
   * POST /api/operator/generate-pass & /api/operator/pass-code
   * Menerbitkan kode sesi tunai (PASS-XXXX) saat menerima pembayaran tunai di kasir
   */
  const handleGeneratePass = async (request: any, reply: any) => {
    const operatorId = request.operatorId!;
    const body = generatePassSchema.parse(request.body || {});
    const pass = await operatorService.generateCashPass(operatorId, body);
    sendSuccess(reply, pass, 201);
  };
  app.post('/api/operator/generate-pass', { preHandler: [requireOperatorAuth] }, handleGeneratePass);
  app.post('/api/operator/pass-code', { preHandler: [requireOperatorAuth] }, handleGeneratePass);

  /**
   * GET /api/operator/my-passes & /api/operator/passes
   * Mengambil riwayat kode PASS yang pernah diterbitkan oleh kasir ini
   */
  const handleGetPasses = async (request: any, reply: any) => {
    const operatorId = request.operatorId!;
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const passes = await operatorService.getOperatorPasses(operatorId, limit);
    sendSuccess(reply, passes);
  };
  app.get('/api/operator/my-passes', { preHandler: [requireOperatorAuth] }, handleGetPasses);
  app.get('/api/operator/passes', { preHandler: [requireOperatorAuth] }, handleGetPasses);

  /**
   * POST /api/operator/update-paper
   * Penyesuaian manual sisa kertas oleh operator kasir
   */
  app.post('/api/operator/update-paper', { preHandler: [requireOperatorAuth] }, async (request, reply) => {
    const operatorId = request.operatorId!;
    const body = updatePaperSchema.parse(request.body);
    const result = await operatorService.updateOperatorPaper(operatorId, body.paperRemaining);
    sendSuccess(reply, result);
  });

  /**
   * GET /api/operator/recent-sessions
   * Mengambil riwayat 10 sesi terakhir dengan pratinjau thumbnail untuk memilih sesi yang gagal cetak
   */
  app.get('/api/operator/recent-sessions', { preHandler: [requireOperatorAuth] }, async (request, reply) => {
    const operatorId = request.operatorId!;
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const sessions = await operatorService.getRecentSessions(operatorId, limit);
    sendSuccess(reply, sessions);
  });

  /**
   * POST /api/operator/reprint-session & /api/operator/reprint
   * Memicu cetak ulang darurat (Reprint) untuk sesi tertentu yang mengalami kendala kertas macet
   */
  const handleReprint = async (request: any, reply: any) => {
    const operatorId = request.operatorId!;
    const body = reprintSessionSchema.parse(request.body);
    const result = await operatorService.reprintSession(operatorId, body.sessionId, body.copies, body.reason);
    sendSuccess(reply, result);
  };
  app.post('/api/operator/reprint-session', { preHandler: [requireOperatorAuth] }, handleReprint);
  app.post('/api/operator/reprint', { preHandler: [requireOperatorAuth] }, handleReprint);
}
