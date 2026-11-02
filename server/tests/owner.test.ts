// tests/owner.test.ts
// Integration test suite for Remote Owner Management & Cloudflare Tunnel Endpoints

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

describe('Remote Owner Management & Cloudflare Tunnel Endpoints', () => {
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

  it('GET /api/owner/telemetry rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/telemetry',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/owner/telemetry returns real-time booth status and financial data when authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/telemetry',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('kioskStatus');
    expect(body.data).toHaveProperty('financialToday');
    expect(body.data.financialToday).toHaveProperty('totalRevenue');
    expect(body.data.financialToday).toHaveProperty('qrisRevenue');
    expect(body.data.financialToday).toHaveProperty('cashRevenue');
    expect(body.data).toHaveProperty('hardware');
    expect(body.data).toHaveProperty('syncStatus');
    expect(body.data).toHaveProperty('tunnel');
  });

  it('GET /api/owner/sessions-today returns today sessions list when authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/sessions-today?limit=10',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /api/owner/tunnel-status updates and saves public tunnel URL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/owner/tunnel-status',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        tunnelUrl: 'https://test-booth.trycloudflare.com',
        isActive: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.tunnelUrl).toBe('https://test-booth.trycloudflare.com');
    expect(body.data.isActive).toBe(true);
  });

  it('GET /api/owner/tunnel-status retrieves stored tunnel configuration when authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/tunnel-status',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.tunnelUrl).toBe('https://test-booth.trycloudflare.com');
  });

  it('POST /api/owner/kiosk/lock rejects invalid PIN with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/owner/kiosk/lock',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { enabled: true, pin: '999999' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/owner/kiosk/lock toggles maintenance mode remotely with valid PIN and reason', async () => {
    // 1. Lock kiosk with reason
    const lockRes = await app.inject({
      method: 'POST',
      url: '/api/owner/kiosk/lock',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { enabled: true, pin: '123456', reason: 'Refill Kertas Foto Studio' },
    });
    expect(lockRes.statusCode).toBe(200);
    const lockData = JSON.parse(lockRes.body).data;
    expect(lockData.maintenanceMode).toBe(true);
    expect(lockData.reason).toBe('Refill Kertas Foto Studio');

    // 2. Unlock kiosk with PIN
    const unlockRes = await app.inject({
      method: 'POST',
      url: '/api/owner/kiosk/lock',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { enabled: false, pin: '123456' },
    });
    expect(unlockRes.statusCode).toBe(200);
    expect(JSON.parse(unlockRes.body).data.maintenanceMode).toBe(false);
  });

  it('POST /api/owner/actions/cleanup triggers disk cleanup', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/owner/actions/cleanup',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('deleted');
    expect(body.data).toHaveProperty('freedBytes');
  });

  it('POST /api/owner/actions/force-sync triggers manual queue drain', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/owner/actions/force-sync',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('processed');
    expect(body.data).toHaveProperty('succeeded');
  });
});
