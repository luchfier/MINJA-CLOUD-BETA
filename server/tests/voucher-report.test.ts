// tests/voucher-report.test.ts
// Integration tests for Voucher validation/CRUD and Reports & Cash Desk endpoints

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

describe('Vouchers & Reports Endpoints', () => {
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
    adminToken = loginBody.data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Voucher Validation & CRUD', () => {
    it('POST /api/vouchers/validate should validate existing MINJA20 voucher', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/vouchers/validate',
        payload: {
          code: 'MINJA20',
          packagePrice: 50000,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
      expect(body.data.discountAmount).toBe(10000); // 20% of 50000 is 10000 <= maxDiscount 20000
      expect(body.data.finalPrice).toBe(40000);
    });

    it('POST /api/vouchers/validate should reject non-existent voucher', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/vouchers/validate',
        payload: {
          code: 'NOTEXISTING123',
          packagePrice: 50000,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(false);
      expect(body.data.discountAmount).toBe(0);
    });

    it('GET /api/admin/vouchers should return voucher list for admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/vouchers',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Reports & Financial Endpoints', () => {
    it('GET /api/admin/reports/summary should return financial metrics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/reports/summary',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalRevenue');
      expect(body.data).toHaveProperty('totalSessions');
      expect(body.data).toHaveProperty('qrisRevenue');
      expect(body.data).toHaveProperty('cashRevenue');
    });

    it('GET /api/admin/reports/transactions should return paginated transactions', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/reports/transactions?page=1&limit=10',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('items');
      expect(body.data).toHaveProperty('total');
      expect(body.data).toHaveProperty('page');
    });

    it('GET /api/admin/reports/export/csv should return CSV format', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/reports/export/csv',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.body).toContain('Order ID,Kode Sesi,Paket');
    });

    it('GET /api/admin/cash/pending should return pending cash queue', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/cash/pending',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('GET /api/admin/cash/audit-logs should return cash audit logs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/cash/audit-logs',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});
