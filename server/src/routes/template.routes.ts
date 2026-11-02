// src/routes/template.routes.ts
// Route handler untuk Template Foto Cetak Studio
// Sesuai API_CONTRACT.md §3.4

import type { FastifyInstance } from 'fastify';
import { TemplateService } from '../services/template.service.js';
import { createTemplateSchema, updateTemplateSchema } from '../schemas/template.schema.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function templateRoutes(app: FastifyInstance): Promise<void> {
  const templateService = new TemplateService(app.prisma);

  /**
   * GET /api/public/templates & GET /api/templates
   * Daftar template aktif untuk booth/pelanggan
   */
  const handleGetActive = async (_request: any, reply: any) => {
    const templates = await templateService.getActiveTemplates();
    sendSuccess(reply, templates);
  };

  app.get('/api/public/templates', handleGetActive);
  app.get('/api/templates', handleGetActive);

  /**
   * GET /api/admin/templates
   * Seluruh template untuk admin dengan paginasi
   */
  app.get(
    '/api/admin/templates',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string };
      const page = query.page && !isNaN(parseInt(query.page, 10)) ? Math.max(1, parseInt(query.page, 10)) : 1;
      const limit = query.limit && !isNaN(parseInt(query.limit, 10)) ? Math.max(1, parseInt(query.limit, 10)) : 100;

      const result = await templateService.getAllTemplates(page, limit);
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/admin/templates
   * Membuat template baru
   */
  app.post(
    '/api/admin/templates',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const body = createTemplateSchema.parse(request.body);
      const adminId = request.admin?.sub;

      const created = await templateService.createTemplate(
        body,
        adminId,
        request.ip
      );
      sendSuccess(reply, created, 201);
    }
  );

  /**
   * PUT /api/admin/templates/:id
   * Memperbarui template
   */
  app.put(
    '/api/admin/templates/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateTemplateSchema.parse(request.body);
      const adminId = request.admin?.sub;

      const updated = await templateService.updateTemplate(
        id,
        body,
        adminId,
        request.ip
      );
      sendSuccess(reply, updated);
    }
  );

  /**
   * DELETE /api/admin/templates/:id
   * Menonaktifkan template (soft delete)
   */
  app.delete(
    '/api/admin/templates/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const adminId = request.admin?.sub;

      const result = await templateService.deleteTemplate(
        id,
        adminId,
        request.ip
      );
      sendSuccess(reply, result);
    }
  );
}
