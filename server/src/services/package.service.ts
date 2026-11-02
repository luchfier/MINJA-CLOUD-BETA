// src/services/package.service.ts
// Service manajemen paket foto (Packages)
// Sesuai API_CONTRACT.md §3.3

import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import type { z } from 'zod';
import type { createPackageSchema, updatePackageSchema } from '../schemas/package.schema.js';
import { logAuditEvent } from './audit.service.js';

export class PackageService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Mengambil daftar paket aktif untuk pelanggan / booth
   * Menyesuaikan secara dinamis dengan paket cabang mitra dan status disable per booth
   * GET /api/public/packages dan GET /api/packages
   */
  async getActivePackages(kioskId?: string) {
    let targetKiosk: any = null;

    if (kioskId) {
      targetKiosk = await this.prisma.kiosk.findUnique({
        where: { id: kioskId },
        select: { id: true, partnerId: true, disabledPackageIds: true },
      });
    } else {
      // Periksa apakah booth ini memiliki BOOTH_API_KEY terdaftar
      const rawKey = process.env['BOOTH_API_KEY'];
      if (rawKey && rawKey !== 'dev-booth-key-for-testing' && rawKey !== 'ganti-dengan-string-unik-per-mesin') {
        targetKiosk = await this.prisma.kiosk.findUnique({
          where: { apiKey: rawKey.trim() },
          select: { id: true, partnerId: true, disabledPackageIds: true },
        });
      }
    }

    let packages: any[] = [];
    if (targetKiosk && targetKiosk.partnerId) {
      // Ambil paket khusus milik cabang mitra
      packages = await (this.prisma.package as any).findMany({
        where: {
          partnerId: targetKiosk.partnerId,
          isActive: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });

      // Fallback bila mitra belum pernah mengkustomisasi paket
      if (packages.length === 0) {
        packages = await (this.prisma.package as any).findMany({
          where: { partnerId: null, isActive: true },
          orderBy: { sortOrder: 'asc' },
        });
      }
    } else {
      // Standalone Booth / Minja Pusat
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
   * Mengambil semua paket (termasuk nonaktif) dengan paginasi untuk Admin
   * GET /api/admin/packages
   */
  async getAllPackages(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.package.findMany({
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.package.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mengambil detail paket berdasarkan ID
   */
  async getPackageById(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
    });

    if (!pkg) {
      throw new AppError(404, ErrorCode.PACKAGE_NOT_FOUND, 'Paket tidak ditemukan');
    }

    return pkg;
  }

  /**
   * Membuat paket baru
   * POST /api/admin/packages
   */
  async createPackage(
    data: z.infer<typeof createPackageSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    // Cek duplikasi nama di antara paket aktif
    const existing = await this.prisma.package.findFirst({
      where: { name: data.name, isActive: true },
    });

    if (existing) {
      throw new AppError(
        409,
        ErrorCode.CONFLICT,
        `Paket dengan nama '${data.name}' sudah ada dan sedang aktif`
      );
    }

    const pkg = await this.prisma.package.create({
      data,
    });

    await logAuditEvent(this.prisma, {
      action: 'PACKAGE_CREATED',
      adminId,
      ipAddress,
      details: { packageId: pkg.id, name: pkg.name, price: pkg.price },
    });

    return pkg;
  }

  /**
   * Memperbarui paket
   * PUT /api/admin/packages/:id
   */
  async updatePackage(
    id: string,
    data: z.infer<typeof updatePackageSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    const existing = await this.getPackageById(id);

    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.package.findFirst({
        where: { name: data.name, isActive: true, id: { not: id } },
      });

      if (duplicate) {
        throw new AppError(
          409,
          ErrorCode.CONFLICT,
          `Paket aktif lain dengan nama '${data.name}' sudah ada`
        );
      }
    }

    // Validasi konsistensi selections & shots jika diubah
    const maxShots = data.maxShots ?? existing.maxShots;
    const maxSelections = data.maxSelections ?? existing.maxSelections;
    const defaultPrints = data.defaultPrints ?? existing.defaultPrints;

    if (maxSelections > maxShots) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Maksimal foto terpilih (maxSelections) tidak boleh melebihi maxShots'
      );
    }

    if (defaultPrints > maxSelections) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Jumlah cetak default tidak boleh melebihi maxSelections'
      );
    }

    const updated = await this.prisma.package.update({
      where: { id },
      data,
    });

    await logAuditEvent(this.prisma, {
      action: 'PACKAGE_UPDATED',
      adminId,
      ipAddress,
      details: { packageId: id, changedFields: Object.keys(data) },
    });

    return updated;
  }

  /**
   * Menghapus paket atau menonaktifkan jika memiliki relasi transaksi
   * DELETE /api/admin/packages/:id
   */
  async deletePackage(id: string, adminId?: string, ipAddress?: string) {
    const pkg = await this.getPackageById(id);

    // Cek apakah paket pernah dipakai dalam riwayat sesi atau kode akses
    const [sessionCount, accessCodeCount] = await Promise.all([
      this.prisma.session.count({ where: { packageId: id } }),
      this.prisma.accessCode.count({ where: { packageId: id } }),
    ]);

    if (sessionCount > 0 || accessCodeCount > 0) {
      // Jika pernah dipakai dalam sesi/transaksi, soft-delete (nonaktifkan) agar relasi audit pembukuan tidak rusak
      const updated = await this.prisma.package.update({
        where: { id },
        data: { isActive: false },
      });

      await logAuditEvent(this.prisma, {
        action: 'PACKAGE_DEACTIVATED',
        adminId,
        ipAddress,
        details: { packageId: id, name: updated.name, reason: `Memiliki ${sessionCount} riwayat sesi` },
      });

      return {
        message: `Paket dinonaktifkan (memiliki ${sessionCount} riwayat sesi transaksi)`,
        deleted: false,
        deactivated: true,
      };
    }

    // Jika belum pernah digunakan sama sekali (0 transaksi), HAPUS PERMANEN dari database
    await this.prisma.package.delete({
      where: { id },
    });

    await logAuditEvent(this.prisma, {
      action: 'PACKAGE_DELETED',
      adminId,
      ipAddress,
      details: { packageId: id, name: pkg.name },
    });

    return {
      message: 'Paket berhasil dihapus permanen dari database',
      deleted: true,
      deactivated: false,
    };
  }

  async deactivatePackage(id: string, adminId?: string, ipAddress?: string) {
    return this.deletePackage(id, adminId, ipAddress);
  }
}
