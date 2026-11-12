// src/schemas/session.schema.ts
// Zod schemas untuk Sesi Pelanggan (Sessions)
// Sesuai API_CONTRACT.md §3.5

import { z } from 'zod';

export const sessionStateEnum = z.enum([
  'AWAITING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'CAPTURE_ACTIVE',
  'PHOTO_REVIEW',
  'PHOTO_EDITING',
  'RENDERING',
  'PRINTING',
  'SHARING',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]);

export const createSessionSchema = z.object({
  id: z.string().min(3).max(64).optional(),
  packageId: z.string().min(1, 'Package ID wajib diisi'),
  additionalPrints: z.number().int().min(0).max(20).default(0),
});

export const updateSessionStateSchema = z.object({
  state: sessionStateEnum,
  shotsTaken: z.number().int().min(0).optional(),
  photosSelected: z.number().int().min(0).optional(),
});

export const settledPaymentSyncSchema = z.object({
  orderId: z.string().min(3).max(80),
  grossAmount: z.number().int().min(0),
  basePrice: z.number().int().min(0).optional(),
  discountAmount: z.number().int().min(0).optional(),
  paymentMethod: z.string().max(40).optional(),
  voucherCode: z.string().max(40).optional(),
  settlementTime: z.string().optional(),
  cashierName: z.string().max(80).optional(),
  cashierNote: z.string().max(200).optional(),
  printCopies: z.number().int().min(1).optional(),
});

export const completeSessionSchema = z.object({
  packageId: z.string().optional(),
  shotsTaken: z.number().int().min(0).default(0),
  photosSelected: z.number().int().min(0).default(0),
  photosPrinted: z.number().int().min(0).default(0),
  templateId: z.string().optional(),
  finalPhotoUrl: z.string().optional(),
  settledPayments: z.array(settledPaymentSyncSchema).optional(),
});

export const cancelSessionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionStateInput = z.infer<typeof updateSessionStateSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;
