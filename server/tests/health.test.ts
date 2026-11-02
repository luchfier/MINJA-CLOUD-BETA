// tests/health.test.ts
// Test health check endpoint
// Milestone 1: minimal test sesuai M1 deliverables

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

// Setup environment for testing
process.env['DATABASE_URL'] = process.env['DATABASE_URL'] || 'postgresql://localhost:5432/minjaphotobooth_test';
process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars-long';
process.env['BOOTH_API_KEY'] = 'test-booth-key';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

let app: FastifyInstance;

describe('System Health Check', () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/system/health should return 200 with health data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/health',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.status).toBeDefined();
    expect(body.data.version).toBe('1.0.0');
    expect(body.data.uptime).toBeTypeOf('number');
    expect(body.data.database).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('health response should have correct shape (ApiResponse)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/health',
    });

    const body = JSON.parse(response.body);

    // Verifikasi format ApiResponse
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('timestamp');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it('non-existent route should return 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/non-existent',
    });

    expect(response.statusCode).toBe(404);
  });
});
