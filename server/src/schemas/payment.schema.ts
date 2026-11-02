// src/schemas/payment.schema.ts
// Zod schemas untuk Pembayaran & Konfirmasi Kasir
// Sesuai API_CONTRACT.md §3.6

import { z } from 'zod';

export const paymentMethodEnum = z.enum(['qris', 'cash']);
export const paymentStatusEnum = z.enum([
  'pending',
  'settlement',
  'expire',
  'cancel',
  'deny',
  'refund',
]);

export const createPaymentSchema = z.object({
  sessionId: z.string().min(1, 'Session ID wajib diisi'),
  paymentMethod: paymentMethodEnum.default('qris'),
  voucherCode: z.string().trim().optional(),
});

export const cashConfirmationSchema = z.object({
  orderId: z.string().min(1, 'Order ID wajib diisi'),
  pin: z.string().min(6, 'PIN minimal 6 digit').optional(),
  adminPin: z.string().min(6, 'PIN minimal 6 digit').optional(),
  receivedAmount: z.number().int().min(0, 'Jumlah uang diterima tidak valid'),
  operatorId: z.string().trim().max(100).optional(),
  cashierNote: z.string().trim().max(500).optional(),
}).refine((data) => data.pin || data.adminPin, {
  message: 'PIN admin wajib diisi',
  path: ['pin'],
});

export const createExtraPrintsPaymentSchema = z.object({
  sessionId: z.string().min(1, 'Session ID wajib diisi'),
  additionalPrints: z.number().int().min(1, 'Minimal 1 lembar tambahan'),
  paymentMethod: paymentMethodEnum.default('qris'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateExtraPrintsPaymentInput = z.infer<typeof createExtraPrintsPaymentSchema>;
export type CashConfirmationInput = z.infer<typeof cashConfirmationSchema>;
