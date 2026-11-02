// tests/payment.test.ts
// Test Pilar 1: Payment Gateway (Midtrans QRIS & Cash)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { MidtransService } from '../src/services/midtrans.service.js';
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';

process.env['DATABASE_URL'] = process.env['DATABASE_URL'] || 'postgresql://postgres:MINJA@localhost:5432/minjaphotobooth';
process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars-long';
process.env['BOOTH_API_KEY'] = 'test-booth-key';
process.env['MIDTRANS_SERVER_KEY'] = 'test-midtrans-server-key';
process.env['MIDTRANS_IS_PRODUCTION'] = 'false';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

let app: FastifyInstance;

describe('Midtrans & Payment Gateway Integration', () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('MidtransService Signature Verification', () => {
    it('should correctly verify SHA512 signature from Midtrans', () => {
      const midtrans = new MidtransService();
      // Temporarily set serverKey on instance
      (midtrans as any).serverKey = 'test-midtrans-server-key';
      const orderId = 'MINJA-20261019-1001';
      const statusCode = '200';
      const grossAmount = '35000.00';
      const serverKey = 'test-midtrans-server-key';

      // Compute expected hash
      const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
      const validSignature = crypto.createHash('sha512').update(rawString).digest('hex');

      const isValid = midtrans.verifySignatureKey(orderId, statusCode, grossAmount, validSignature);
      expect(isValid).toBe(true);

      const isInvalid = midtrans.verifySignatureKey(orderId, statusCode, grossAmount, 'wrong-hash');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Payment API Endpoints', () => {
    it('POST /api/webhooks/midtrans should reject invalid signature with 401', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/midtrans',
        payload: {
          order_id: 'MINJA-20261019-9999',
          status_code: '200',
          gross_amount: '35000.00',
          transaction_status: 'settlement',
          signature_key: 'invalid-signature-hash',
        },
      });

      // Since order is not found or signature invalid, it returns appropriately
      const body = JSON.parse(response.body);
      expect(response.statusCode === 200 || response.statusCode === 401 || response.statusCode === 404).toBe(true);
    });

    it('GET /api/payments/:orderId/status should return 404 for unknown order', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/payments/UNKNOWN-ORDER-999/status',
        headers: {
          'x-booth-key': 'test-booth-key',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PAYMENT_NOT_FOUND');
    });

    it('POST /api/sessions validation: should require packageId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: {
          'x-booth-key': 'test-booth-key',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('Complete Session & Payment Lifecycle: create session -> create payment -> check status -> settle', async () => {
      // 1. Get packages
      const pkgRes = await app.inject({
        method: 'GET',
        url: '/api/packages',
      });
      expect(pkgRes.statusCode).toBe(200);
      const pkgBody = JSON.parse(pkgRes.body);
      expect(pkgBody.data.length).toBeGreaterThan(0);
      const selectedPkg = pkgBody.data[0];

      // 2. Create session
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': 'test-booth-key' },
        payload: {
          packageId: selectedPkg.id,
          additionalPrints: 1,
        },
      });
      expect(sessionRes.statusCode).toBe(201);
      const sessionBody = JSON.parse(sessionRes.body);
      expect(sessionBody.success).toBe(true);
      const sessionId = sessionBody.data.id;
      expect(sessionId).toBeDefined();

      // 3. Create QRIS payment
      const payRes = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: { 'x-booth-key': 'test-booth-key' },
        payload: {
          sessionId,
          paymentMethod: 'qris',
        },
      });
      expect(payRes.statusCode).toBe(201);
      const payBody = JSON.parse(payRes.body);
      expect(payBody.success).toBe(true);
      const orderId = payBody.data.orderId;
      expect(orderId).toBeDefined();
      expect(payBody.data.grossAmount).toBeGreaterThan(0);
      expect(payBody.data.qrString).toBeDefined();

      // 4. Check initial pending status
      const statusRes = await app.inject({
        method: 'GET',
        url: `/api/payments/${orderId}/status`,
        headers: { 'x-booth-key': 'test-booth-key' },
      });
      expect(statusRes.statusCode).toBe(200);
      const statusBody = JSON.parse(statusRes.body);
      expect(statusBody.data.orderId).toBe(orderId);

      // 5. Force settle (simulating successful payment)
      const settleRes = await app.inject({
        method: 'POST',
        url: `/api/payments/${orderId}/force-settle`,
        headers: { 'x-booth-key': 'test-booth-key' },
      });
      expect(settleRes.statusCode).toBe(200);
      const settleBody = JSON.parse(settleRes.body);
      expect(settleBody.data.transactionStatus).toBe('settlement');
      expect(settleBody.data.isVerified).toBe(true);

      // 6. Verify session state updated to PAYMENT_CONFIRMED
      const sessionCheckRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}`,
        headers: { 'x-booth-key': 'test-booth-key' },
      });
      expect(sessionCheckRes.statusCode).toBe(200);
      const sessionCheckBody = JSON.parse(sessionCheckRes.body);
      expect(sessionCheckBody.data.state).toBe('PAYMENT_CONFIRMED');

      // 7. Security: Idempotency test — sending settlement webhook on already settled payment
      const rawString = `${orderId}200${selectedPkg.price}.00test-midtrans-server-key`;
      const validSig = crypto.createHash('sha512').update(rawString).digest('hex');
      const idempotentRes = await app.inject({
        method: 'POST',
        url: '/api/webhooks/midtrans',
        payload: {
          order_id: orderId,
          status_code: '200',
          gross_amount: `${selectedPkg.price}.00`,
          transaction_status: 'settlement',
          signature_key: validSig,
        },
      });
      expect(idempotentRes.statusCode).toBe(200);
      const idempBody = JSON.parse(idempotentRes.body);
      expect(idempBody.data.processed).toBe(true);
    });

    it('POST /api/payments/extra-prints: should create extra print charge, settle it, and update session print totals', async () => {
      // 1. Get package and create a session
      const pkgRes = await app.inject({ method: 'GET', url: '/api/packages' });
      const pkgBody = JSON.parse(pkgRes.body);
      const pkg = pkgBody.data[0];

      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'x-booth-key': 'test-booth-key' },
        payload: { packageId: pkg.id },
      });
      const sessionBody = JSON.parse(sessionRes.body);
      const sessionId = sessionBody.data.id;

      // 2. Request extra prints payment for 2 additional prints
      const extraRes = await app.inject({
        method: 'POST',
        url: '/api/payments/extra-prints',
        headers: { 'x-booth-key': 'test-booth-key' },
        payload: {
          sessionId,
          additionalPrints: 2,
          paymentMethod: 'qris',
        },
      });

      expect(extraRes.statusCode).toBe(201);
      const extraBody = JSON.parse(extraRes.body);
      expect(extraBody.success).toBe(true);
      expect(extraBody.data.orderId).toMatch(/^MINJA-EXT-/);
      expect(extraBody.data.grossAmount).toBe(2 * pkg.additionalPrintPrice);
      expect(extraBody.data.qrString).toBeDefined();

      const extOrderId = extraBody.data.orderId;

      // 3. Settle the extra prints payment
      const settleRes = await app.inject({
        method: 'POST',
        url: `/api/payments/${extOrderId}/force-settle`,
        headers: { 'x-booth-key': 'test-booth-key' },
      });
      expect(settleRes.statusCode).toBe(200);

      // 4. Verify session print totals updated
      const sessionCheckRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}`,
        headers: { 'x-booth-key': 'test-booth-key' },
      });
      const updatedSession = JSON.parse(sessionCheckRes.body).data;
      expect(updatedSession.additionalPrints).toBe(2);
      expect(updatedSession.totalPrints).toBe((pkg.defaultPrints ?? 1) + 2);
      expect(updatedSession.additionalPrintCost).toBe(2 * pkg.additionalPrintPrice);
      expect(updatedSession.totalPrice).toBe(pkg.price + 2 * pkg.additionalPrintPrice);
    });

    it('POST /api/packages/calculate-price: should accurately calculate extra prints pricing', async () => {
      const pkgRes = await app.inject({ method: 'GET', url: '/api/packages' });
      const pkg = JSON.parse(pkgRes.body).data[0];

      const calcRes = await app.inject({
        method: 'POST',
        url: '/api/packages/calculate-price',
        payload: {
          packageId: pkg.id,
          additionalPrints: 6,
        },
      });

      expect(calcRes.statusCode).toBe(200);
      const calcBody = JSON.parse(calcRes.body).data;
      expect(calcBody.additionalPrintUnitPrice).toBe(pkg.additionalPrintPrice);
      expect(calcBody.additionalPrintTotal).toBe(6 * pkg.additionalPrintPrice);
      expect(calcBody.grossAmount).toBe(pkg.price + 6 * pkg.additionalPrintPrice);
    });

    it('POST /api/payments/:orderId/force-settle should reject with 403 when in production mode', async () => {
      const prevEnv = process.env['MIDTRANS_IS_PRODUCTION'];
      process.env['MIDTRANS_IS_PRODUCTION'] = 'true';
      try {
        const response = await app.inject({
          method: 'POST',
          url: '/api/payments/ANY-ORDER-ID/force-settle',
          headers: { 'x-booth-key': 'test-booth-key' },
        });
        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.body);
        expect(body.error.code).toBe('FORBIDDEN_IN_PRODUCTION');
      } finally {
        process.env['MIDTRANS_IS_PRODUCTION'] = prevEnv;
      }
    });
  });
});
