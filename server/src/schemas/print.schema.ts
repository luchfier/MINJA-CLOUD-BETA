// src/schemas/print.schema.ts
// Zod schemas untuk Perintah Cetak Fisik Studio & Windows Spooler
// Sesuai ARCHITECTURE.md §3 & THE_NEXT_STEP.md §4

import { z } from 'zod';

export const submitPrintJobSchema = z.object({
  sessionId: z.string().min(1, 'Session ID wajib diisi'),
  copies: z.number().int().min(1, 'Minimal 1 lembar cetak').default(1),
  layoutImageUrl: z.string().min(1, 'Layout image data URL / path wajib diisi'),
  printerName: z.string().trim().optional(),
});

export const testPrintSchema = z.object({
  printerName: z.string().trim().optional(),
});

export const reprintJobSchema = z.object({
  sessionId: z.string().min(1, 'Session ID wajib diisi'),
  reason: z.string().trim().min(3, 'Alasan audit reprint minimal 3 karakter'),
  copies: z.number().int().min(1, 'Minimal 1 lembar cetak').default(1),
  printerName: z.string().trim().optional(),
  adminPin: z.string().min(6).optional(),
});

export const printerSettingsSchema = z.object({
  borderless: z.boolean().default(true),
  orientation: z.enum(['portrait', 'landscape', 'auto']).default('portrait'),
  marginTopMm: z.number().default(0),
  marginBottomMm: z.number().default(0),
  marginLeftMm: z.number().default(0),
  marginRightMm: z.number().default(0),
  colorMode: z.enum(['color', 'grayscale', 'vivid']).default('color'),
  autoCut: z.boolean().default(true),
  dpi: z.number().default(300),
  customPaperName: z.string().trim().optional(),
  customPaperWidthMm: z.number().optional(),
  customPaperHeightMm: z.number().optional(),
  printQuality: z.enum(['standard', 'high', 'photo_fine', 'ultra_glossy']).default('photo_fine').optional(),
  mediaType: z.enum(['glossy', 'luster', 'matte', 'plain']).default('glossy').optional(),
  sharpening: z.enum(['off', 'low', 'medium', 'high']).default('medium').optional(),
  brightnessOffset: z.number().min(-50).max(50).default(0).optional(),
  contrastOffset: z.number().min(-50).max(50).default(0).optional(),
});

export const savePrinterConfigSchema = z.object({
  printerName: z.string().trim().min(1, 'Nama printer wajib diisi'),
  displayName: z.string().trim().optional(),
  paperSize: z.string().default('Standard'),
  isDefault: z.boolean().default(true),
  isActive: z.boolean().default(true),
  settings: printerSettingsSchema.optional(),
});

export type SubmitPrintJobInput = z.infer<typeof submitPrintJobSchema>;
export type TestPrintInput = z.infer<typeof testPrintSchema>;
export type ReprintJobInput = z.infer<typeof reprintJobSchema>;
export type PrinterSettings = z.infer<typeof printerSettingsSchema>;
export type SavePrinterConfigInput = z.infer<typeof savePrinterConfigSchema>;
