// tests/kiosk-fleet.test.ts
// Integration test suite for Multi-Kiosk Fleet Management (Control Tower) Endpoints

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
let createdKioskId: string;
let createdKioskKey: string;
let createdKioskCode: string;

describe('Multi-Kiosk Fleet Management & Heartbeat Endpoints', () => {
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
    // Cleanup created test kiosk if exists
    if (createdKioskId) {
      try {
        await app.prisma.kiosk.delete({ where: { id: createdKioskId } });
      } catch {}
    }
    await app.close();
  });

  it('GET /api/owner/kiosks rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/kiosks',
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/owner/kiosks creates a new kiosk with auto-generated API key and code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/owner/kiosks',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Test Kiosk Mall A',
        location: 'Lantai 1 Atrium Utama',
        paperRollCapacity: 400,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('code');
    expect(body.data).toHaveProperty('apiKey');
    expect(body.data.apiKey).toMatch(/^mja_kiosk_live_[0-9a-f]{32}$/);
    expect(body.data.paperRemaining).toBe(400);

    createdKioskId = body.data.id;
    createdKioskKey = body.data.apiKey;
    createdKioskCode = body.data.code;
  });

  it('GET /api/owner/kiosks returns list containing created kiosk with metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/owner/kiosks',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const found = body.data.find((k: any) => k.id === createdKioskId);
    expect(found).toBeDefined();
    expect(found.name).toBe('Test Kiosk Mall A');
    expect(found).toHaveProperty('todayRevenue');
    expect(found).toHaveProperty('todaySessionsCount');
  });

  it('POST /api/kiosk/heartbeat rejects request without X-Booth-Key header with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/kiosk/heartbeat',
      payload: {
        status: 'ONLINE',
        paperRemaining: 380,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('POST /api/kiosk/heartbeat rejects request with invalid X-Booth-Key header with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/kiosk/heartbeat',
      headers: {
        'x-booth-key': 'mja_kiosk_invalid_key_123',
      },
      payload: {
        status: 'ONLINE',
        paperRemaining: 380,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('POST /api/kiosk/heartbeat accepts valid heartbeat and updates telemetry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/kiosk/heartbeat',
      headers: {
        'x-booth-key': createdKioskKey,
      },
      payload: {
        status: 'ONLINE',
        paperRemaining: 385,
        printerStatus: 'READY',
        cameraStatus: 'READY',
        appVersion: '2.0.0',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.kioskId).toBe(createdKioskId);
    expect(body.data.isLocked).toBe(false);
    expect(body.data).toHaveProperty('serverTime');

    // Verify database record was updated
    const updated = await app.prisma.kiosk.findUnique({ where: { id: createdKioskId } });
    expect(updated?.paperRemaining).toBe(385);
    expect(updated?.printerStatus).toBe('READY');
    expect(updated?.lastHeartbeat).not.toBeNull();
  });

  it('POST /api/owner/kiosks/:id/lock locks the kiosk and heartbeat reflects isLocked', async () => {
    const lockRes = await app.inject({
      method: 'POST',
      url: `/api/owner/kiosks/${createdKioskId}/lock`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        enabled: true,
        reason: 'Pengisian ulang kertas roll',
      },
    });

    expect(lockRes.statusCode).toBe(200);
    const lockBody = JSON.parse(lockRes.body);
    expect(lockBody.success).toBe(true);
    expect(lockBody.data.isLocked).toBe(true);
    expect(lockBody.data.lockReason).toBe('Pengisian ulang kertas roll');

    // Subsequent heartbeat must return isLocked: true
    const hbRes = await app.inject({
      method: 'POST',
      url: '/api/kiosk/heartbeat',
      headers: {
        'x-booth-key': createdKioskKey,
      },
      payload: {
        status: 'ONLINE',
      },
    });

    expect(hbRes.statusCode).toBe(200);
    const hbBody = JSON.parse(hbRes.body);
    expect(hbBody.data.isLocked).toBe(true);
    expect(hbBody.data.lockReason).toBe('Pengisian ulang kertas roll');
  });

  it('POST /api/owner/kiosks/:id/refill-paper resets paper remaining', async () => {
    const refillRes = await app.inject({
      method: 'POST',
      url: `/api/owner/kiosks/${createdKioskId}/refill-paper`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        capacity: 400,
      },
    });

    expect(refillRes.statusCode).toBe(200);
    const body = JSON.parse(refillRes.body);
    expect(body.success).toBe(true);
    expect(body.data.paperRemaining).toBe(400);
  });

  it('POST /api/owner/kiosks/:id/rotate-key generates a new valid API key', async () => {
    const rotateRes = await app.inject({
      method: 'POST',
      url: `/api/owner/kiosks/${createdKioskId}/rotate-key`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(rotateRes.statusCode).toBe(200);
    const body = JSON.parse(rotateRes.body);
    expect(body.success).toBe(true);
    expect(body.data.apiKey).not.toBe(createdKioskKey);
    expect(body.data.apiKey).toMatch(/^mja_kiosk_live_[0-9a-f]{32}$/);

    const oldKey = createdKioskKey;
    createdKioskKey = body.data.apiKey;

    // Old key must be rejected now
    const oldHbRes = await app.inject({
      method: 'POST',
      url: '/api/kiosk/heartbeat',
      headers: {
        'x-booth-key': oldKey,
      },
    });
    expect(oldHbRes.statusCode).toBe(401);

    // New key must be accepted
    const newHbRes = await app.inject({
      method: 'POST',
      url: '/api/kiosk/heartbeat',
      headers: {
        'x-booth-key': createdKioskKey,
      },
    });
    expect(newHbRes.statusCode).toBe(200);
  });

  it('DELETE /api/owner/kiosks/:id removes the kiosk registration', async () => {
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/owner/kiosks/${createdKioskId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(delRes.statusCode).toBe(200);
    const body = JSON.parse(delRes.body);
    expect(body.success).toBe(true);

    // Verify it is gone from db
    const check = await app.prisma.kiosk.findUnique({ where: { id: createdKioskId } });
    expect(check).toBeNull();
    createdKioskId = '';
  });
});
