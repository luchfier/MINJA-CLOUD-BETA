// server/tests/sync-queue.test.ts
// Test suite untuk Auto-Sync Engine, Crash Recovery, dan Offline Queue

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Auto-Sync Engine & Crash Recovery Suite', () => {
  let app: FastifyInstance;
  const testSessionId = `test_sync_session_${Date.now()}`;
  const testSessionDir = path.resolve(process.cwd(), 'storage/galleries', testSessionId);

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Buat dummy session folder dengan file foto lokal seolah-olah terjadi crash/offline
    fs.mkdirSync(testSessionDir, { recursive: true });
    fs.writeFileSync(path.join(testSessionDir, 'strip_final.jpg'), 'dummy-photo-content');
    fs.writeFileSync(path.join(testSessionDir, 'pose_1.jpg'), 'dummy-pose-content');
  });

  afterAll(async () => {
    // Bersihkan dummy session
    try {
      if (fs.existsSync(testSessionDir)) {
        fs.rmSync(testSessionDir, { recursive: true, force: true });
      }
    } catch {}
    await app.close();
  });

  it('GET /api/system/sync-status returns initial sync engine metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/system/sync-status',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('isOnline');
    expect(body.data).toHaveProperty('isDatabaseConnected');
    expect(body.data).toHaveProperty('pendingCount');
    expect(body.data).toHaveProperty('totalQueued');
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it('SyncQueueService detects orphan session from crash recovery scan', async () => {
    const recovered = await app.syncQueueService.recoverCrashSessions();
    expect(recovered).toBeGreaterThanOrEqual(1);

    const found = app.syncQueueService.getItem(testSessionId);
    expect(found).toBeDefined();
    expect(found?.sessionCode).toMatch(/^MJA-/);
    expect(found?.status).toBe('pending');
  });

  it('Enqueues email for pending delivery on offline fallback', async () => {
    app.syncQueueService.recordEmailPending(testSessionId, 'customer@example.com');

    const found = app.syncQueueService.getItem(testSessionId);
    expect(found?.recipientEmail).toBe('customer@example.com');
  });

  it('POST /api/system/sync-now triggers queue processing without unhandled errors', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/system/sync-now',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('processed');
    expect(body.data).toHaveProperty('status');
  }, 30000);
});
