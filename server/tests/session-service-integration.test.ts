import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SessionService } from '../src/services/session.service.js';
import { SessionNameEngine } from '../src/services/sessionNameEngine.service.js';

describe('SessionService & SessionNameEngine Integration', () => {
  let prisma: PrismaClient;
  let sessionService: SessionService;
  let engine: SessionNameEngine;

  beforeAll(async () => {
    prisma = new PrismaClient();
    engine = new SessionNameEngine(prisma);
    sessionService = new SessionService(prisma, engine);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('createSession menghasilkan ID terstruktur yang valid (diawali MJA- dan format YYYYMMDD)', async () => {
    // Ambil paket aktif
    const pkg = await prisma.package.findFirst({ where: { isActive: true } });
    if (!pkg) return;

    // Pastikan maintenance mode off
    await prisma.settings.updateMany({
      data: { maintenanceMode: false },
    });

    const session = await sessionService.createSession({
      packageId: pkg.id,
    });

    expect(session).toBeDefined();
    expect(session.id).toMatch(/^MJA-\d{8}-\d{4}$/);
    expect(session.sessionCode).toMatch(/^MJA-\d{8}-\d{4}$/);

    // Hapus sesi pengujian
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
  });
});
