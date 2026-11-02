// minja-cloud/server/src/server.ts
// Entry point for Minja Cloud VPS Backend API

import 'dotenv/config';
import { buildCloudApp } from './app.js';
import { getEnv } from './config/env.js';
import { humanLogger } from './utils/humanLogger.js';

async function startServer() {
  try {
    const app = await buildCloudApp();
    const env = getEnv();

    const host = '0.0.0.0';
    const port = env.PORT || 3000;

    await app.listen({ port, host });

    humanLogger.server(`Minja Cloud VPS Platform AKTIF pada port ${port} (Host: ${host})`);
    humanLogger.info('VPS', `Environment   : ${env.NODE_ENV.toUpperCase()}`);
    humanLogger.info('VPS', `Owner Portal  : http://localhost:${port}/owner`);
    humanLogger.info('VPS', `Partner Portal: http://localhost:${port}/partner`);
    humanLogger.info('VPS', `Public Gallery: ${env.GALLERY_BASE_URL}`);
  } catch (err: any) {
    console.error('❌ Gagal menjalankan Minja Cloud Server:', err);
    process.exit(1);
  }
}

startServer();
