// tests/settings.test.ts
// Integration tests for Dedicated Local File Storage Branding (/storage/branding/)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BRANDING_STORAGE_DIR = path.resolve(__dirname, '../storage/branding');

process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://postgres:MINJA@localhost:5432/minjaphotobooth';
process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars-long';
process.env['BOOTH_API_KEY'] = 'test-booth-key';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

let app: FastifyInstance;
let adminToken: string;

// Sample 1x1 transparent PNG Base64
const SAMPLE_BASE64_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Sample 1x1 red PNG Base64
const SAMPLE_BASE64_RED_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Settings & Dedicated Branding Storage (/storage/branding/)', () => {
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

  it('GET /api/settings returns public branding configuration', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/settings',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.boothName).toBeDefined();
  });

  it('GET /api/admin/settings requires valid admin JWT', async () => {
    const unauthorizedRes = await app.inject({
      method: 'GET',
      url: '/api/admin/settings',
    });
    expect(unauthorizedRes.statusCode).toBe(401);

    const authorizedRes = await app.inject({
      method: 'GET',
      url: '/api/admin/settings',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(authorizedRes.statusCode).toBe(200);
    const body = JSON.parse(authorizedRes.body);
    expect(body.success).toBe(true);
  });

  let savedLogoPath: string;
  let savedWallpaperPath: string;

  it('PUT /api/admin/settings persists Base64 logo to /storage/branding/ as physical file', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/settings',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        logoUrl: SAMPLE_BASE64_PNG,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.logoUrl).toBeDefined();
    expect(body.data.logoUrl).toMatch(/^\/storage\/branding\/logo_.*\.png$/);

    savedLogoPath = body.data.logoUrl;

    // Verify physical file exists on disk
    const fileName = path.basename(savedLogoPath);
    const physicalFile = path.join(BRANDING_STORAGE_DIR, fileName);
    expect(fs.existsSync(physicalFile)).toBe(true);
    expect(fs.statSync(physicalFile).size).toBeGreaterThan(0);
  });

  it('PUT /api/admin/settings persists Base64 wallpaper to /storage/branding/ as physical file', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/settings',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        wallpaperUrl: SAMPLE_BASE64_PNG,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.wallpaperUrl).toBeDefined();
    expect(body.data.wallpaperUrl).toMatch(/^\/storage\/branding\/wallpaper_.*\.png$/);

    savedWallpaperPath = body.data.wallpaperUrl;

    // Verify physical file exists on disk
    const fileName = path.basename(savedWallpaperPath);
    const physicalFile = path.join(BRANDING_STORAGE_DIR, fileName);
    expect(fs.existsSync(physicalFile)).toBe(true);
    expect(fs.statSync(physicalFile).size).toBeGreaterThan(0);
  });

  it('PUT /api/admin/settings cleans up old physical logo file when updated with new logo', async () => {
    const oldFileName = path.basename(savedLogoPath);
    const oldPhysicalFile = path.join(BRANDING_STORAGE_DIR, oldFileName);
    expect(fs.existsSync(oldPhysicalFile)).toBe(true);

    // Update with new logo
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/settings',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        logoUrl: SAMPLE_BASE64_RED_PNG,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    const newLogoPath = body.data.logoUrl;
    expect(newLogoPath).not.toBe(savedLogoPath);

    // Old physical file should now be deleted from disk
    expect(fs.existsSync(oldPhysicalFile)).toBe(false);

    // New physical file should exist
    const newFileName = path.basename(newLogoPath);
    const newPhysicalFile = path.join(BRANDING_STORAGE_DIR, newFileName);
    expect(fs.existsSync(newPhysicalFile)).toBe(true);

    savedLogoPath = newLogoPath;
  });

  it('PUT /api/admin/settings preserves existing /storage/ URLs without re-saving', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/settings',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        logoUrl: savedLogoPath,
        boothName: 'Minja Studio Pro',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.logoUrl).toBe(savedLogoPath);
    expect(body.data.boothName).toBe('Minja Studio Pro');
  });

  it('PUT /api/admin/settings allows clearing logo/wallpaper and removes old physical file', async () => {
    const wallpaperFileName = path.basename(savedWallpaperPath);
    const wallpaperPhysicalFile = path.join(BRANDING_STORAGE_DIR, wallpaperFileName);
    expect(fs.existsSync(wallpaperPhysicalFile)).toBe(true);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/settings',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        wallpaperUrl: null,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.wallpaperUrl).toBeNull();

    // Old physical file should be cleaned up
    expect(fs.existsSync(wallpaperPhysicalFile)).toBe(false);
  });
});
