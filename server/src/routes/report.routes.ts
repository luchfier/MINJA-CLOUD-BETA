// src/routes/report.routes.ts
// Route handler untuk Laporan Keuangan, Transaksi & Loket Kasir Tunai
// Sesuai API_CONTRACT.md §3.6 & §3.12

import type { FastifyInstance } from 'fastify';
import { ReportService } from '../services/report.service.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  const reportService = new ReportService(app.prisma);

  /**
   * GET /api/admin/reports/summary
   * Ringkasan pendapatan, sesi, lembar cetak, dan performa booth
   */
  app.get(
    '/api/admin/reports/summary',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const query = request.query as {
        dateMode?: 'today' | 'monthly' | 'custom' | 'all';
        selectedDate?: string;
        selectedMonth?: string;
        startDate?: string;
        endDate?: string;
      };

      const summary = await reportService.getReportsSummary(query);
      sendSuccess(reply, summary);
    }
  );

  /**
   * GET /api/admin/reports/transactions
   * Riwayat transaksi finansial dengan paginasi dan filter tanggal
   */
  app.get(
    '/api/admin/reports/transactions',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        limit?: string;
        dateMode?: 'today' | 'monthly' | 'custom' | 'all';
        selectedDate?: string;
        selectedMonth?: string;
        startDate?: string;
        endDate?: string;
      };

      const result = await reportService.getTransactions({
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 10,
        dateMode: query.dateMode,
        selectedDate: query.selectedDate,
        selectedMonth: query.selectedMonth,
        startDate: query.startDate,
        endDate: query.endDate,
      });

      sendSuccess(reply, result);
    }
  );

  /**
   * GET /api/admin/reports/export/csv
   * Ekspor seluruh transaksi ke file teks CSV
   */
  app.get(
    '/api/admin/reports/export/csv',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const query = request.query as {
        dateMode?: 'today' | 'monthly' | 'custom' | 'all';
        selectedDate?: string;
        selectedMonth?: string;
        startDate?: string;
        endDate?: string;
      };
      const csv = await reportService.exportTransactionsCsv(query);

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="laporan-transaksi-minjaphotobooth.csv"');
      return reply.send(csv);
    }
  );

  /**
   * GET /api/admin/cash/pending & GET /api/cash/pending (Alias)
   * Antrean transaksi tunai yang menunggu konfirmasi pembayaran di loket
   */
  const handleGetPendingCash = async (_request: any, reply: any) => {
    const pending = await reportService.getCashPendingTransactions();
    sendSuccess(reply, pending);
  };
  app.get('/api/admin/cash/pending', { preHandler: [requireAdminAuth] }, handleGetPendingCash);
  app.get('/api/cash/pending', { preHandler: [requireAdminAuth] }, handleGetPendingCash);

  /**
   * GET /api/admin/cash/audit-logs & GET /api/cash/audit-logs (Alias)
   * Catatan audit konfirmasi pembayaran tunai oleh petugas
   */
  const handleGetCashLogs = async (_request: any, reply: any) => {
    const logs = await reportService.getCashAuditLogs();
    sendSuccess(reply, logs);
  };
  app.get('/api/admin/cash/audit-logs', { preHandler: [requireAdminAuth] }, handleGetCashLogs);
  app.get('/api/cash/audit-logs', { preHandler: [requireAdminAuth] }, handleGetCashLogs);
}
