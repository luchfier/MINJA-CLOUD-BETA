// server/src/services/operator.service.ts
// Service Portal Kasir Lapangan (Tier 3 RBAC)
// Menangani login kasir lapangan, pembuatan kode tunai (PASS), pratinjau sesi terakhir, dan reprint darurat

import type { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError, ErrorCode } from '../types/common.types.js';
import { verifyPin, signCustomToken } from '../utils/auth.util.js';
import { AccessCodeService } from './accessCode.service.js';
import { PrintService } from './print.service.js';
import { humanLogger } from '../utils/humanLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GeneratePassInput {
  packageId?: string;
  amount?: number;
  type?: 'SESSION' | 'EXTRA_PRINT';
  extraPrints?: number;
  customerNote?: string;
  expiresInMinutes?: number;
}

export class OperatorService {
  private accessCodeService: AccessCodeService;
  private printService: PrintService;
  private printStorageDir: string;

  constructor(private prisma: PrismaClient) {
    this.accessCodeService = new AccessCodeService(prisma);
    this.printService = new PrintService(prisma);
    this.printStorageDir = path.resolve(__dirname, '../../storage/prints');
  }

  /**
   * Operator: Login menggunakan username & PIN kasir
   */
  async operatorLogin(username: string, pin: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: {
        kiosk: {
          select: {
            id: true,
            code: true,
            name: true,
            location: true,
            status: true,
            paperRemaining: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
            receiptHeader: true,
            receiptFooter: true,
          },
        },
      },
    });

    if (!operator || !operator.isActive) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Username atau PIN kasir salah / akun dinonaktifkan.');
    }

    const isValid = await verifyPin(pin.trim(), operator.pinHash);
    if (!isValid) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Username atau PIN kasir salah.');
    }

    // Update lastLoginAt
    await this.prisma.operator.update({
      where: { id: operator.id },
      data: { lastLoginAt: new Date() },
    });

    const { token, expiresAt } = signCustomToken({
      sub: operator.id,
      role: 'operator',
      partnerId: operator.partnerId,
      kioskId: operator.kioskId || undefined,
      expiresIn: '16h', // Durasi shift kerja kasir
    });

    humanLogger.success('OPERATOR', `Kasir login sukses: ${operator.name} (@${operator.username})`);

    return {
      token,
      expiresAt,
      operator: {
        id: operator.id,
        name: operator.name,
        username: operator.username,
        partnerName: operator.partner.name,
        receiptHeader: operator.partner.receiptHeader,
        receiptFooter: operator.partner.receiptFooter,
        kiosk: operator.kiosk,
      },
    };
  }

  /**
   * Operator: Mengambil telemetri booth tempat bertugas
   */
  async getKioskStatus(operatorId: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: {
        kiosk: true,
        partner: {
          select: {
            id: true,
            name: true,
            receiptHeader: true,
            receiptFooter: true,
            receiptPaperWidth: true,
            receiptConfig: true,
            receiptAddress: true,
            receiptSocial: true,
            receiptPolicy: true,
            phone: true,
          },
        },
      },
    });

    if (!operator) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Operator tidak ditemukan.');
    }

    let k = operator.kiosk;
    if (!k && operator.partnerId) {
      k = await this.prisma.kiosk.findFirst({
        where: { partnerId: operator.partnerId },
      });
    }

    if (!k) {
      throw new AppError(400, ErrorCode.NOT_FOUND, 'Operator belum ditugaskan ke booth tertentu.');
    }

    return {
      kioskId: k.id,
      code: k.code,
      name: k.name,
      location: k.location,
      status: k.status,
      paperRemaining: k.paperRemaining,
      paperRollCapacity: k.paperRollCapacity,
      printerStatus: k.printerStatus || 'READY',
      cameraStatus: k.cameraStatus || 'READY',
      isLocked: k.isLocked,
      lockReason: k.lockReason,
      receiptHeader: operator.partner?.receiptHeader,
      receiptFooter: operator.partner?.receiptFooter,
      partnerReceiptHeader: operator.partner?.receiptHeader,
      partnerReceiptFooter: operator.partner?.receiptFooter,
      receiptPaperWidth: operator.partner?.receiptPaperWidth || 58,
      receiptConfig: (operator.partner as any)?.receiptConfig || null,
      receiptAddress: (operator.partner as any)?.receiptAddress || null,
      receiptSocial: (operator.partner as any)?.receiptSocial || null,
      receiptPolicy: (operator.partner as any)?.receiptPolicy || null,
      partnerPhone: operator.partner?.phone || null,
    };
  }

  /**
   * Operator: Mengambil daftar paket sesi aktif khusus milik mitra dan menyaring paket disabled booth
   */
  async getOperatorPackages(operatorId: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: {
        kiosk: { select: { id: true, partnerId: true, disabledPackageIds: true } },
      },
    });

    if (!operator) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Operator tidak ditemukan.');
    }

    let targetKiosk = operator.kiosk;
    if (!targetKiosk && operator.partnerId) {
      targetKiosk = await this.prisma.kiosk.findFirst({
        where: { partnerId: operator.partnerId },
        select: { id: true, partnerId: true, disabledPackageIds: true },
      });
    }

    let packages: any[] = [];
    if (operator.partnerId) {
      packages = await (this.prisma.package as any).findMany({
        where: {
          partnerId: operator.partnerId,
          isActive: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
    }

    // Fallback bila mitra belum mengkustomisasi paket cabang
    if (packages.length === 0) {
      packages = await (this.prisma.package as any).findMany({
        where: { partnerId: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // Filter paket yang dinonaktifkan khusus pada booth ini (disabledPackageIds)
    if (targetKiosk && Array.isArray(targetKiosk.disabledPackageIds)) {
      const disabledSet = new Set(targetKiosk.disabledPackageIds as string[]);
      packages = packages.filter((pkg) => !disabledSet.has(pkg.id));
    }

    return packages;
  }

  /**
   * Operator: Ringkasan uang tunai dan performa shift kasir hari ini
   */
  async getOperatorShiftSummary(operatorId: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
    });
    if (!operator) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Operator tidak ditemukan.');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const passesToday = await this.prisma.accessCode.findMany({
      where: {
        operatorId,
        createdAt: { gte: todayStart },
      },
    });

    const totalCashAmount = passesToday.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPasses = passesToday.length;
    const usedPasses = passesToday.filter((p) => p.status === 'USED').length;
    const activePasses = passesToday.filter((p) => p.status === 'ACTIVE' && p.expiresAt > new Date()).length;
    const expiredPasses = passesToday.filter((p) => p.status === 'EXPIRED' || (p.status === 'ACTIVE' && p.expiresAt <= new Date())).length;
    const extraPrintsCount = passesToday
      .filter((p) => p.type === 'EXTRA_PRINT')
      .reduce((sum, p) => sum + (p.extraPrints || 1), 0);

    return {
      todayDate: todayStart.toISOString(),
      totalCashAmount,
      totalPasses,
      usedPasses,
      activePasses,
      expiredPasses,
      extraPrintsCount,
    };
  }

  /**
   * Operator: Generate kode sesi tunai (PASS-XXXX)
   * Mendukung Tipe Sesi Foto Baru dan Tipe Tambah Kuota Cetak Ekstra
   */
  async generateCashPass(operatorId: string, input: GeneratePassInput) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: { kiosk: true },
    });
    if (!operator) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Operator tidak ditemukan.');
    }

    let targetKioskId = operator.kioskId;
    if (!targetKioskId && operator.partnerId) {
      const partnerKiosk = await this.prisma.kiosk.findFirst({
        where: { partnerId: operator.partnerId },
      });
      if (partnerKiosk) targetKioskId = partnerKiosk.id;
    }

    let finalAmount = input.amount || 0;
    if (input.type === 'EXTRA_PRINT') {
      const count = input.extraPrints && input.extraPrints > 0 ? input.extraPrints : 1;
      finalAmount = input.amount || (count * 15000);
    } else if (input.packageId) {
      const pkg = await this.prisma.package.findUnique({ where: { id: input.packageId } });
      if (pkg) {
        finalAmount = input.amount !== undefined ? input.amount : pkg.price;
      }
    }

    const created = await this.accessCodeService.createAccessCode({
      packageId: input.type === 'EXTRA_PRINT' ? null : input.packageId,
      amount: finalAmount,
      type: input.type || 'SESSION',
      extraPrints: input.type === 'EXTRA_PRINT' ? (input.extraPrints || 1) : 0,
      customerNote: input.customerNote || `Kasir: ${operator.name}`,
      cashierName: operator.name,
      kioskId: targetKioskId || undefined,
      operatorId: operator.id,
      expiresInHours: 24,
    });

    humanLogger.success('OPERATOR', `Kode Tunai diterbitkan oleh ${operator.name}: [${created.code}] (${created.type})`);

    return created;
  }

  /**
   * Operator: Mengambil daftar riwayat kode PASS yang pernah diterbitkan oleh kasir ini
   */
  async getOperatorPasses(operatorId: string, limit = 50) {
    const passes = await this.prisma.accessCode.findMany({
      where: { operatorId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
      include: {
        package: { select: { id: true, name: true, price: true } },
        kiosk: { select: { id: true, code: true, name: true } },
      },
    });

    const now = new Date();
    return passes.map((p) => {
      let effectiveStatus = p.status as string;
      if (p.status === 'ACTIVE' && p.expiresAt < now) {
        effectiveStatus = 'EXPIRED';
      }

      return {
        id: p.id,
        code: p.code,
        type: p.type,
        extraPrints: p.extraPrints,
        amount: p.amount,
        status: effectiveStatus,
        customerNote: p.customerNote,
        packageName: p.package?.name || (p.type === 'EXTRA_PRINT' ? `Cetak Tambahan (${p.extraPrints} Lembar)` : 'Custom Nominal'),
        kioskCode: p.kiosk?.code || null,
        kioskName: p.kiosk?.name || null,
        expiresAt: p.expiresAt.toISOString(),
        usedAt: p.usedAt ? p.usedAt.toISOString() : null,
        usedSessionId: p.usedSessionId,
        createdAt: p.createdAt.toISOString(),
      };
    });
  }

  /**
   * Operator: Menyesuaikan sisa kertas pada booth tempat bertugas
   */
  async updateOperatorPaper(operatorId: string, paperRemaining: number) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: { kiosk: true },
    });
    if (!operator) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Operator tidak ditemukan.');
    }

    let targetKioskId = operator.kioskId;
    if (!targetKioskId) {
      const partnerKiosk = await this.prisma.kiosk.findFirst({
        where: { partnerId: operator.partnerId },
      });
      if (partnerKiosk) {
        targetKioskId = partnerKiosk.id;
      }
    }

    if (!targetKioskId) {
      throw new AppError(400, ErrorCode.NOT_FOUND, 'Operator belum ditugaskan ke booth mana pun.');
    }

    const updated = await this.prisma.kiosk.update({
      where: { id: targetKioskId },
      data: { paperRemaining: Math.max(0, paperRemaining) },
    });

    humanLogger.info('PRINTER', `Kasir ${operator.name} memperbarui sisa kertas [${updated.code}] menjadi ${updated.paperRemaining} lembar.`);

    return {
      kioskId: updated.id,
      code: updated.code,
      name: updated.name,
      paperRemaining: updated.paperRemaining,
      paperRollCapacity: updated.paperRollCapacity,
    };
  }

  /**
   * Operator: Pratinjau 10 sesi terakhir untuk memilih sesi yang gagal cetak
   */
  async getRecentSessions(operatorId: string, limit = 10) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
    });
    if (!operator) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Operator tidak ditemukan.');
    }

    let targetKioskId = operator.kioskId;
    if (!targetKioskId && operator.partnerId) {
      const partnerKiosk = await this.prisma.kiosk.findFirst({
        where: { partnerId: operator.partnerId },
      });
      if (partnerKiosk) {
        targetKioskId = partnerKiosk.id;
      } else {
        const anyKiosk = await this.prisma.kiosk.findFirst();
        if (anyKiosk) targetKioskId = anyKiosk.id;
      }
    }

    const whereClause: any = { state: 'COMPLETED' };
    if (targetKioskId) {
      whereClause.kioskId = targetKioskId;
    }

    const sessions = await this.prisma.session.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: Math.min(20, Math.max(1, limit)),
      include: {
        package: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, thumbnailUrl: true } },
        payments: { select: { id: true, orderId: true, grossAmount: true, transactionStatus: true } },
        accessCode: { select: { id: true, code: true, customerNote: true } },
        photos: { select: { id: true, storageUrl: true, localFilePath: true }, take: 1 },
      },
    });

    // Periksa apakah file print jpg tersedia di disk
    let diskFiles: string[] = [];
    try {
      if (fs.existsSync(this.printStorageDir)) {
        diskFiles = fs.readdirSync(this.printStorageDir);
      }
    } catch {}

    return sessions.map((s) => {
      const matchingFile = diskFiles.find((f) => f.startsWith(s.id) && f.endsWith('.jpg'));
      const printUrl = matchingFile ? `/storage/prints/${matchingFile}` : (s.photos[0]?.storageUrl || null);
      const payment = s.payments?.[0];
      const totalAmount = s.totalPrice || s.basePrice || payment?.grossAmount || 0;
      const orderId = payment?.orderId || s.id.slice(-8).toUpperCase();
      const customerName = s.accessCode?.customerNote || null;

      return {
        id: s.id,
        sessionCode: s.id.slice(-6).toUpperCase(),
        orderId,
        customerName,
        totalAmount,
        packageName: s.package?.name || 'Paket Standar',
        templateName: s.template?.name || 'Template Standar',
        templateThumbnail: s.template?.thumbnailUrl || null,
        printPreviewUrl: printUrl,
        finalPhotoUrl: s.photos[0]?.storageUrl || null,
        totalPrints: s.totalPrints,
        photosPrinted: s.photosPrinted,
        createdAt: s.createdAt.toISOString(),
      };
    });
  }

  /**
   * Operator: Memicu cetak ulang darurat (Reprint) untuk sesi tertentu
   */
  async reprintSession(operatorId: string, sessionId: string, copies = 1, reason?: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
    });
    if (!operator) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Operator tidak ditemukan.');
    }

    let targetKioskId = operator.kioskId;
    if (!targetKioskId && operator.partnerId) {
      const partnerKiosk = await this.prisma.kiosk.findFirst({
        where: { partnerId: operator.partnerId },
      });
      if (partnerKiosk) targetKioskId = partnerKiosk.id;
    }

    let session = targetKioskId
      ? await this.prisma.session.findFirst({ where: { id: sessionId, kioskId: targetKioskId } })
      : null;

    if (!session) {
      session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    }

    if (!session) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Sesi tidak ditemukan.');
    }

    humanLogger.warn('REPRINT', `Operator ${operator.name} memicu reprint darurat sesi: ${sessionId} (${copies} lembar)`);

    const result = await this.printService.reprintJob({
      sessionId,
      copies: Math.max(1, Math.min(4, copies)),
      reason: reason || `Reprint darurat oleh kasir: ${operator.name}`,
    });

    // Kurangi estimasi sisa kertas booth jika berhasil
    const kioskToDecrement = session.kioskId || targetKioskId;
    if (kioskToDecrement) {
      try {
        await this.prisma.kiosk.update({
          where: { id: kioskToDecrement },
          data: {
            paperRemaining: { decrement: copies },
          },
        });
      } catch {}
    }

    return result;
  }
}
