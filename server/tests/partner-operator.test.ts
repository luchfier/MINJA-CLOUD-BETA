// tests/partner-operator.test.ts
// Integration test suite for Partner Session, Operator Desk, and Kiosk Activation ("No API Key No Service")

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

process.env['DATABASE_URL'] = process.env['DATABASE_URL'] || 'postgresql://localhost:5432/minjaphotobooth';
process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars-long';
process.env['BOOTH_API_KEY'] = 'test-booth-key';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

let app: FastifyInstance;
let adminToken: string;
let createdPartnerId: string;
let partnerToken: string;
let createdOperatorId: string;
let operatorToken: string;
let createdPassCodeId: string;

describe('Partner Session & Operator Desk Integration Tests', () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login admin to obtain JWT
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { pin: '123456' },
    });
    const loginBody = JSON.parse(loginRes.body);
    adminToken = loginBody.data?.token || '';
  });

  afterAll(async () => {
    // Cleanup generated test data in order
    try {
      if (createdPassCodeId) {
        await app.prisma.accessCode.deleteMany({ where: { id: createdPassCodeId } });
      }
      if (createdOperatorId) {
        await app.prisma.operator.deleteMany({ where: { id: createdOperatorId } });
      }
      if (createdPartnerId) {
        await app.prisma.partner.deleteMany({ where: { id: createdPartnerId } });
      }
    } catch {}
    await app.close();
  });

  // 1. KIOSK ACTIVATION STATUS
  describe('Kiosk Activation ("No API Key No Service")', () => {
    it('GET /api/kiosk/activation-status returns isActivated boolean and kiosk identity', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/kiosk/activation-status',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(typeof body.data.isActivated).toBe('boolean');
    });

    it('POST /api/kiosk/activate rejects empty or invalid API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/kiosk/activate',
        payload: { apiKey: 'mja_invalid_key_xyz' },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // 2. SUPER ADMIN PARTNER MANAGEMENT
  describe('Super Admin Partner Management', () => {
    it('POST /api/owner/partners creates a new partner with hashed password', async () => {
      const testEmail = `test_partner_${Date.now()}@minja.test`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/owner/partners',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'PT Mitra Sukses Bersama',
          email: testEmail,
          password: 'PartnerSecurePassword123!',
          phone: '081299887766',
          revenueSharePct: 35,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('PT Mitra Sukses Bersama');
      expect(body.data.email).toBe(testEmail);
      expect(body.data.revenueSharePct).toBe(35);
      expect(body.data.passwordHash).toBeUndefined(); // Password hash must never leak!
      createdPartnerId = body.data.id;
    });

    it('GET /api/owner/partners lists all partners', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/owner/partners',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      const found = body.data.find((p: any) => p.id === createdPartnerId);
      expect(found).toBeDefined();
    });
  });

  // 3. PARTNER AUTH & OPERATIONS
  describe('Partner Portal Authentication & Kiosk Telemetry', () => {
    it('POST /api/partner/auth/login authenticates partner with correct credentials', async () => {
      // Find partner email from DB
      const partner = await app.prisma.partner.findUnique({ where: { id: createdPartnerId } });
      expect(partner).toBeDefined();

      const res = await app.inject({
        method: 'POST',
        url: '/api/partner/auth/login',
        payload: {
          email: partner!.email,
          password: 'PartnerSecurePassword123!',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.partner.id).toBe(createdPartnerId);
      partnerToken = body.data.token;
    });

    it('POST /api/partner/auth/login rejects wrong password with 401', async () => {
      const partner = await app.prisma.partner.findUnique({ where: { id: createdPartnerId } });
      const res = await app.inject({
        method: 'POST',
        url: '/api/partner/auth/login',
        payload: {
          email: partner!.email,
          password: 'WrongPassword!',
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/partner/me returns authenticated partner profile', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/partner/me',
        headers: { authorization: `Bearer ${partnerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(createdPartnerId);
      expect(body.data.name).toBe('PT Mitra Sukses Bersama');
    });

    it('GET /api/partner/analytics returns partner financial summary', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/partner/analytics',
        headers: { authorization: `Bearer ${partnerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(typeof body.data.todayRevenue).toBe('number');
      expect(typeof body.data.monthRevenue).toBe('number');
      expect(typeof body.data.shareAmount).toBe('number');
    });

    it('POST /api/partner/auth/change-password validates input and changes partner password', async () => {
      // 1. Wrong current password -> 401
      const wrongCurrentRes = await app.inject({
        method: 'POST',
        url: '/api/partner/auth/change-password',
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          currentPassword: 'WrongPassword',
          newPassword: 'BrandNewPassword123!',
        },
      });
      expect(wrongCurrentRes.statusCode).toBe(401);

      // 2. Too short new password -> 400
      const shortPassRes = await app.inject({
        method: 'POST',
        url: '/api/partner/auth/change-password',
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          currentPassword: 'PartnerSecurePassword123!',
          newPassword: '123',
        },
      });
      expect(shortPassRes.statusCode).toBe(400);

      // 3. Valid change -> 200
      const successRes = await app.inject({
        method: 'POST',
        url: '/api/partner/auth/change-password',
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          currentPassword: 'PartnerSecurePassword123!',
          newPassword: 'BrandNewPassword123!',
        },
      });
      expect(successRes.statusCode).toBe(200);

      // 4. Login with old password fails
      const partner = await app.prisma.partner.findUnique({ where: { id: createdPartnerId } });
      const oldLoginRes = await app.inject({
        method: 'POST',
        url: '/api/partner/auth/login',
        payload: {
          email: partner!.email,
          password: 'PartnerSecurePassword123!',
        },
      });
      expect(oldLoginRes.statusCode).toBe(401);

      // 5. Login with new password succeeds
      const newLoginRes = await app.inject({
        method: 'POST',
        url: '/api/partner/auth/login',
        payload: {
          email: partner!.email,
          password: 'BrandNewPassword123!',
        },
      });
      expect(newLoginRes.statusCode).toBe(200);
      partnerToken = JSON.parse(newLoginRes.body).data.token;
    });
  });

  // 4. PARTNER CREATES OPERATOR
  describe('Partner Creates Operator & Operator Authentication', () => {
    const testUsername = `op_${Date.now()}`;

    it('POST /api/partner/operators creates an operator under partner account', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/partner/operators',
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          name: 'Rian Kasir Lapangan',
          username: testUsername,
          pin: '8899',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Rian Kasir Lapangan');
      expect(body.data.username).toBe(testUsername);
      expect(body.data.pinHash).toBeUndefined(); // PIN hash must never leak
      createdOperatorId = body.data.id;
    });

    it('POST /api/operator/auth/login authenticates operator using username and 4-digit PIN', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/operator/auth/login',
        payload: {
          username: testUsername,
          pin: '8899',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.operator.name).toBe('Rian Kasir Lapangan');
      operatorToken = body.data.token;
    });

    it('POST /api/operator/auth/login rejects invalid PIN with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/operator/auth/login',
        payload: {
          username: testUsername,
          pin: '0000',
        },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // 5. OPERATOR FIELD ACTIONS: PASS CODE & REPRINT
  describe('Operator Cash Desk & Emergency Reprint', () => {
    it('POST /api/operator/pass-code generates a valid PASS-XXXX cash code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/operator/pass-code',
        headers: { authorization: `Bearer ${operatorToken}` },
        payload: {
          amount: 35000,
          customerNote: 'Pelanggan Meja 4',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.code).toMatch(/^PASS-[A-Z0-9]{4,6}$/);
      expect(body.data.amount).toBe(35000);
      expect(body.data.status).toBe('ACTIVE');
      createdPassCodeId = body.data.id;
    });

    it('GET /api/operator/recent-sessions returns recent sessions for emergency reprint', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/operator/recent-sessions?limit=5',
        headers: { authorization: `Bearer ${operatorToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('POST /api/operator/generate-pass generates EXTRA_PRINT pass', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/operator/generate-pass',
        headers: { authorization: `Bearer ${operatorToken}` },
        payload: {
          type: 'EXTRA_PRINT',
          extraPrints: 2,
          customerNote: 'Minta cetak 2 lembar ekstra untuk teman',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.type).toBe('EXTRA_PRINT');
      expect(body.data.extraPrints).toBe(2);
      expect(body.data.amount).toBe(30000); // 2 * 15000
    });

    it('GET /api/operator/my-passes returns list of passes with cashier notes and statuses', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/operator/my-passes',
        headers: { authorization: `Bearer ${operatorToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].code).toBeDefined();
    });

    it('GET /api/partner/passes allows Mitra to audit operator passes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/partner/passes',
        headers: { authorization: `Bearer ${partnerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('Mitra Full PASS Management: Issue, Extend, Revoke, and Delete', async () => {
      // 1. Mitra issues new PASS
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/partner/passes',
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          type: 'SESSION',
          amount: 50000,
          customerNote: 'VVIP Mitra Customer',
          expiresInHours: 24,
        },
      });
      expect(createRes.statusCode).toBe(201);
      const createdBody = JSON.parse(createRes.body);
      expect(createdBody.success).toBe(true);
      const testPassId = createdBody.data.id;
      const testPassCode = createdBody.data.code;
      expect(testPassCode).toMatch(/^PASS-/);

      // 2. Mitra extends pass expiration
      const extendRes = await app.inject({
        method: 'PATCH',
        url: `/api/partner/passes/${testPassId}/extend`,
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: { hours: 48 },
      });
      expect(extendRes.statusCode).toBe(200);
      const extendBody = JSON.parse(extendRes.body);
      expect(extendBody.success).toBe(true);
      expect(extendBody.data.status).toBe('ACTIVE');

      // 3. Mitra revokes pass
      const revokeRes = await app.inject({
        method: 'PATCH',
        url: `/api/partner/passes/${testPassId}/revoke`,
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: { reason: 'Customer requested refund' },
      });
      expect(revokeRes.statusCode).toBe(200);
      const revokeBody = JSON.parse(revokeRes.body);
      expect(revokeBody.success).toBe(true);
      expect(revokeBody.data.status).toBe('REVOKED');

      // 4. Mitra deletes revoked pass
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/partner/passes/${testPassId}`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(deleteRes.statusCode).toBe(200);
      const deleteBody = JSON.parse(deleteRes.body);
      expect(deleteBody.success).toBe(true);
      expect(deleteBody.data.passId).toBe(testPassId);
    });

    it('PATCH /api/owner/partners/:id allows Super Admin to update partner details and thermal receipt info', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/owner/partners/${createdPartnerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'PT Mitra Sukses Bersama (Cabang Utama)',
          receiptHeader: 'MINJA PHOTOBOOTH - PONDOK INDAH',
          receiptFooter: 'Terima kasih telah berfoto bersama kami!',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('PT Mitra Sukses Bersama (Cabang Utama)');
      expect(body.data.receiptHeader).toBe('MINJA PHOTOBOOTH - PONDOK INDAH');
    });

    it('DELETE /api/partner/operators/:id permanently deletes an operator with 0 transactions', async () => {
      // Create a temporary operator without transactions
      const tempOpRes = await app.inject({
        method: 'POST',
        url: '/api/partner/operators',
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          name: 'Kasir Sementara',
          username: `temp_${Date.now()}`,
          pin: '1234',
        },
      });
      const tempOpId = JSON.parse(tempOpRes.body).data.id;

      // Delete it
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/partner/operators/${tempOpId}`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });

      expect(deleteRes.statusCode).toBe(200);
      const deleteBody = JSON.parse(deleteRes.body);
      expect(deleteBody.success).toBe(true);
      expect(deleteBody.data.action).toBe('deleted');
    });

    it('DELETE /api/partner/operators/:id soft-deactivates operator with transactions for audit safety', async () => {
      // createdOperatorId has created passes in previous tests
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/partner/operators/${createdOperatorId}`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });

      expect(deleteRes.statusCode).toBe(200);
      const deleteBody = JSON.parse(deleteRes.body);
      expect(deleteBody.success).toBe(true);
      expect(deleteBody.data.action).toBe('deactivated');
    });

    it('POST /api/payments/redeem-extra-print-code validates and redeems EXTRA_PRINT pass on session', async () => {
      // 1. Dapatkan paket aktif
      let activePackage = await app.prisma.package.findFirst({ where: { isActive: true } });
      if (!activePackage) {
        activePackage = await app.prisma.package.create({
          data: {
            name: 'Paket Extra Print Test',
            price: 25000,
            duration: 180,
            photoLimit: 4,
            printCopies: 1,
            extraPrintPrice: 10000,
            isActive: true,
          },
        });
      }

      // 2. Operator generate pass EXTRA_PRINT
      const passRes = await app.inject({
        method: 'POST',
        url: '/api/operator/generate-pass',
        headers: { authorization: `Bearer ${operatorToken}` },
        payload: {
          type: 'EXTRA_PRINT',
          extraPrints: 2,
          amount: 20000,
          customerNote: 'Customer Tambah Cetak',
        },
      });
      expect(passRes.statusCode).toBe(201);
      const passData = JSON.parse(passRes.body).data;
      const extraPrintCode = passData.code;

      // 3. Buat sesi di kiosk
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': 'test-booth-key' },
        payload: { packageId: activePackage.id },
      });
      const sessionData = JSON.parse(sessionRes.body).data;
      const sessionId = sessionData.id;

      // 4. Tebus kode tiket extra print
      const redeemRes = await app.inject({
        method: 'POST',
        url: '/api/payments/redeem-extra-print-code',
        headers: { 'x-booth-key': 'test-booth-key' },
        payload: {
          sessionId,
          code: extraPrintCode,
          requiredPrints: 2,
        },
      });
      expect(redeemRes.statusCode).toBe(200);
      const redeemBody = JSON.parse(redeemRes.body);
      expect(redeemBody.success).toBe(true);
      expect(redeemBody.data.session.additionalPrints).toBe(2);

      // Cleanup
      await app.prisma.payment.deleteMany({ where: { sessionId } });
      await app.prisma.accessCode.deleteMany({ where: { code: extraPrintCode } });
      await app.prisma.session.deleteMany({ where: { id: sessionId } });
    });
  });
});

