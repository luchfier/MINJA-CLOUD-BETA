// src/schemas/voucher.schema.ts
// Zod schemas untuk Voucher Promosi & Validasi Diskon
// Sesuai API_CONTRACT.md §3.7

import { z } from 'zod';

export const validateVoucherSchema = z.object({
  code: z.string().trim().min(1, 'Kode voucher wajib diisi'),
  packageId: z.string().optional(),
  packagePrice: z.number().nonnegative().optional(),
  subtotal: z.number().nonnegative().default(0),
  kioskId: z.string().optional(),
}).transform((val) => ({
  code: val.code,
  packageId: val.packageId,
  subtotal: val.packagePrice !== undefined ? val.packagePrice : val.subtotal,
  kioskId: val.kioskId,
}));

export const createVoucherSchema = z.object({
  code: z.string().trim().min(2, 'Kode voucher minimal 2 karakter').toUpperCase(),
  name: z.string().trim().optional(),
  discountType: z.enum(['percentage', 'fixed']).default('percentage'),
  discountValue: z.number().positive('Nilai diskon harus lebih dari 0'),
  minSpend: z.number().nonnegative().default(0),
  maxDiscount: z.number().positive().optional().nullable(),
  validFrom: z.string().optional(),
  validUntil: z.string().min(1, 'Tanggal berlaku wajib diisi'),
  usageLimit: z.number().int().positive().default(100),
  isActive: z.boolean().default(true),
  partnerId: z.string().optional().nullable(),
  kioskId: z.string().optional().nullable(),
});

export const updateVoucherSchema = createVoucherSchema.partial();

export type ValidateVoucherInput = z.infer<typeof validateVoucherSchema>;
export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;

