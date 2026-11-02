// server/tests/integration.test.ts
// Unit Test Suite untuk API Integrations & Kiosk Identity Management

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { signAdminToken } from '../src/utils/auth.util.js';

describe('Admin Integrations & Kiosk Identity Test Suite', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildApp();
    const tokenResult = signAdminToken('test-admin-id');
    adminToken = tokenResult.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/admin/integrations menolak akses jika tanpa token admin (401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/integrations',
    });

    expect(res.statusCode).toBe(401);
  });

  it('2. GET /api/admin/integrations mengembalikan konfigurasi kiosk & integrasi yang dimasking', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/integrations',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('kioskCode');
    expect(body.data).toHaveProperty('kioskName');
    expect(body.data).toHaveProperty('resendFrom');
    expect(body.data).toHaveProperty('hasResendApiKey');
    expect(body.data.resendFrom).toBeTruthy();
  });

  it('3. PUT /api/admin/integrations berhasil memperbarui Kiosk Identity & konfigurasi secara hot-reload', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/integrations',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        kioskCode: 'MJA-01',
        kioskName: 'Minja Studio Mall Grand Indonesia',
        kioskLocation: 'Lantai 3 Depan Cinema XXI',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.kioskCode).toBe('MJA-01');
    expect(body.data.kioskName).toBe('Minja Studio Mall Grand Indonesia');
    expect(body.data.kioskLocation).toBe('Lantai 3 Depan Cinema XXI');
  });

  it('4. POST /api/admin/integrations/test-email memvalidasi format email tujuan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/integrations/test-email',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        testEmail: 'bukan-email-valid',
      },
    });

    expect(res.statusCode).toBe(400);
  });
});
