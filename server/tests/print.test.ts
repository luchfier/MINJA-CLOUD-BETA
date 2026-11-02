// tests/print.test.ts
// Test suite untuk endpoint Printer & Silent Spooler
// Sesuai ARCHITECTURE.md §3 & THE_NEXT_STEP.md §4

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

describe('Printer Service & Silent Print Endpoints', () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    try {
      if ((app as any).prisma) {
        await (app as any).prisma.printerConfig.deleteMany({
          where: { printerName: 'Photo Printer Lab' },
        });
      }
    } catch {}
    await app.close();
  });

  it('GET /api/printer/list returns list of detected/supported printers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/printer/list',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const firstPrinter = body.data[0];
    expect(firstPrinter).toHaveProperty('id');
    expect(firstPrinter).toHaveProperty('name');
    expect(firstPrinter).toHaveProperty('status');
    expect(firstPrinter).toHaveProperty('supportedSizes');
  });

  it('PUT /api/printer/config saves custom printer selection and settings', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/printer/config',
      payload: {
        printerName: 'Photo Printer Lab',
        displayName: 'Printer Booth Depan',
        paperSize: 'Standard',
        isDefault: true,
        isActive: true,
        settings: {
          borderless: true,
          orientation: 'portrait',
          marginTopMm: 1.5,
          marginBottomMm: 0,
          marginLeftMm: -1.0,
          marginRightMm: 0,
          colorMode: 'vivid',
          autoCut: true,
          dpi: 300,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.printerName).toBe('Photo Printer Lab');
    expect(body.data.displayName).toBe('Printer Booth Depan');
    expect(body.data.settings.marginTopMm).toBe(1.5);
    expect(body.data.settings.colorMode).toBe('vivid');

    // Test GET /api/printer/config
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/printer/config',
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.success).toBe(true);
    expect(getBody.data.printerName).toBe('Photo Printer Lab');
    expect(getBody.data.isDefault).toBe(true);
  });

  it('POST /api/printer/print queues a print job successfully', async () => {
    const mockImage =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAPAA8BAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    const res = await app.inject({
      method: 'POST',
      url: '/api/printer/print',
      headers: {
        'x-booth-key': 'test-booth-key',
      },
      payload: {
        sessionId: 'test_session_print_1',
        copies: 2,
        layoutImageUrl: mockImage,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('jobId');
    expect(body.data.status).toBe('printing');
    expect(body.data.copies).toBe(2);

    // Test checking job status
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/printer/jobs/${body.data.jobId}/status`,
      headers: {
        'x-booth-key': 'test-booth-key',
      },
    });

    expect(statusRes.statusCode).toBe(200);
    const statusBody = JSON.parse(statusRes.body);
    expect(statusBody.success).toBe(true);
    expect(statusBody.data.jobId).toBe(body.data.jobId);
  });

  it('POST /api/printer/test dispatches a calibration print', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/printer/test',
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('jobId');
    expect(body.data.message).toContain('kalibrasi');
  });

  it('POST /api/printer/reprint submits an audit-tracked reprint', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/printer/reprint',
      payload: {
        sessionId: 'test_session_print_1',
        reason: 'Pengujian audit print ulang oleh operator',
        copies: 1,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('jobId');
    expect(body.data.message).toContain('Reprint');
  });
});
