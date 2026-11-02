// tests/asset.test.ts
// Integration tests for Font Tipografi & Stiker Kustom Studio

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

describe('Asset Management Endpoints (Fonts & Stickers)', () => {
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

  let createdFontId: string;
  let createdStickerId: string;

  it('GET /api/public/assets/fonts returns active studio fonts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/assets/fonts',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/admin/assets/fonts allows admin to add a new custom font', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/assets/fonts',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Lobster Retro',
        fontFamily: 'Lobster, cursive',
        googleFont: 'Lobster',
        previewText: 'Pesta Meriah',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Lobster Retro');
    expect(body.data.fontFamily).toBe('Lobster, cursive');
    createdFontId = body.data.id;
  });

  it('DELETE /api/admin/assets/fonts/:id removes the custom font', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/admin/assets/fonts/${createdFontId}`,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.success).toBe(true);
  });

  it('GET /api/public/assets/stickers returns active studio stickers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/assets/stickers',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/admin/assets/stickers allows admin to upload custom PNG sticker', async () => {
    const samplePngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/assets/stickers',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Logo Cafe Spesial',
        category: 'Branding',
        type: 'image',
        url: samplePngDataUrl,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Logo Cafe Spesial');
    expect(body.data.type).toBe('image');
    expect(body.data.url).toMatch(/^\/storage\/stickers\/sticker_/);
    createdStickerId = body.data.id;
  });

  it('DELETE /api/admin/assets/stickers/:id removes the sticker', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/admin/assets/stickers/${createdStickerId}`,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.success).toBe(true);
  });
});
