// src/routes/print.routes.ts
// Route handler untuk Perangkat Cetak Studio & Windows Print Spooler
// Sesuai ARCHITECTURE.md §3 & THE_NEXT_STEP.md §4

import type { FastifyInstance } from 'fastify';
import { PrintService } from '../services/print.service.js';
import {
  submitPrintJobSchema,
  testPrintSchema,
  reprintJobSchema,
  savePrinterConfigSchema,
} from '../schemas/print.schema.js';
import { requireBoothAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function printRoutes(app: FastifyInstance): Promise<void> {
  const printService = new PrintService(app.prisma);

  /**
   * GET /api/printer/list
   * Menampilkan daftar printer yang terpasang di sistem operasi Windows
   */
  app.get('/api/printer/list', async (_request, reply) => {
    const list = await printService.listPrinters();
    sendSuccess(reply, list);
  });

  /**
   * GET /api/printer/config
   * Mengambil konfigurasi printer aktif terkini
   */
  app.get('/api/printer/config', async (_request, reply) => {
    const config = await printService.getActivePrinterConfig();
    sendSuccess(reply, config);
  });

  /**
   * PUT /api/printer/config
   * Menyimpan printer terpilih dan kustomisasi parameter cetak oleh admin
   */
  app.put('/api/printer/config', async (request, reply) => {
    const body = savePrinterConfigSchema.parse(request.body);
    const result = await printService.savePrinterConfig(body);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/printer/print
   * Mengirimkan pekerjaan cetak ke Windows Print Spooler
   */
  app.post(
    '/api/printer/print',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const body = submitPrintJobSchema.parse(request.body);
      const result = await printService.submitPrintJob(body);
      sendSuccess(reply, result, 201);
    }
  );

  /**
   * GET /api/printer/jobs/:jobId/status
   * Memeriksa status antrean print job di Windows Spooler
   */
  app.get(
    '/api/printer/jobs/:jobId/status',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      const status = await printService.getJobStatus(jobId);
      sendSuccess(reply, status);
    }
  );

  /**
   * POST /api/printer/test
   * Melakukan uji cetak halaman kalibrasi borderless
   */
  app.post('/api/printer/test', async (request, reply) => {
    const body = testPrintSchema.parse(request.body || {});
    const result = await printService.testPrint(body);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/printer/open-preferences
   * Membuka dialog preferensi driver resmi Windows (Printing Preferences)
   */
  app.post('/api/printer/open-preferences', async (request, reply) => {
    const body = (request.body as { printerName?: string }) || {};
    const result = await printService.openPrinterPreferences(body.printerName);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/printer/open-properties
   * Membuka dialog properti printer Windows (Printer Properties)
   */
  app.post('/api/printer/open-properties', async (request, reply) => {
    const body = (request.body as { printerName?: string }) || {};
    const result = await printService.openPrinterProperties(body.printerName);
    sendSuccess(reply, result);
  });

  /**
   * POST /api/printer/reprint
   * Melakukan cetak ulang foto sesi tertentu dengan pencatatan audit log
   */
  app.post('/api/printer/reprint', async (request, reply) => {
    const body = reprintJobSchema.parse(request.body);
    const result = await printService.reprintJob(body);
    sendSuccess(reply, result);
  });
}
