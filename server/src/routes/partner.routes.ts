// server/src/routes/partner.routes.ts
// REST Endpoints untuk Mitra Franchise / Partner Portal & Super Admin Partner Management

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PartnerService } from '../services/partner.service.js';
import { VoucherService } from '../services/voucher.service.js';
import { createVoucherSchema } from '../schemas/voucher.schema.js';
import { requireAdminAuth, requirePartnerAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, ErrorCode } from '../middleware/error.middleware.js';

const partnerLoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(4, 'Kata sandi minimal 4 karakter'),
});

const createPartnerSchema = z.object({
  name: z.string().min(2, 'Nama mitra minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(4, 'Kata sandi minimal 4 karakter'),
  phone: z.string().optional(),
  revenueSharePct: z.number().int().min(0).max(100).optional(),
});

const updatePartnerSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  password: z.string().min(4).optional(),
  revenueSharePct: z.number().int().min(0).max(100).optional(),
  receiptHeader: z.string().nullable().optional(),
  receiptFooter: z.string().nullable().optional(),
  receiptAddress: z.string().nullable().optional(),
  receiptSocial: z.string().nullable().optional(),
  receiptPolicy: z.string().nullable().optional(),
  receiptPaperWidth: z.number().int().nullable().optional(),
  receiptConfig: z.any().optional(),
  isActive: z.boolean().optional(),
});

const createPartnerPassSchema = z.object({
  packageId: z.string().nullable().optional(),
  type: z.enum(['SESSION', 'EXTRA_PRINT']).default('SESSION'),
  extraPrints: z.number().int().min(0).max(20).optional().default(0),
  kioskId: z.string().nullable().optional(),
  amount: z.number().int().min(0).optional(),
  customerNote: z.string().optional(),
  cashierName: z.string().optional(),
  expiresInHours: z.number().int().min(1).max(720).default(24),
});

const extendPartnerPassSchema = z.object({
  hours: z.number().int().min(1).max(720).default(24),
});

const revokePartnerPassSchema = z.object({
  reason: z.string().max(200).optional(),
});

const createPartnerPackageSchema = z.object({
  name: z.string().min(2, 'Nama paket minimal 2 karakter'),
  description: z.string().optional(),
  price: z.number().int().min(0, 'Harga tidak boleh negatif'),
  durationSeconds: z.number().int().min(30).default(300),
  maxShots: z.number().int().min(1).default(8),
  maxSelections: z.number().int().min(1).default(4),
  defaultPrints: z.number().int().min(1).default(2),
  additionalPrintPrice: z.number().int().min(0).default(10000),
});

const updatePartnerPackageSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().int().min(0).optional(),
  durationSeconds: z.number().int().min(30).optional(),
  maxShots: z.number().int().min(1).optional(),
  maxSelections: z.number().int().min(1).optional(),
  defaultPrints: z.number().int().min(1).optional(),
  additionalPrintPrice: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const assignKioskSchema = z.object({
  partnerId: z.string().nullable(),
});

const createOperatorSchema = z.object({
  name: z.string().min(2, 'Nama kasir minimal 2 karakter'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  pin: z.string().min(4, 'PIN minimal 4 karakter'),
  kioskId: z.string().optional(),
});

const updateOperatorSchema = z.object({
  name: z.string().min(2).optional(),
  pin: z.string().min(4).optional(),
  kioskId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function partnerRoutes(app: FastifyInstance): Promise<void> {
  const partnerService = new PartnerService(app.prisma);
  const voucherService = new VoucherService(app.prisma);

  /**
   * POST /api/partner/login & /api/partner/auth/login
   * Login mandiri untuk Mitra / Franchisee
   */
  const handlePartnerLogin = async (request: any, reply: any) => {
    const body = partnerLoginSchema.parse(request.body);
    const result = await partnerService.partnerLogin(body.email, body.password);
    sendSuccess(reply, result);
  };
  app.post('/api/partner/login', handlePartnerLogin);
  app.post('/api/partner/auth/login', handlePartnerLogin);

  /**
   * POST /api/partner/auth/change-password
   * Ganti kata sandi mitra mandiri
   */
  app.post('/api/partner/auth/change-password', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const schema = z.object({
      currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
      newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter'),
    });
    const body = schema.parse(request.body);
    const result = await partnerService.changePassword(partnerId, body.currentPassword, body.newPassword);
    sendSuccess(reply, result);
  });

  /**
   * GET /api/partner/me
   * Profil mitra yang sedang login
   */
  app.get('/api/partner/me', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const partner = await app.prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        revenueSharePct: true,
        receiptHeader: true,
        receiptFooter: true,
        receiptAddress: true,
        receiptSocial: true,
        receiptPolicy: true,
        receiptPaperWidth: true,
        receiptConfig: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!partner) {
      return sendError(reply, 404, ErrorCode.NOT_FOUND, 'Mitra tidak ditemukan');
    }
    sendSuccess(reply, partner);
  });

  /**
   * GET /api/partner/my-kiosks
   * Mengambil daftar booth yang dimiliki oleh partner yang sedang login
   */
  app.get('/api/partner/my-kiosks', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const kiosks = await partnerService.getMyKiosks(partnerId);
    sendSuccess(reply, kiosks);
  });

  /**
   * GET /api/partner/operators
   * Mengambil daftar akun kasir lapangan milik partner
   */
  app.get('/api/partner/operators', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const operators = await partnerService.getPartnerOperators(partnerId);
    sendSuccess(reply, operators);
  });

  /**
   * POST /api/partner/operators
   * Membuat akun kasir lapangan baru
   */
  app.post('/api/partner/operators', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const body = createOperatorSchema.parse(request.body);
    const created = await partnerService.createOperator(partnerId, body);
    sendSuccess(reply, created, 201);
  });

  /**
   * PATCH /api/partner/operators/:id
   * Memperbarui detail / PIN / status aktif kasir
   */
  app.patch('/api/partner/operators/:id', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const body = updateOperatorSchema.parse(request.body);
    const updated = await partnerService.updateOperator(params.id, partnerId, body);
    sendSuccess(reply, updated);
  });

  /**
   * DELETE /api/partner/operators/:id
   * Menghapus atau menonaktifkan akun kasir lapangan
   */
  app.delete('/api/partner/operators/:id', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const result = await partnerService.deleteOperator(params.id, partnerId);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/partner/sync
   * Memicu sinkronisasi manual antrean data pending/offline ke database
   */
  app.post('/api/partner/sync', { preHandler: [requirePartnerAuth] }, async (_request, reply) => {
    await app.syncQueueService.checkConnectivity();
    const result = await app.syncQueueService.drainQueue();
    sendSuccess(reply, {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      message: `Sinkronisasi berhasil: ${result.succeeded} data pending berhasil disinkronkan ke database`,
    });
  });

  /**
   * GET /api/partner/financial-analytics & /api/partner/analytics
   * Laporan omzet dan performa mendalam khusus booth milik partner
   */
  const handleFinancialAnalytics = async (request: any, reply: any) => {
    const partnerId = request.partnerId!;
    const query = request.query as {
      period?: string;
      startDate?: string;
      endDate?: string;
      kioskId?: string;
    };

    const analytics = await partnerService.getPartnerFinancialAnalytics(partnerId, query);
    sendSuccess(reply, analytics);
  };
  app.get('/api/partner/financial-analytics', { preHandler: [requirePartnerAuth] }, handleFinancialAnalytics);
  app.get('/api/partner/analytics', { preHandler: [requirePartnerAuth] }, handleFinancialAnalytics);

  /**
   * GET /api/partner/transactions
   * Daftar transaksi terperinci per booth dengan pagination dan filter
   */
  app.get('/api/partner/transactions', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const query = request.query as {
      kioskId?: string;
      startDate?: string;
      endDate?: string;
      period?: string;
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = await partnerService.getPartnerTransactions(partnerId, {
      kioskId: query.kioskId,
      startDate: query.startDate,
      endDate: query.endDate,
      period: query.period,
      status: query.status,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
    sendSuccess(reply, result);
  });

  /**
   * GET /api/partner/transactions/export-csv
   * Ekspor transaksi mitra ke file CSV
   */
  app.get('/api/partner/transactions/export-csv', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const query = request.query as {
      kioskId?: string;
      startDate?: string;
      endDate?: string;
      period?: string;
      status?: string;
      search?: string;
    };

    const csvData = await partnerService.exportPartnerTransactionsCsv(partnerId, query);
    const dateStr = new Date().toISOString().slice(0, 10);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="transaksi-mitra-${dateStr}.csv"`);
    return reply.send(csvData);
  });

  /**
   * GET /api/partner/sessions
   * Daftar sesi pelanggan per booth
   */
  app.get('/api/partner/sessions', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const query = request.query as {
      kioskId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = await partnerService.getPartnerSessions(partnerId, {
      kioskId: query.kioskId,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
    sendSuccess(reply, result);
  });

  /**
   * GET /api/partner/packages
   * Daftar paket dan status aktif/nonaktif per booth mitra
   */
  app.get('/api/partner/packages', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const result = await partnerService.getPartnerPackages(partnerId);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/partner/packages
   * Mitra: Membuat paket sesi custom baru
   */
  app.post('/api/partner/packages', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const body = createPartnerPackageSchema.parse(request.body);
    const created = await partnerService.createPartnerPackage(partnerId, body);
    sendSuccess(reply, created, 201);
  });

  /**
   * PATCH /api/partner/packages/:id
   * Mitra: Memperbarui paket sesi custom
   */
  app.patch('/api/partner/packages/:id', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const body = updatePartnerPackageSchema.parse(request.body);
    const updated = await partnerService.updatePartnerPackage(partnerId, params.id, body);
    sendSuccess(reply, updated);
  });

  /**
   * DELETE /api/partner/packages/:id
   * Mitra: Menghapus paket sesi custom
   */
  app.delete('/api/partner/packages/:id', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const result = await partnerService.deletePartnerPackage(partnerId, params.id);
    sendSuccess(reply, result);
  });

  /**
   * PATCH /api/partner/kiosks/:id/packages
   * Mengatur paket aktif/nonaktif pada booth tertentu
   */
  app.patch('/api/partner/kiosks/:id/packages', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const body = z.object({ disabledPackageIds: z.array(z.string()) }).parse(request.body);
    const result = await partnerService.updateKioskPackages(partnerId, params.id, body.disabledPackageIds);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/partner/kiosks/:id/reset
   * Reset darurat / batalkan sesi macet per booth
   */
  app.post('/api/partner/kiosks/:id/reset', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const result = await partnerService.remoteResetKiosk(partnerId, params.id);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/partner/kiosks/:id/bypass
   * Bypass jarak jauh booth pilihan mitra:
   * Meloloskan pembayaran sesi aktif langsung ke kamera atau membuatkan PASS bypass instan khusus booth ini
   */
  app.post('/api/partner/kiosks/:id/bypass', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const result = await partnerService.remoteBypassKiosk(partnerId, params.id);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/partner/kiosks/:id/lock
   * Kunci / Buka booth (Maintenance Mode)
   */
  app.post('/api/partner/kiosks/:id/lock', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const body = z.object({
      isLocked: z.boolean(),
      reason: z.string().optional(),
    }).parse(request.body);

    const result = await partnerService.remoteLockKiosk(partnerId, params.id, body.isLocked, body.reason);
    sendSuccess(reply, result);
  });

  // ==========================================
  // PARTNER VOUCHERS ENDPOINTS
  // ==========================================

  /**
   * GET /api/partner/vouchers
   * Mengambil daftar voucher diskon yang dibuat oleh mitra ini
   */
  app.get('/api/partner/vouchers', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const vouchers = await voucherService.getPartnerVouchers(partnerId);
    sendSuccess(reply, vouchers);
  });

  /**
   * POST /api/partner/vouchers
   * Membuat voucher diskon baru untuk booth tertentu atau semua booth mitra
   */
  app.post('/api/partner/vouchers', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const body = createVoucherSchema.parse(request.body);
    const created = await voucherService.createVoucher({
      ...body,
      partnerId,
    });
    sendSuccess(reply, created, 201);
  });

  /**
   * PATCH /api/partner/vouchers/:id/toggle
   * Mengaktifkan/menonaktifkan voucher mitra
   */
  app.patch('/api/partner/vouchers/:id/toggle', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const result = await voucherService.toggleVoucher(params.id, partnerId);
    sendSuccess(reply, result);
  });

  /**
   * DELETE /api/partner/vouchers/:id
   * Menghapus voucher milik mitra
   */
  app.delete('/api/partner/vouchers/:id', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const result = await voucherService.deleteVoucher(params.id, partnerId);
    sendSuccess(reply, result);
  });

  /**
   * PATCH /api/partner/profile
   * Mitra: Memperbarui profil sendiri (nama, kontak, template struk thermal)
   */
  app.patch('/api/partner/profile', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const body = updatePartnerSchema.parse(request.body);
    const updated = await partnerService.updatePartner(partnerId, body);
    sendSuccess(reply, updated);
  });

  /**
   * GET /api/partner/passes
   * Mitra: Mengambil riwayat seluruh kode PASS kasir untuk audit akuntabilitas
   */
  app.get('/api/partner/passes', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 100;
    const passes = await partnerService.getPartnerPasses(partnerId, limit);
    sendSuccess(reply, passes);
  });

  /**
   * POST /api/partner/passes
   * Mitra: Menerbitkan kode PASS baru secara mandiri
   */
  app.post('/api/partner/passes', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const body = createPartnerPassSchema.parse(request.body);
    const created = await partnerService.createPartnerPass(partnerId, body);
    sendSuccess(reply, created, 201);
  });

  /**
   * DELETE /api/partner/passes/:id
   * Mitra: Menghapus kode PASS yang belum digunakan
   */
  app.delete('/api/partner/passes/:id', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const result = await partnerService.deletePartnerPass(partnerId, params.id);
    sendSuccess(reply, result);
  });

  /**
   * PATCH /api/partner/passes/:id/revoke
   * Mitra: Membatalkan / me-revoke kode PASS yang masih aktif
   */
  app.patch('/api/partner/passes/:id/revoke', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const body = revokePartnerPassSchema.parse(request.body || {});
    const result = await partnerService.revokePartnerPass(partnerId, params.id, body.reason);
    sendSuccess(reply, result);
  });

  /**
   * PATCH /api/partner/passes/:id/extend
   * Mitra: Memperpanjang batas waktu kedaluwarsa kode PASS (+jam)
   */
  app.patch('/api/partner/passes/:id/extend', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const body = extendPartnerPassSchema.parse(request.body || {});
    const result = await partnerService.extendPartnerPass(partnerId, params.id, body.hours);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/partner/kiosks/:id/paper & PUT /api/partner/kiosks/:id/paper
   * Mitra: Penyesuaian manual sisa kertas booth & toggle opsi pelacakan kertas
   */
  const handleUpdateKioskPaper = async (request: any, reply: any) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const body = z.object({
      paperRemaining: z.number().int().min(0).max(2000).optional(),
      paperTrackingEnabled: z.boolean().optional(),
    }).parse(request.body);
    const result = await partnerService.updateKioskPaper(partnerId, params.id, body);
    sendSuccess(reply, result);
  };
  app.post('/api/partner/kiosks/:id/paper', { preHandler: [requirePartnerAuth] }, handleUpdateKioskPaper);
  app.put('/api/partner/kiosks/:id/paper', { preHandler: [requirePartnerAuth] }, handleUpdateKioskPaper);

  /**
   * PATCH /api/partner/kiosks/:id
   * Mitra: Mengedit nama, lokasi, kode booth miliknya
   */
  app.patch('/api/partner/kiosks/:id', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const body = z.object({
      name: z.string().min(2).optional(),
      location: z.string().min(2).optional(),
      code: z.string().optional(),
      paperRollCapacity: z.number().int().min(50).max(2000).optional(),
    }).parse(request.body);
    const result = await partnerService.updatePartnerKiosk(partnerId, params.id, body);
    sendSuccess(reply, result);
  });

  /**
   * GET /api/partner/kiosks/:id/details
   * Mitra: Drill-down rincian booth (telemetri, transaksi, sesi, hardware)
   */
  app.get('/api/partner/kiosks/:id/details', { preHandler: [requirePartnerAuth] }, async (request, reply) => {
    const partnerId = request.partnerId!;
    const params = request.params as { id: string };
    const details = await partnerService.getPartnerKioskDetails(partnerId, params.id);
    sendSuccess(reply, details);
  });

  // ==========================================
  // SUPER ADMIN ENDPOINTS (PENGELOLAAN PARTNER)
  // ==========================================

  /**
   * GET /api/admin/partners & /api/owner/partners
   * Super Admin: Mengambil daftar semua partner
   */
  const handleListPartners = async (_request: any, reply: any) => {
    const list = await partnerService.listPartners();
    sendSuccess(reply, list);
  };
  app.get('/api/admin/partners', { preHandler: [requireAdminAuth] }, handleListPartners);
  app.get('/api/owner/partners', { preHandler: [requireAdminAuth] }, handleListPartners);

  /**
   * POST /api/admin/partners & /api/owner/partners
   * Super Admin: Mendaftarkan partner baru
   */
  const handleCreatePartner = async (request: any, reply: any) => {
    const body = createPartnerSchema.parse(request.body);
    const created = await partnerService.createPartner(body);
    sendSuccess(reply, created, 201);
  };
  app.post('/api/admin/partners', { preHandler: [requireAdminAuth] }, handleCreatePartner);
  app.post('/api/owner/partners', { preHandler: [requireAdminAuth] }, handleCreatePartner);

  /**
   * PATCH /api/admin/partners/:id & /api/owner/partners/:id
   * Super Admin: Mengedit data partner (nama, kontak, bagi hasil, aktif/nonaktif)
   */
  const handleUpdatePartner = async (request: any, reply: any) => {
    const params = request.params as { id: string };
    const body = updatePartnerSchema.parse(request.body);
    const updated = await partnerService.updatePartner(params.id, body);
    sendSuccess(reply, updated);
  };
  app.patch('/api/admin/partners/:id', { preHandler: [requireAdminAuth] }, handleUpdatePartner);
  app.patch('/api/owner/partners/:id', { preHandler: [requireAdminAuth] }, handleUpdatePartner);

  /**
   * DELETE /api/admin/partners/:id & /api/owner/partners/:id
   * Super Admin: Menghapus mitra franchise dan melepaskan booth kembali ke Pusat
   */
  const handleDeletePartner = async (request: any, reply: any) => {
    const params = request.params as { id: string };
    const result = await partnerService.deletePartner(params.id);
    sendSuccess(reply, result);
  };
  app.delete('/api/admin/partners/:id', { preHandler: [requireAdminAuth] }, handleDeletePartner);
  app.delete('/api/owner/partners/:id', { preHandler: [requireAdminAuth] }, handleDeletePartner);

  /**
   * POST /api/admin/kiosks/:id/assign & /api/owner/kiosks/:id/assign
   * Super Admin: Menugaskan kiosk tertentu ke partner
   */
  const handleAssignKiosk = async (request: any, reply: any) => {
    const params = request.params as { id: string };
    const body = assignKioskSchema.parse(request.body);
    const result = await partnerService.assignKiosk(params.id, body.partnerId);
    sendSuccess(reply, result);
  };
  app.post('/api/admin/kiosks/:id/assign', { preHandler: [requireAdminAuth] }, handleAssignKiosk);
  app.post('/api/owner/kiosks/:id/assign', { preHandler: [requireAdminAuth] }, handleAssignKiosk);

  /**
   * GET /api/admin/kiosks/:id/details & /api/owner/kiosks/:id/details
   * Super Admin: Drill-down rincian booth
   */
  const handleAdminKioskDetails = async (request: any, reply: any) => {
    const params = request.params as { id: string };
    const details = await partnerService.getPartnerKioskDetails(null, params.id);
    sendSuccess(reply, details);
  };
  app.get('/api/admin/kiosks/:id/details', { preHandler: [requireAdminAuth] }, handleAdminKioskDetails);
  app.get('/api/owner/kiosks/:id/details', { preHandler: [requireAdminAuth] }, handleAdminKioskDetails);
}
