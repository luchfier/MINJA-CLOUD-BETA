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
      // Re-aktifkan operator untuk pengujian
      await app.prisma.operator.update({
        where: { id: createdOperatorId },
        data: { isActive: true },
      });

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

      // Buat booth resmi terikat mitra untuk pengujian penebusan kode tiket di gerai mitra
      const testBooth = await app.prisma.kiosk.create({
        data: {
          code: 'MJA-01',
          name: 'Test Kiosk MJA-01',
          location: 'Grand Indonesia',
          apiKey: 'test-booth-key',
          partnerId: createdPartnerId,
          status: 'ONLINE',
        },
      });

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

      // 5. Verifikasi Isolasi: jika booth dilepas dari partner (partnerId null), kode tiket mitra WAJIB DITOLAK (403)
      await app.prisma.kiosk.updateMany({
        where: { code: 'MJA-01' },
        data: { partnerId: null },
      });

      // Buat tiket baru untuk uji isolasi
      const unassignedPassRes = await app.inject({
        method: 'POST',
        url: '/api/operator/generate-pass',
        headers: { authorization: `Bearer ${operatorToken}` },
        payload: {
          type: 'EXTRA_PRINT',
          extraPrints: 1,
          amount: 10000,
        },
      });
      const unassignedPassCode = JSON.parse(unassignedPassRes.body).data.code;

      const rejectRes = await app.inject({
        method: 'POST',
        url: '/api/payments/redeem-extra-print-code',
        headers: { 'x-booth-key': 'test-booth-key' },
        payload: {
          sessionId,
          code: unassignedPassCode,
          requiredPrints: 1,
        },
      });
      expect(rejectRes.statusCode).toBe(403);

      // Cleanup
      await app.prisma.payment.deleteMany({ where: { sessionId } });
      await app.prisma.accessCode.deleteMany({ where: { code: { in: [extraPrintCode, unassignedPassCode] } } });
      await app.prisma.session.deleteMany({ where: { id: sessionId } });
      await app.prisma.kiosk.deleteMany({ where: { id: testBooth.id } });
    });

    it('POST /api/partner/passes allows creating SESSION pass with extraPrints: 0', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/partner/passes',
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          type: 'SESSION',
          extraPrints: 0,
          amount: 35000,
          customerNote: 'Test Session Zero Extra Prints',
          expiresInHours: 24,
        },
      });
      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body).data;
      expect(data.code).toMatch(/^PASS-/);

      // Cleanup
      await app.prisma.accessCode.deleteMany({ where: { id: data.id } });
    });

    it('POST /api/partner/kiosks/:id/bypass executes remote bypass successfully and excludes test bypass from revenue', async () => {
      // Buat kiosk dummy milik partner
      const testKiosk = await app.prisma.kiosk.create({
        data: {
          code: `BYP-${Date.now().toString().slice(-4)}`,
          name: 'Booth Bypass Test',
          location: 'Mall Grand Indonesia',
          partnerId: createdPartnerId,
          status: 'ONLINE',
          apiKey: `test-bypass-key-${Date.now()}`,
        },
      });

      // 1. Uji saat tidak ada sesi aktif: sistem menerbitkan PASS bypass gratis Rp 0
      const bypassPassRes = await app.inject({
        method: 'POST',
        url: `/api/partner/kiosks/${testKiosk.id}/bypass`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(bypassPassRes.statusCode).toBe(200);
      const passBody = JSON.parse(bypassPassRes.body);
      expect(passBody.success).toBe(true);
      expect(passBody.data.mode).toBe('PASS_CODE_GENERATED');
      expect(passBody.data.passCode).toMatch(/^PASS-/);

      // 2. Buat sesi aktif yang sedang menunggu pembayaran di booth ini
      const activePackage = await app.prisma.package.findFirst({ where: { isActive: true } });
      const testSession = await app.prisma.session.create({
        data: {
          id: `BYP01-${Date.now().toString().slice(-6)}`,
          packageId: activePackage!.id,
          kioskId: testKiosk.id,
          state: 'AWAITING_PAYMENT',
          basePrice: 35000,
          totalPrice: 35000,
          maxShots: 6,
          maxSelections: 2,
          totalPrints: 2,
          durationSeconds: 120,
          expiresAt: new Date(Date.now() + 600000),
          payments: {
            create: {
              orderId: `ORD-BYP-${Date.now()}`,
              grossAmount: 35000,
              paymentType: 'qris',
              transactionStatus: 'pending',
              expiryTime: new Date(Date.now() + 600000),
            },
          },
        },
      });

      // 3. Eksekusi bypass saat sesi sedang di layar pembayaran
      const bypassSessionRes = await app.inject({
        method: 'POST',
        url: `/api/partner/kiosks/${testKiosk.id}/bypass`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(bypassSessionRes.statusCode).toBe(200);
      const sessionBody = JSON.parse(bypassSessionRes.body);
      expect(sessionBody.success).toBe(true);
      expect(sessionBody.data.mode).toBe('SESSION_BYPASS');

      // Verifikasi sesi di database diubah menjadi PAYMENT_CONFIRMED dengan totalPrice Rp 0
      const updatedDbSession = await app.prisma.session.findUnique({
        where: { id: testSession.id },
        include: { payments: true },
      });
      expect(updatedDbSession?.state).toBe('PAYMENT_CONFIRMED');
      expect(updatedDbSession?.totalPrice).toBe(0);
      expect(updatedDbSession?.payments[0]?.grossAmount).toBe(0);
      expect(updatedDbSession?.payments[0]?.paymentType).toBe('TEST_BYPASS');
      expect(updatedDbSession?.payments[0]?.transactionStatus).toBe('settlement');
      expect(updatedDbSession?.payments[0]?.isVerified).toBe(true);

      // 4. Verifikasi laporan keuangan Mitra: sesi bypass TIDAK BOLEH masuk ke total omzet / pemasukan
      const analyticsRes = await app.inject({
        method: 'GET',
        url: `/api/partner/financial-analytics?kioskId=${testKiosk.id}&period=all`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(analyticsRes.statusCode).toBe(200);
      const analyticsData = JSON.parse(analyticsRes.body).data;
      expect(analyticsData.summary.totalGrossRevenue).toBe(0);
      expect(analyticsData.summary.partnerShare).toBe(0);
      expect(analyticsData.summary.totalSessions).toBe(0); // Mode test tidak dihitung sesi komersial
      expect(analyticsData.breakdown.qris.totalAmount).toBe(0);

      // 5. Verifikasi daftar transaksi menampilkan status 'Bypass (Mode Test)' dengan gross Rp 0
      const txRes = await app.inject({
        method: 'GET',
        url: `/api/partner/transactions?kioskId=${testKiosk.id}&period=all`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(txRes.statusCode).toBe(200);
      const txItems = JSON.parse(txRes.body).data.items;
      expect(txItems.length).toBe(1);
      expect(txItems[0].grossAmount).toBe(0);
      expect(txItems[0].partnerShare).toBe(0);
      expect(txItems[0].paymentMethod).toBe('Bypass (Mode Test)');
      expect(txItems[0].isTest).toBe(true);

      // Cleanup
      await app.prisma.payment.deleteMany({ where: { sessionId: testSession.id } });
      await app.prisma.session.delete({ where: { id: testSession.id } });
      await app.prisma.accessCode.deleteMany({ where: { code: passBody.data.passCode } });
      await app.prisma.kiosk.delete({ where: { id: testKiosk.id } });
    });

    it('Partner Paper Tracking: Optional, OFF by default, decrements on completeSession only when ON', async () => {
      const apiKey = `test-paper-booth-${Date.now()}`;
      const paperKiosk = await app.prisma.kiosk.create({
        data: {
          code: `PPR-${Date.now().toString().slice(-4)}`,
          name: 'Paper Tracking Test Booth',
          location: 'Central Park Mall',
          partnerId: createdPartnerId,
          status: 'ONLINE',
          apiKey,
          paperRemaining: 400,
          paperRollCapacity: 400,
        },
      });

      // 1. Verifikasi booth milik partner memiliki paperTrackingEnabled: false (OFF by default)
      const myKiosksRes = await app.inject({
        method: 'GET',
        url: '/api/partner/my-kiosks',
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(myKiosksRes.statusCode).toBe(200);
      const myKiosks = JSON.parse(myKiosksRes.body).data;
      const foundKiosk = myKiosks.find((k: any) => k.id === paperKiosk.id);
      expect(foundKiosk).toBeDefined();
      expect(foundKiosk.paperTrackingEnabled).toBe(false);

      // Dapatkan 1 paket aktif
      const pkg = await app.prisma.package.findFirst({ where: { isActive: true } });
      expect(pkg).toBeDefined();

      // 2. Buat sesi dan selesaikan saat tracking OFF
      const s1Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': apiKey },
        payload: { packageId: pkg!.id },
      });
      expect(s1Res.statusCode).toBe(201);
      const s1Id = JSON.parse(s1Res.body).data.id;

      // Selesaikan sesi dengan 2 lembar cetak
      const c1Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${s1Id}/complete`,
        headers: { 'x-booth-key': apiKey },
        payload: {
          shotsTaken: 2,
          photosSelected: 2,
          photosPrinted: 2,
        },
      });
      expect(c1Res.statusCode).toBe(200);

      // Verifikasi sisa kertas TIDAK BERKURANG karena tracking OFF
      let checkKiosk = await app.prisma.kiosk.findUnique({ where: { id: paperKiosk.id } });
      expect(checkKiosk?.paperRemaining).toBe(400);

      // 3. Partner AKTIFKAN pelacakan kertas manual (toggle ON)
      const toggleOnRes = await app.inject({
        method: 'POST',
        url: `/api/partner/kiosks/${paperKiosk.id}/paper`,
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          paperRemaining: 400,
          paperTrackingEnabled: true,
        },
      });
      expect(toggleOnRes.statusCode).toBe(200);
      expect(JSON.parse(toggleOnRes.body).data.paperTrackingEnabled).toBe(true);

      // 4. Buat sesi baru dan selesaikan saat tracking ON
      const s2Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': apiKey },
        payload: { packageId: pkg!.id },
      });
      expect(s2Res.statusCode).toBe(201);
      const s2Id = JSON.parse(s2Res.body).data.id;

      // Selesaikan sesi dengan 3 lembar cetak
      const c2Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${s2Id}/complete`,
        headers: { 'x-booth-key': apiKey },
        payload: {
          shotsTaken: 3,
          photosSelected: 3,
          photosPrinted: 3,
        },
      });
      expect(c2Res.statusCode).toBe(200);

      // Verifikasi sisa kertas BERKURANG 3 lembar (400 - 3 = 397)
      checkKiosk = await app.prisma.kiosk.findUnique({ where: { id: paperKiosk.id } });
      expect(checkKiosk?.paperRemaining).toBe(397);

      // 5. Partner NONAKTIFKAN kembali (toggle OFF)
      const toggleOffRes = await app.inject({
        method: 'PUT',
        url: `/api/partner/kiosks/${paperKiosk.id}/paper`,
        headers: { authorization: `Bearer ${partnerToken}` },
        payload: {
          paperTrackingEnabled: false,
        },
      });
      expect(toggleOffRes.statusCode).toBe(200);
      expect(JSON.parse(toggleOffRes.body).data.paperTrackingEnabled).toBe(false);

      // 6. Buat sesi lagi: sisa kertas harus tetap 397 (tidak berkurang lagi)
      const s3Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': apiKey },
        payload: { packageId: pkg!.id },
      });
      const s3Id = JSON.parse(s3Res.body).data.id;

      await app.inject({
        method: 'POST',
        url: `/api/sessions/${s3Id}/complete`,
        headers: { 'x-booth-key': apiKey },
        payload: {
          shotsTaken: 2,
          photosSelected: 2,
          photosPrinted: 2,
        },
      });

      checkKiosk = await app.prisma.kiosk.findUnique({ where: { id: paperKiosk.id } });
      expect(checkKiosk?.paperRemaining).toBe(397);

      // Cleanup
      await app.prisma.session.deleteMany({ where: { kioskId: paperKiosk.id } });
      await app.prisma.kiosk.delete({ where: { id: paperKiosk.id } });
    });
  });

  // 10. PARTNER FINANCIAL REPORTS & STRICT MULTI-TENANT ISOLATION
  describe('Partner Financial Reports & Multi-Tenant Route Isolation', () => {
    it('guarantees per-partner route isolation: Partner cannot access other partner kiosk and financial data is strictly separated', async () => {
      // 1. Buat Partner B mandiri
      const partnerBEmail = `partner_b_${Date.now()}@minja.test`;
      const pBRes = await app.inject({
        method: 'POST',
        url: '/api/owner/partners',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Mitra Cabang Bali',
          email: partnerBEmail,
          password: 'PartnerBSecret123!',
          phone: '081234567899',
          revenueSharePct: 40,
        },
      });
      expect(pBRes.statusCode).toBe(201);
      const partnerBId = JSON.parse(pBRes.body).data.id;

      // Login Partner B
      const pBLogin = await app.inject({
        method: 'POST',
        url: '/api/partner/login',
        payload: { email: partnerBEmail, password: 'PartnerBSecret123!' },
      });
      expect(pBLogin.statusCode).toBe(200);
      const partnerBToken = JSON.parse(pBLogin.body).data.token;

      // 2. Buat Kiosk untuk Partner B
      const kioskBPrefix = `KB${Date.now().toString().slice(-4)}`;
      const kBRes = await app.inject({
        method: 'POST',
        url: '/api/owner/kiosks',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          code: kioskBPrefix,
          name: 'Booth Kuta Bali',
          location: 'Beachwalk Bali',
          partnerId: partnerBId,
        },
      });
      expect(kBRes.statusCode).toBe(201);
      const kioskB = JSON.parse(kBRes.body).data;
      const kioskBApiKey = kioskB.apiKey;

      // 3. UJI ISOLASI: Partner A mencoba mengakses laporan keuangan Kiosk B punya Partner B -> Harus 403 Forbidden!
      const illegalAnalyticsRes = await app.inject({
        method: 'GET',
        url: `/api/partner/financial-analytics?kioskId=${kioskB.id}`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(illegalAnalyticsRes.statusCode).toBe(403);

      const illegalTxRes = await app.inject({
        method: 'GET',
        url: `/api/partner/transactions?kioskId=${kioskB.id}`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(illegalTxRes.statusCode).toBe(403);

      // 4. UJI SINKRONISASI KEUANGAN: Buat sesi komersial di Kiosk B
      const pkg = await app.prisma.package.findFirst({ where: { isActive: true } });
      const sessRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': kioskBApiKey },
        payload: { packageId: pkg!.id },
      });
      expect(sessRes.statusCode).toBe(201);
      const sessId = JSON.parse(sessRes.body).data.id;

      // Buat pembayaran lunas settlement
      await app.prisma.payment.create({
        data: {
          orderId: `ORDER-${sessId}`,
          sessionId: sessId,
          grossAmount: pkg!.price,
          paymentType: 'qris',
          transactionStatus: 'settlement',
          expiryTime: new Date(Date.now() + 15 * 60 * 1000),
          settlementTime: new Date(),
        },
      });

      // 5. Verifikasi Partner B melihat omzet sesi tersebut di laporan Hari Ini (WIB)
      const pBAnalyticsRes = await app.inject({
        method: 'GET',
        url: `/api/partner/financial-analytics?period=today`,
        headers: { authorization: `Bearer ${partnerBToken}` },
      });
      expect(pBAnalyticsRes.statusCode).toBe(200);
      const pBAnalytics = JSON.parse(pBAnalyticsRes.body).data;
      expect(pBAnalytics.summary.grossRevenue).toBeGreaterThanOrEqual(pkg!.price);
      expect(pBAnalytics.todayRevenue).toBeGreaterThanOrEqual(pkg!.price);
      expect(pBAnalytics.breakdown.qris.totalAmount).toBeGreaterThanOrEqual(pkg!.price);

      // 6. Verifikasi Partner B melihat transaksi dengan status "Lunas" di /api/partner/transactions
      const pBTxRes = await app.inject({
        method: 'GET',
        url: `/api/partner/transactions?period=today`,
        headers: { authorization: `Bearer ${partnerBToken}` },
      });
      expect(pBTxRes.statusCode).toBe(200);
      const pBTx = JSON.parse(pBTxRes.body).data;
      expect(pBTx.items.length).toBeGreaterThanOrEqual(1);
      const targetItem = pBTx.items.find((it: any) => it.id === sessId);
      expect(targetItem).toBeDefined();
      expect(targetItem.statusLabel).toBe('Lunas');
      expect(targetItem.kioskCode).toBe(kioskBPrefix);

      // 7. Verifikasi Partner A TIDAK melihat omzet Partner B (Laporan Partner A tetap terisolasi dan tidak bocor!)
      const pAAnalyticsRes = await app.inject({
        method: 'GET',
        url: `/api/partner/financial-analytics?period=today`,
        headers: { authorization: `Bearer ${partnerToken}` },
      });
      expect(pAAnalyticsRes.statusCode).toBe(200);
      const pAAnalytics = JSON.parse(pAAnalyticsRes.body).data;
      // Kiosk B tidak boleh ada di list kiosks partner A
      const leakedKiosk = pAAnalytics.kiosks.find((k: any) => k.id === kioskB.id);
      expect(leakedKiosk).toBeUndefined();

      // Cleanup
      await app.prisma.payment.deleteMany({ where: { sessionId: sessId } });
      await app.prisma.session.deleteMany({ where: { id: sessId } });
      await app.prisma.kiosk.delete({ where: { id: kioskB.id } });
      await app.prisma.partner.delete({ where: { id: partnerBId } });
    });
  });
});

