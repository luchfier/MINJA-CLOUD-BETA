// server/src/routes/owner.routes.ts
// REST Endpoint untuk Super Admin / Owner Portal (rich.minja.my.id/owner)

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { OwnerService } from '../services/owner.service.js';
import { VoucherService } from '../services/voucher.service.js';
import { TransactionEngineService } from '../services/transactionEngine.service.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';

export const ownerRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const ownerService = new OwnerService(app.prisma);
  const voucherService = new VoucherService(app.prisma);
  const transactionEngine = new TransactionEngineService(app.prisma);

  // 1. POST /api/owner/actions/resend-email
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

  // 2. PATCH /api/owner/vouchers/:id/toggle
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

  // 3. DELETE /api/owner/vouchers/:id
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

  // 4. GET /api/owner/transactions
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

  // 5. GET /api/owner/transactions/summary
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

  // 6. GET /api/owner/transactions/export/csv
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

  // 7. GET /api/owner/network-analytics
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

  // 8. GET /api/owner/partners/:id/drilldown
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

  // 9. GET /api/owner/network-sessions
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

  // 10. POST /api/owner/operators/:id/reset-pin
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

      const res = await ownerService.resetOperatorPin(id, parsed.newPin);
      return reply.send({
        success: true,
        data: res,
      });
    }
  );

  // 11. POST /api/owner/kiosks/:id/reset
  // Super Admin: Remote Reset Sesi Aktif / Menggantung di Booth
  app.post(
    '/api/owner/kiosks/:id/reset',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const res = await ownerService.remoteResetKioskSession(id);
      return reply.send({
        success: true,
        data: res,
      });
    }
  );

  // 12. PATCH /api/owner/kiosks/:id/packages
  // Super Admin: Konfigurasi Paket Aktif / Nonaktif per Booth
  app.patch(
    '/api/owner/kiosks/:id/packages',
    { preHandler: [requireAdminAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const schema = z.object({
        disabledPackageIds: z.array(z.string()),
      });
      const parsed = schema.parse(req.body);

      const res = await ownerService.updateKioskPackages(id, parsed.disabledPackageIds);
      return reply.send({
        success: true,
        data: res,
      });
    }
  );
};
