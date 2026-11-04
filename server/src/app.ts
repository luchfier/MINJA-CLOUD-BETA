// minja-cloud/server/src/app.ts
// Fastify Cloud Application Instance — Minja Cloud VPS Platform

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './config/env.js';
import { globalErrorHandler } from './middleware/error.middleware.js';
import { humanLogger } from './utils/humanLogger.js';

// Import All Routes
import { adminAuthRoutes } from './routes/admin-auth.routes.js';
import { packageRoutes } from './routes/package.routes.js';
import { sessionRoutes } from './routes/session.routes.js';
import { paymentRoutes } from './routes/payment.routes.js';
import { templateRoutes } from './routes/template.routes.js';
import { systemRoutes } from './routes/system.routes.js';
import { voucherRoutes } from './routes/voucher.routes.js';
import { assetRoutes } from './routes/asset.routes.js';
import { integrationRoutes } from './routes/integration.routes.js';
import { deliveryRoutes } from './routes/delivery.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { auditRoutes } from './routes/audit.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { ownerRoutes } from './routes/owner.routes.js';
import { kioskRoutes } from './routes/kiosk.routes.js';
import { partnerRoutes } from './routes/partner.routes.js';
import { operatorRoutes } from './routes/operator.routes.js';

import { SyncQueueService } from './services/syncQueue.service.js';
import { TimingConfigService } from './services/timingConfig.service.js';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    syncQueueService: SyncQueueService;
    timingConfigService: TimingConfigService;
  }
}

export async function buildCloudApp() {
  const env = loadEnv();

  const app = Fastify({
    bodyLimit: 50 * 1024 * 1024,
    logger: false,
  });

  // Filter & log requests
  app.addHook('onResponse', (request, reply, done) => {
    const url = request.raw.url || '';
    if (
      url.includes('/health') ||
      url.includes('/status') ||
      url.startsWith('/storage/') ||
      url.startsWith('/assets/')
    ) {
      done();
      return;
    }

    if (reply.statusCode >= 400) {
      humanLogger.warn('VPS-API', `${request.method} ${url} -> Status ${reply.statusCode}`);
    }
    done();
  });

  // Initialize Prisma Client
  const prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
  app.decorate('prisma', prisma);
  const syncQueueService = new SyncQueueService(prisma);
  app.decorate('syncQueueService', syncQueueService);
  const timingConfigService = new TimingConfigService();
  app.decorate('timingConfigService', timingConfigService);

  // Lifecycle hooks
  app.addHook('onReady', async () => {
    try {
      await prisma.$connect();
      humanLogger.database('Koneksi Database PostgreSQL VPS AKTIF');
    } catch (err: any) {
      humanLogger.database('Gagal terhubung ke database PostgreSQL VPS: ' + (err?.message || ''), false);
    }
  });

  app.addHook('onClose', async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    humanLogger.database('Koneksi database PostgreSQL VPS terputus', false);
  });

  // Security & CORS
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Booth-Key', 'X-Cloud-Key'],
    credentials: true,
  });

  // Global Error Handler
  app.setErrorHandler(globalErrorHandler);

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    service: 'minja-cloud-vps',
    timestamp: new Date().toISOString(),
  }));


  // Local storage for cached photos, thumbnails, and branding
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const storageDir = path.resolve(__dirname, '../storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  await app.register(fastifyStatic, {
    root: storageDir,
    prefix: '/storage/',
    decorateReply: true,
    setHeaders: (res: any, pathName: string) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      if (typeof pathName === 'string' && pathName.endsWith('.html')) {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.header('Cache-Control', 'public, max-age=86400');
      }
    },
  });

  // Register All Route Modules
  await app.register(adminAuthRoutes);
  await app.register(packageRoutes);
  await app.register(sessionRoutes);
  await app.register(paymentRoutes);
  await app.register(templateRoutes);
  await app.register(systemRoutes);
  await app.register(voucherRoutes);
  await app.register(assetRoutes);
  await app.register(integrationRoutes);
  await app.register(deliveryRoutes);
  await app.register(reportRoutes);
  await app.register(auditRoutes);
  await app.register(settingsRoutes);
  await app.register(ownerRoutes);
  await app.register(kioskRoutes);
  await app.register(partnerRoutes);
  await app.register(operatorRoutes);

  // Serve Frontend Portals SPA from dist if built
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      decorateReply: false,
    });

    // Fallback GET / for Single Page Application
    app.setNotFoundHandler((request, reply) => {
      const accept = request.headers.accept || '';
      if (accept.includes('text/html')) {
        return reply.sendFile('index.html', frontendDist);
      }
      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${request.method} ${request.url} tidak ditemukan di Minja Cloud.`,
        },
      });
    });
  }

  return app;
}

export const buildApp = buildCloudApp;
