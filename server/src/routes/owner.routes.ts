// server/src/routes/owner.routes.ts
// REST Endpoint untuk Remote Owner Management via Cloudflare Tunnel & Mobile Web

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { OwnerService } from '../services/owner.service.js';
import { PrintService } from '../services/print.service.js';
import { AccessCodeService } from '../services/accessCode.service.js';
import { VoucherService } from '../services/voucher.service.js';
import { TransactionEngineService } from '../services/transactionEngine.service.js';
import { AdminAuthService } from '../services/admin-auth.service.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';

export const ownerRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const printService = new PrintService(app.prisma);
  const ownerService = new OwnerService(app.prisma, app.syncQueueService, printService);
  const accessCodeService = new AccessCodeService(app.prisma);
  const voucherService = new VoucherService(app.prisma);
  const transactionEngine = new TransactionEngineService(app.prisma);
  const adminAuthService = new AdminAuthService(app.prisma);

  // 1. GET /api/owner/telemetry
  // Telemetri ringkas real-time untuk status booth, omzet hari ini, dan tunnel (TERPROTEKSI AUTH)
  app.get('/api/owner/telemetry', { preHandler: [requireAdminAuth] }, async (_req, reply) => {
    const telemetry = await ownerService.getTelemetry();
    return reply.send({
      success: true,
      data: telemetry,
    });
  });

  // 2. GET /api/owner/sessions-today & /api/owner/sessions/today
  // Daftar sesi foto pelanggan hari ini beserta thumbnail & file digital (TERPROTEKSI AUTH)
  const handleSessionsToday = async (req: any, reply: any) => {
    const query = req.query as { limit?: string };
    const limit = query.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 50;
    const sessions = await ownerService.getTodaySessions(limit);
    return reply.send({
      success: true,
      data: sessions,
    });
  };
  app.get('/api/owner/sessions-today', { preHandler: [requireAdminAuth] }, handleSessionsToday);
  app.get('/api/owner/sessions/today', { preHandler: [requireAdminAuth] }, handleSessionsToday);

  // 3. POST /api/owner/kiosk/lock
  // Kunci / Buka Kiosk dari jarak jauh atau Admin (Mode Pemeliharaan / Refill Kertas)
  // Wajib verifikasi PIN Admin / Owner untuk keamanan
  app.post(
    '/api/owner/kiosk/lock',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const schema = z.object({
        enabled: z.boolean(),
        pin: z.string().min(1, 'PIN Admin wajib diisi'),
        reason: z.string().optional(),
      });
      const parsed = schema.parse(req.body);

      // Verifikasi PIN
      await adminAuthService.verifyAdminPin(parsed.pin, req.ip, req.headers['user-agent'] as string);

      const result = await ownerService.toggleMaintenanceMode(parsed.enabled, parsed.reason);
      return reply.send({
        success: true,
        data: {
          maintenanceMode: result.maintenanceMode,
          reason: result.reason,
          message: result.maintenanceMode
            ? `Kiosk berhasil dikunci (${result.reason || 'Mode Pemeliharaan'}).`
            : 'Kiosk berhasil dibuka kembali dan siap melayani pelanggan.',
        },
      });
    }
  );

  // 3.5. POST /api/owner/kiosk/trigger-test-session
  // Memicu sesi uji coba kiosk (Bypass pembayaran untuk instalasi / kalibrasi hardware)
  // Wajib verifikasi PIN Admin / Owner
  app.post(
    '/api/owner/kiosk/trigger-test-session',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const schema = z.object({
        pin: z.string().min(1, 'PIN Admin wajib diisi'),
        packageId: z.string().optional(),
        virtualPrint: z.boolean().default(true),
      });
      const parsed = schema.parse(req.body);

      // Verifikasi PIN
      await adminAuthService.verifyAdminPin(parsed.pin, req.ip, req.headers['user-agent'] as string);

      const trigger = await ownerService.triggerTestSession(parsed.packageId, parsed.virtualPrint);
      return reply.send({
        success: true,
        data: {
          triggerId: trigger.id,
          virtualPrint: trigger.virtualPrint,
          packageId: trigger.packageId,
          message: 'Sinyal sesi uji coba berhasil dikirim ke Kiosk! Kiosk akan langsung membuka kamera.',
        },
      });
    }
  );

  // 4. POST /api/owner/actions/force-sync
  // Paksa upload semua antrean foto & database ke Cloudflare R2 / Supabase
  app.post(
    '/api/owner/actions/force-sync',
    { preHandler: [requireAdminAuth] },
    async (_req, reply) => {
      const result = await ownerService.triggerForceSync();
      return reply.send({
        success: true,
        data: {
          ...result,
          message: `Force sync selesai: ${result.succeeded} berhasil, ${result.failed} gagal.`,
        },
      });
    }
  );

  // 5. POST /api/owner/actions/cleanup
  // Bersihkan cache file cetak sementara di disk kiosk
  app.post(
    '/api/owner/actions/cleanup',
    { preHandler: [requireAdminAuth] },
    async (_req, reply) => {
      const result = await ownerService.triggerCleanup();
      return reply.send({
        success: true,
        data: {
          ...result,
          message: `Berhasil membersihkan ${result.deleted} file cetak sementara.`,
        },
      });
    }
  );

  // 6. POST /api/owner/actions/resend-email
  // Kirim ulang link galeri soft file ke email pelanggan jika komplain
  app.post(
    '/api/owner/actions/resend-email',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const schema = z.object({
        sessionId: z.string().min(1),
        targetEmail: z.string().email().optional(),
      });
      const parsed = schema.parse(req.body);
      const result = await ownerService.resendEmail(parsed.sessionId, parsed.targetEmail);
      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // 7. GET /api/owner/tunnel-status & POST /api/owner/tunnel-status (plus /api/owner/tunnel alias)
  // Konfigurasi & status Cloudflare Tunnel (TERPROTEKSI AUTH)
  const handleGetTunnelStatus = async (_req: any, reply: any) => {
    const config = ownerService.getTunnelConfig();
    return reply.send({
      success: true,
      data: config,
    });
  };
  app.get('/api/owner/tunnel-status', { preHandler: [requireAdminAuth] }, handleGetTunnelStatus);
  app.get('/api/owner/tunnel', { preHandler: [requireAdminAuth] }, handleGetTunnelStatus);

  const handlePostTunnelStatus = async (req: any, reply: any) => {
    const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1';
    if (!isLocalhost) {
      await requireAdminAuth(req, reply);
    }
    const schema = z.object({
      tunnelUrl: z.string(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.parse(req.body);
    const updated = ownerService.setTunnelUrl(parsed.tunnelUrl, parsed.isActive ?? true);
    return reply.send({
      success: true,
      data: updated,
    });
  };
  app.post('/api/owner/tunnel-status', handlePostTunnelStatus);
  app.post('/api/owner/tunnel', handlePostTunnelStatus);
  app.put('/api/owner/tunnel', handlePostTunnelStatus);

  // 8. POST /api/owner/actions/test-print
  // Jalankan test print dari jarak jauh
  app.post(
    '/api/owner/actions/test-print',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const res = await printService.testPrint((req.body as any) || {});
      return reply.send({
        success: true,
        data: res,
      });
    }
  );

  // 9. GET /api/owner/access-codes
  // Mendapatkan daftar kode akses tunai
  app.get(
    '/api/owner/access-codes',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const query = req.query as { status?: any; limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 100;
      const codes = await accessCodeService.getAccessCodes({
        status: query.status,
        limit,
      });
      return reply.send({
        success: true,
        data: codes,
      });
    }
  );

  // 10. POST /api/owner/access-codes
  // Membuat kode akses tunai baru
  app.post(
    '/api/owner/access-codes',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const schema = z.object({
        packageId: z.string().optional().nullable(),
        amount: z.number().int().nonnegative().optional(),
        customerNote: z.string().max(200).optional().nullable(),
        cashierName: z.string().max(50).optional(),
        expiresInHours: z.number().int().min(1).max(720).optional(),
        kioskId: z.string().optional().nullable(),
        partnerId: z.string().optional().nullable(),
      });
      const parsed = schema.parse(req.body);
      const created = await accessCodeService.createAccessCode(parsed);
      return reply.status(201).send({
        success: true,
        data: created,
      });
    }
  );

  // 11. POST /api/owner/access-codes/:id/revoke
  // Membatalkan kode akses yang belum terpakai
  app.post(
    '/api/owner/access-codes/:id/revoke',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = (req.body || {}) as { reason?: string };
      const revoked = await accessCodeService.revokeAccessCode(id, body.reason);
      return reply.send({
        success: true,
        data: revoked,
      });
    }
  );

  // 12. GET /api/owner/vouchers
  // Daftar semua voucher untuk dashboard owner
  app.get(
    '/api/owner/vouchers',
    { preHandler: [requireAdminAuth] },
    async (_req, reply) => {
      const vouchers = await voucherService.listVouchers();
      return reply.send({
        success: true,
        data: vouchers,
      });
    }
  );

  // 13. POST /api/owner/vouchers
  // Buat voucher promo baru dari owner portal
  app.post(
    '/api/owner/vouchers',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const schema = z.object({
        code: z.string().min(2).max(30),
        discountType: z.enum(['percentage', 'fixed']),
        discountValue: z.number().positive(),
        minSpend: z.number().nonnegative().optional(),
        maxDiscount: z.number().positive().optional().nullable(),
        validFrom: z.string().optional(),
        validUntil: z.string(),
        usageLimit: z.number().int().positive().optional(),
        isActive: z.boolean().optional(),
      });
      const parsed = schema.parse(req.body);
      const created = await voucherService.createVoucher(parsed as any);
      return reply.status(201).send({
        success: true,
        data: created,
      });
    }
  );

  // 14. PATCH /api/owner/vouchers/:id/toggle
  // Aktifkan / nonaktifkan status voucher
  app.patch(
    '/api/owner/vouchers/:id/toggle',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const schema = z.object({
        isActive: z.boolean(),
      });
      const parsed = schema.parse(req.body);
      const updated = await voucherService.updateVoucher(id, { isActive: parsed.isActive });
      return reply.send({
        success: true,
        data: updated,
      });
    }
  );

  // 15. DELETE /api/owner/vouchers/:id
  // Hapus voucher promo
  app.delete(
    '/api/owner/vouchers/:id',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const result = await voucherService.deleteVoucher(id);
      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // 16. GET /api/owner/transactions
  // Mengambil daftar aktivitas transaksi terklasifikasi per kategori, mitra, booth, dan tanggal
  app.get(
    '/api/owner/transactions',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const query = req.query as {
        category?: string;
        status?: string;
        isTodayOnly?: string;
        dateMode?: 'today' | 'monthly' | 'custom' | 'all';
        selectedDate?: string;
        selectedMonth?: string;
        startDate?: string;
        endDate?: string;
        partnerId?: string;
        kioskId?: string;
        search?: string;
        limit?: string;
        offset?: string;
        page?: string;
      };

      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const page = query.page ? parseInt(query.page, 10) : 1;
      const offset = query.offset ? parseInt(query.offset, 10) : (page - 1) * limit;

      const result = await transactionEngine.getCategorizedTransactions({
        category: query.category,
        status: query.status,
        isTodayOnly: query.isTodayOnly === 'true',
        dateMode: query.dateMode,
        selectedDate: query.selectedDate,
        selectedMonth: query.selectedMonth,
        startDate: query.startDate,
        endDate: query.endDate,
        partnerId: query.partnerId,
        kioskId: query.kioskId,
        search: query.search,
        limit,
        offset,
        page,
      });

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // 17. GET /api/owner/transactions/summary
  // Mengambil ringkasan metrik omzet per kategori transaksi dan filter periode
  app.get(
    '/api/owner/transactions/summary',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const query = req.query as {
        dateMode?: 'today' | 'monthly' | 'custom' | 'all';
        selectedDate?: string;
        selectedMonth?: string;
        startDate?: string;
        endDate?: string;
        partnerId?: string;
        kioskId?: string;
        isTodayOnly?: string;
      };

      const summary = await transactionEngine.getTransactionSummary({
        dateMode: query.dateMode,
        selectedDate: query.selectedDate,
        selectedMonth: query.selectedMonth,
        startDate: query.startDate,
        endDate: query.endDate,
        partnerId: query.partnerId,
        kioskId: query.kioskId,
        isTodayOnly: query.isTodayOnly === 'true',
      });

      return reply.send({
        success: true,
        data: summary,
      });
    }
  );

  // 18. GET /api/owner/transactions/export/csv
  // Mengekspor daftar transaksi terklasifikasi ke CSV sesuai filter periode, mitra, dan booth
  app.get(
    '/api/owner/transactions/export/csv',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const query = req.query as {
        category?: string;
        status?: string;
        isTodayOnly?: string;
        dateMode?: 'today' | 'monthly' | 'custom' | 'all';
        selectedDate?: string;
        selectedMonth?: string;
        startDate?: string;
        endDate?: string;
        partnerId?: string;
        kioskId?: string;
        search?: string;
      };

      const csvContent = await transactionEngine.exportTransactionsCsv({
        category: query.category,
        status: query.status,
        isTodayOnly: query.isTodayOnly === 'true',
        dateMode: query.dateMode,
        selectedDate: query.selectedDate,
        selectedMonth: query.selectedMonth,
        startDate: query.startDate,
        endDate: query.endDate,
        partnerId: query.partnerId,
        kioskId: query.kioskId,
        search: query.search,
      });

      const filename = `transaksi_minja_${new Date().toISOString().slice(0, 10)}.csv`;
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(csvContent);
    }
  );

  // 19. GET /api/owner/network-analytics
  // Analitik finansial jaringan multi-tier (Periode -> Mitra -> Booth)
  app.get(
    '/api/owner/network-analytics',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const query = req.query as {
        period?: string;
        startDate?: string;
        endDate?: string;
        partnerId?: string;
        kioskId?: string;
      };

      const analytics = await ownerService.getNetworkFinancialAnalytics({
        period: query.period,
        startDate: query.startDate,
        endDate: query.endDate,
        partnerId: query.partnerId,
        kioskId: query.kioskId,
      });

      return reply.send({
        success: true,
        data: analytics,
      });
    }
  );

  // 20. GET /api/owner/partners/:id/drilldown
  // Detail master mitra: seluruh booth, paket terkonfigurasi, voucher, kasir, dan ringkasan finansial
  app.get(
    '/api/owner/partners/:id/drilldown',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const drilldown = await ownerService.getPartnerDrilldown(id);
      return reply.send({
        success: true,
        data: drilldown,
      });
    }
  );

  // 21. GET /api/owner/network-sessions
  // Feed sesi foto jaringan terpadu lengkap dengan identitas Mitra, Booth, Kasir, ID Sesi, dsb.
  app.get(
    '/api/owner/network-sessions',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const query = req.query as {
        partnerId?: string;
        kioskId?: string;
        search?: string;
        status?: string;
        page?: string;
        limit?: string;
      };

      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 25;

      const sessions = await ownerService.getNetworkSessions({
        partnerId: query.partnerId,
        kioskId: query.kioskId,
        search: query.search,
        status: query.status,
        page,
        limit,
      });

      return reply.send({
        success: true,
        data: sessions,
      });
    }
  );

  // 22. POST /api/owner/operators/:id/reset-pin
  // Super Admin: Reset PIN Kasir / Operator Mitra
  app.post(
    '/api/owner/operators/:id/reset-pin',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const schema = z.object({
        newPin: z.string().min(4, 'PIN minimal 4 digit angka'),
      });
      const parsed = schema.parse(req.body);

      const result = await ownerService.resetOperatorPin(id, parsed.newPin);
      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // 23. POST /api/owner/kiosks/:id/reset
  // Super Admin: Remote Reset Sesi Berjalan pada Booth Tertentu
  app.post(
    '/api/owner/kiosks/:id/reset',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const result = await ownerService.remoteResetKioskSession(id);
      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // 24. PATCH /api/owner/kiosks/:id/packages
  // Super Admin: Konfigurasi Paket yang Dinonaktifkan per Booth
  app.patch(
    '/api/owner/kiosks/:id/packages',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const schema = z.object({
        disabledPackageIds: z.array(z.string()),
      });
      const parsed = schema.parse(req.body);

      const result = await ownerService.updateKioskPackages(id, parsed.disabledPackageIds);
      return reply.send({
        success: true,
        data: result,
      });
    }
  );
};

