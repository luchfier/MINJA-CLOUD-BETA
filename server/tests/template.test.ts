// tests/template.test.ts
// Integration tests for Template CRUD, Editing, Slot Configuration, and Deletion
// Sesuai ARCHITECTURE.md §4.2, §5.1

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://postgres:MINJA@localhost:5432/minjaphotobooth';
process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars-long';
process.env['BOOTH_API_KEY'] = 'test-booth-key';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

let app: FastifyInstance;
let adminToken: string;

describe('Template Management & CRUD Endpoints', () => {
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

  let createdTemplateId: string;

  it('GET /api/templates returns active templates for kiosk', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/templates',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /api/admin/templates creates a new custom template with large PNG Data URL (>2MB payload)', async () => {
    // Generate a ~2.5MB base64 data string to test Fastify bodyLimit optimization
    const largeBase64Chunk = 'A'.repeat(1024 * 512); // 512KB of raw string
    const largeDataUrl = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==#${largeBase64Chunk.repeat(4)}`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/templates',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'High-Res Studio Template',
        frameOverlayUrl: largeDataUrl,
        thumbnailUrl: '',
        slots: [
          { x: 90, y: 140, width: 1020, height: 710, rotation: 0 },
          { x: 90, y: 940, width: 1020, height: 710, rotation: 45 },
          { x: 100, y: 100, width: 400, height: 400, rotation: 15 },
        ],
        isDefault: true,
        isActive: true,
        frameLayer: 'underlay',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('High-Res Studio Template');
    expect(body.data.slots.length).toBe(3);
    expect(body.data.frameLayer).toBe('underlay');
    createdTemplateId = body.data.id;
    expect(createdTemplateId).toBeDefined();
  });

  it('PUT /api/admin/templates/:id edits existing template with isDefault and frameLayer without Prisma error', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/templates/${createdTemplateId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'High-Res Studio Template (Edited)',
        isDefault: true,
        slots: [
          { x: 100, y: 120, width: 1000, height: 1240, rotation: 0 },
        ],
        isActive: true,
        frameLayer: 'overlay',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('High-Res Studio Template (Edited)');
    expect(body.data.slots.length).toBe(1);
    expect(body.data.frameLayer).toBe('overlay');
  });

  it('DELETE /api/admin/templates/:id permanently removes the template', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/admin/templates/${createdTemplateId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it('Verifies template is no longer in admin list after deletion', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/templates',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    const items = body.data.items || body.data;
    const found = items.find((t: any) => t.id === createdTemplateId);
    expect(found).toBeUndefined();
  }, 15000);
});
