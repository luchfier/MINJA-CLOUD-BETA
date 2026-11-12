// src/routes/admin-auth.routes.ts
// Route handler untuk Admin Authentication
// Sesuai API_CONTRACT.md §3.1

import type { FastifyInstance } from 'fastify';
import { AdminAuthService } from '../services/admin-auth.service.js';
import { adminLoginSchema, adminChangePasswordSchema } from '../schemas/admin.schema.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';
import { logAuditEvent } from '../services/audit.service.js';

export async function adminAuthRoutes(app: FastifyInstance): Promise<void> {
  const authService = new AdminAuthService(app.prisma);

  /**
   * POST /api/admin/login
   * Verifikasi Username & Password Super Admin, terbitkan JWT
   */
  app.post('/api/admin/login', async (request, reply) => {
    const body = adminLoginSchema.parse(request.body);
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await authService.login(
      {
        username: body.username,
        password: body.password || body.pin,
      },
      ip,
      userAgent
    );
    sendSuccess(reply, result);
  });

  /**
   * POST /api/admin/logout
   * Logout admin & catat audit log
   */
  app.post(
    '/api/admin/logout',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const adminId = request.admin?.sub;
      await logAuditEvent(app.prisma, {
        action: 'ADMIN_LOGOUT',
        adminId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      sendSuccess(reply, { message: 'Logout berhasil' });
    }
  );

  /**
   * GET /api/admin/me
   * Profil admin yang sedang login
   */
  app.get(
    '/api/admin/me',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const adminId = request.admin!.sub;
      const profile = await authService.getMe(adminId);
      sendSuccess(reply, profile);
    }
  );

  /**
   * Handler Ubah Password Super Admin
   */
  const handleChangePassword = async (request: any, reply: any) => {
    const body = adminChangePasswordSchema.parse(request.body);
    const adminId = request.admin!.sub;
    const currentPass = body.currentPassword || body.currentPin || '';
    const newPass = body.newPassword || body.newPin || '';

    const result = await authService.changePassword(
      adminId,
      currentPass,
      newPass,
      request.ip
    );
    sendSuccess(reply, result);
  };

  app.put('/api/admin/password', { preHandler: [requireAdminAuth] }, handleChangePassword);
  app.put('/api/admin/pin', { preHandler: [requireAdminAuth] }, handleChangePassword);
  app.post('/api/admin/change-pin', { preHandler: [requireAdminAuth] }, handleChangePassword);
}
