// tests/transaction-engine.test.ts
// Automated Test Suite for Dedicated Transaction Engine (Categorized Transactions & Financial Summary)

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

describe('Dedicated Transaction Engine (Categorized Transactions & Summary)', () => {
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
    await app.close();
  });

  it('GET /api/owner/transactions returns categorized transaction list with correct structure', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/transactions?limit=20',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('total');
    expect(Array.isArray(body.data.items)).toBe(true);

    if (body.data.items.length > 0) {
      const item = body.data.items[0];
      expect(item).toHaveProperty('orderId');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('categoryLabel');
      expect(item).toHaveProperty('categoryBadgeColor');
      expect(item).toHaveProperty('grossAmount');
      expect(item).toHaveProperty('baseAmount');
      expect(item).toHaveProperty('discountAmount');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('isSettled');
      expect(item).toHaveProperty('itemType');
      expect(['QRIS_MIDTRANS', 'CASH_DESK', 'CASH_PASSCODE', 'EXTRA_PRINTS', 'VOUCHER_PROMO']).toContain(item.category);
    }
  });

  it('GET /api/owner/transactions?category=QRIS_MIDTRANS filters only QRIS transactions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/transactions?category=QRIS_MIDTRANS',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    for (const item of body.data.items) {
      expect(item.category).toBe('QRIS_MIDTRANS');
    }
  });

  it('GET /api/owner/transactions?category=CASH_PASSCODE filters only cash access code transactions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/transactions?category=CASH_PASSCODE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    for (const item of body.data.items) {
      expect(item.category).toBe('CASH_PASSCODE');
    }
  });

  it('GET /api/owner/transactions?category=VOUCHER_PROMO filters transactions with voucher applied', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/transactions?category=VOUCHER_PROMO',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    for (const item of body.data.items) {
      expect(item.hasVoucher).toBe(true);
    }
  });

  it('GET /api/owner/transactions/summary calculates accurate revenue breakdown per category', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/transactions/summary',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('totalGrossRevenue');
    expect(body.data).toHaveProperty('totalTransactions');
    expect(body.data).toHaveProperty('todayGrossRevenue');
    expect(body.data).toHaveProperty('breakdown');

    const bd = body.data.breakdown;
    expect(bd).toHaveProperty('qris');
    expect(bd.qris).toHaveProperty('count');
    expect(bd.qris).toHaveProperty('totalRevenue');

    expect(bd).toHaveProperty('cashDesk');
    expect(bd.cashDesk).toHaveProperty('count');
    expect(bd.cashDesk).toHaveProperty('totalRevenue');

    expect(bd).toHaveProperty('cashPasscode');
    expect(bd.cashPasscode).toHaveProperty('count');
    expect(bd.cashPasscode).toHaveProperty('totalRevenue');

    expect(bd).toHaveProperty('extraPrints');
    expect(bd.extraPrints).toHaveProperty('totalPrints');

    expect(bd).toHaveProperty('voucherPromo');
    expect(bd.voucherPromo).toHaveProperty('totalDiscountGiven');
  });

  it('GET /api/owner/transactions/export/csv exports valid CSV formatted data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/transactions/export/csv',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('.csv');

    const csvLines = res.body.split('\r\n');
    expect(csvLines.length).toBeGreaterThan(0);
    // Header row verification
    expect(csvLines[0]).toContain('Waktu');
    expect(csvLines[0]).toContain('Order ID');
    expect(csvLines[0]).toContain('Kategori');
    expect(csvLines[0]).toContain('Total Bayar');
    expect(csvLines[0]).toContain('Status');
  });
});
