// src/schemas/package.schema.ts
// Zod schema untuk validasi request Package (Paket Sesi)
// Sesuai API_CONTRACT.md §3.3

import { z } from 'zod';

export const createPackageSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama paket wajib diisi').max(100, 'Nama maksimal 100 karakter'),
    badge: z.string().trim().max(50, 'Badge maksimal 50 karakter').optional().nullable(),
    description: z.string().trim().max(500, 'Deskripsi maksimal 500 karakter').default(''),
    price: z
      .number()
      .int('Harga harus berupa angka bulat')
      .min(0, 'Harga minimal 0')
      .refine((val) => val % 500 === 0, 'Harga harus kelipatan 500 rupiah'),
    durationSeconds: z.number().int().min(30, 'Durasi minimal 30 detik').max(1800, 'Durasi maksimal 1800 detik'),
    maxShots: z.number().int().min(1, 'Maksimal jepret minimal 1').max(50, 'Maksimal jepret maksimal 50').default(8),
    maxSelections: z.number().int().min(1, 'Maksimal foto terpilih minimal 1').default(6),
    defaultPrints: z.number().int().min(0, 'Cetak default minimal 0').max(20, 'Cetak default maksimal 20').default(1),
    additionalPrintPrice: z.number().int().min(0, 'Harga cetak tambahan minimal 0').default(0),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.maxSelections <= data.maxShots, {
    message: 'Maksimal foto terpilih (maxSelections) tidak boleh melebihi total jepret (maxShots)',
    path: ['maxSelections'],
  });

export const updatePackageSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    badge: z.string().trim().max(50).optional().nullable(),
    description: z.string().trim().max(500).optional(),
    price: z
      .number()
      .int()
      .min(0)
      .refine((val) => val % 500 === 0, 'Harga harus kelipatan 500 rupiah')
      .optional(),
    durationSeconds: z.number().int().min(30).max(1800).optional(),
    maxShots: z.number().int().min(1).max(50).optional(),
    maxSelections: z.number().int().min(1).optional(),
    defaultPrints: z.number().int().min(0).max(10).optional(),
    additionalPrintPrice: z.number().int().min(0).optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });
