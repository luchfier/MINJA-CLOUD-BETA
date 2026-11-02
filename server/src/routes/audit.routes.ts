// src/routes/audit.routes.ts
// Route handler untuk Audit Log Admin
// Sesuai API_CONTRACT.md §3.13

import type { FastifyInstance } from 'fastify';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/admin/audit-log
   * Mengambil riwayat catatan audit aktivitas admin
   */
  app.get(
    '/api/admin/audit-log',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        limit?: string;
        action?: string;
        startDate?: string;
        endDate?: string;
      };

      const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
      const limit = query.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query.action) {
        where.action = query.action;
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) {
          where.createdAt.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.createdAt.lte = new Date(query.endDate);
        }
      }

      const [logs, total] = await Promise.all([
        app.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        app.prisma.auditLog.count({ where }),
      ]);

      const items = logs.map((log) => ({
        id: log.id,
        action: log.action,
        details: (log.details as Record<string, unknown>) ?? {},
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      }));

      sendSuccess(reply, {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }
  );
}
