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
  packageId: z.string().min(1, 'Package ID wajib diisi'),
  additionalPrints: z.number().int().min(0).max(20).default(0),
});

export const updateSessionStateSchema = z.object({
  state: sessionStateEnum,
  shotsTaken: z.number().int().min(0).optional(),
  photosSelected: z.number().int().min(0).optional(),
});

export const completeSessionSchema = z.object({
  shotsTaken: z.number().int().min(0).default(0),
  photosSelected: z.number().int().min(0).default(0),
  photosPrinted: z.number().int().min(0).default(0),
});

export const cancelSessionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionStateInput = z.infer<typeof updateSessionStateSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;
