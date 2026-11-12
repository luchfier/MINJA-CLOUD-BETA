// src/schemas/delivery.schema.ts
// Zod validation schemas untuk pengiriman Email Galeri Cloud

import { z } from 'zod';

export const sendEmailSchema = z.object({
  email: z.string().email('Alamat email tidak valid').max(150),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
