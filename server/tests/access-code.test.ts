import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Access Codes & Voucher Management API Suite', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let testPackageId: string;
  let createdCodeId: string;
  let createdRawCode: string;
  let createdVoucherId: string;
  const boothKey = 'test-booth-key';

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
    ownerToken = loginBody.data?.token || '';

    // Pastikan ada package untuk pengujian
    const pkg = await (app as any).prisma.package.findFirst({ where: { isActive: true } });
    if (pkg) {
      testPackageId = pkg.id;
    } else {
      const newPkg = await (app as any).prisma.package.create({
        data: {
          name: 'Paket Uji Coba Passcode',
          price: 35000,
          durationSeconds: 120,
          photoLimit: 6,
          printCopies: 1,
          extraPrintPrice: 10000,
          isActive: true,
        },
      });
      testPackageId = newPkg.id;
    }
  });

  afterAll(async () => {
    // Bersihkan data uji jika perlu
    if (createdCodeId) {
      await (app as any).prisma.accessCode.deleteMany({ where: { id: createdCodeId } }).catch(() => { });
    }
    if (createdVoucherId) {
      await (app as any).prisma.voucher.deleteMany({ where: { id: createdVoucherId } }).catch(() => { });
    }
    await app.close();
  });

  describe('1. Owner Access Code Endpoints (/api/owner/access-codes)', () => {
    it('POST /api/owner/access-codes creates a new active cash access code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/owner/access-codes',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          packageId: testPackageId,
          cashierName: 'Kasir Test Suite',
          customerNote: 'Pelanggan Meja 4',
          expiresInHours: 24,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('code');
      expect(body.data.code).toMatch(/^PASS-[A-Z0-9]{4}$/);
      expect(body.data.status).toBe('ACTIVE');
      expect(body.data.packageId).toBe(testPackageId);

      createdCodeId = body.data.id;
      createdRawCode = body.data.code;
    });

    it('GET /api/owner/access-codes returns list of codes with filtering', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/owner/access-codes?status=ACTIVE',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.some((c: any) => c.id === createdCodeId)).toBe(true);
    });

    it('POST /api/payments/redeem-access-code successfully redeems active code and settles session', async () => {
      // 1. Buat session via endpoint resmi kiosk
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': boothKey },
        payload: { packageId: testPackageId },
      });
      const sessionBody = JSON.parse(sessionRes.body);
      const sessionId = sessionBody.data.id;

      // 2. Kiosk redeem access code
      const response = await app.inject({
        method: 'POST',
        url: '/api/payments/redeem-access-code',
        headers: { 'x-booth-key': boothKey },
        payload: {
          sessionId,
          code: createdRawCode,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.session.state).toBe('PAYMENT_CONFIRMED');

      // 3. Pastikan status kode berubah menjadi USED
      const updatedCode = await (app as any).prisma.accessCode.findUnique({ where: { id: createdCodeId } });
      expect(updatedCode?.status).toBe('USED');
      expect(updatedCode?.usedSessionId).toBe(sessionId);
    });

    it('POST /api/payments/redeem-access-code rejects double-spend on USED code', async () => {
      const sessionRes2 = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': boothKey },
        payload: { packageId: testPackageId },
      });
      const session2Id = JSON.parse(sessionRes2.body).data.id;

      const response = await app.inject({
        method: 'POST',
        url: '/api/payments/redeem-access-code',
        headers: { 'x-booth-key': boothKey },
        payload: {
          sessionId: session2Id,
          code: createdRawCode,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('sudah pernah digunakan');
    });

    it('POST /api/owner/access-codes/:id/revoke successfully revokes an active code', async () => {
      // Buat code baru
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/owner/access-codes',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { packageId: testPackageId, cashierName: 'Kasir Revoke' },
      });
      const newCode = JSON.parse(createRes.body).data;

      // Revoke
      const revokeRes = await app.inject({
        method: 'POST',
        url: `/api/owner/access-codes/${newCode.id}/revoke`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(revokeRes.statusCode).toBe(200);
      const body = JSON.parse(revokeRes.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('REVOKED');
    });

    it('POST /api/payments/redeem-access-code enforces cross-kiosk isolation (rejects code on wrong kiosk)', async () => {
      // 1. Buat Kiosk A dan Kiosk B di database dengan API key masing-masing
      const kioskA = await (app as any).prisma.kiosk.create({
        data: {
          code: `MJA-KA-CLOUD-${Date.now()}`,
          name: 'Booth Cloud A',
          location: 'Mall A Lantai 1',
          apiKey: `mja_cloud_key_a_${Date.now()}`,
        },
      });

      const kioskB = await (app as any).prisma.kiosk.create({
        data: {
          code: `MJA-KB-CLOUD-${Date.now()}`,
          name: 'Booth Cloud B',
          location: 'Mall B Lantai 2',
          apiKey: `mja_cloud_key_b_${Date.now()}`,
        },
      });

      try {
        // 2. Admin generate PASS code KHUSUS untuk Kiosk A
        const passRes = await app.inject({
          method: 'POST',
          url: '/api/owner/access-codes',
          headers: { authorization: `Bearer ${ownerToken}` },
          payload: {
            packageId: testPackageId,
            kioskId: kioskA.id,
            cashierName: 'Kasir Cloud A',
          },
        });
        expect(passRes.statusCode).toBe(201);
        const passData = JSON.parse(passRes.body).data;
        const passCodeA = passData.code;

        // 3. Buat sesi di Kiosk B (mesin yang salah)
        const sessionBRes = await app.inject({
          method: 'POST',
          url: '/api/sessions',
          headers: { 'x-booth-key': kioskB.apiKey },
          payload: { packageId: testPackageId },
        });
        const sessionBId = JSON.parse(sessionBRes.body).data.id;

        // 4. Coba tebus kode Kiosk A di Kiosk B -> WAJIB DITOLAK (403 FORBIDDEN)!
        const wrongRedeemRes = await app.inject({
          method: 'POST',
          url: '/api/payments/redeem-access-code',
          headers: { 'x-booth-key': kioskB.apiKey },
          payload: {
            sessionId: sessionBId,
            code: passCodeA,
          },
        });

        expect(wrongRedeemRes.statusCode).toBe(403);
        const wrongBody = JSON.parse(wrongRedeemRes.body);
        expect(wrongBody.success).toBe(false);
        expect(wrongBody.error.message).toContain('hanya berlaku untuk');

        // 5. Buat sesi di Kiosk A (mesin yang benar)
        const sessionARes = await app.inject({
          method: 'POST',
          url: '/api/sessions',
          headers: { 'x-booth-key': kioskA.apiKey },
          payload: { packageId: testPackageId },
        });
        const sessionAId = JSON.parse(sessionARes.body).data.id;

        // 6. Tebus kode Kiosk A di Kiosk A -> WAJIB BERHASIL (200 OK)!
        const correctRedeemRes = await app.inject({
          method: 'POST',
          url: '/api/payments/redeem-access-code',
          headers: { 'x-booth-key': kioskA.apiKey },
          payload: {
            sessionId: sessionAId,
            code: passCodeA,
          },
        });

        expect(correctRedeemRes.statusCode).toBe(200);
        const correctBody = JSON.parse(correctRedeemRes.body);
        expect(correctBody.success).toBe(true);
        expect(correctBody.data.session.state).toBe('PAYMENT_CONFIRMED');

        // Cleanup sesi & payments
        await (app as any).prisma.payment.deleteMany({ where: { sessionId: { in: [sessionAId, sessionBId] } } });
        await (app as any).prisma.session.deleteMany({ where: { id: { in: [sessionAId, sessionBId] } } });
        await (app as any).prisma.accessCode.deleteMany({ where: { id: passData.id } });
      } finally {
        await (app as any).prisma.kiosk.deleteMany({ where: { id: { in: [kioskA.id, kioskB.id] } } });
      }
    }, 20000);
  });

  describe('2. Owner Voucher Management Endpoints (/api/owner/vouchers)', () => {
    const testVoucherCode = `TESTPROMO${Date.now().toString().slice(-4)}`;

    it('POST /api/owner/vouchers creates a new promo voucher', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/owner/vouchers',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          code: testVoucherCode,
          discountType: 'percentage',
          discountValue: 25,
          minSpend: 20000,
          maxDiscount: 10000,
          usageLimit: 100,
          validUntil: new Date(Date.now() + 14 * 86400000).toISOString(),
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.code).toBe(testVoucherCode);
      expect(body.data.discountValue).toBe(25);

      createdVoucherId = body.data.id;
    });

    it('GET /api/owner/vouchers lists all vouchers for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/owner/vouchers',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.some((v: any) => v.id === createdVoucherId)).toBe(true);
    });

    it('PATCH /api/owner/vouchers/:id/toggle toggles voucher active status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/owner/vouchers/${createdVoucherId}/toggle`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { isActive: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.isActive).toBe(false);
    });

    it('DELETE /api/owner/vouchers/:id deletes the voucher', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/owner/vouchers/${createdVoucherId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      const check = await (app as any).prisma.voucher.findUnique({ where: { id: createdVoucherId } });
      expect(check).toBeNull();
    });
  });
});
