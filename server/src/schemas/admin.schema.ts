// src/schemas/admin.schema.ts
// Zod schemas untuk validasi request Admin & Settings
// Sesuai API_CONTRACT.md §3.1, §3.2, §3.3

import { z } from 'zod';

export const adminLoginSchema = z.object({
  pin: z
    .string()
    .min(6, 'PIN minimal 6 digit')
    .max(12, 'PIN maksimal 12 digit')
    .regex(/^\d+$/, 'PIN hanya boleh berisi angka (digit)'),
});

export const adminChangePinSchema = z.object({
  currentPin: z
    .string()
    .min(6, 'PIN saat ini minimal 6 digit')
    .max(12, 'PIN saat ini maksimal 12 digit')
    .regex(/^\d+$/, 'PIN hanya boleh berisi angka'),
  newPin: z
    .string()
    .min(6, 'PIN baru minimal 6 digit')
    .max(12, 'PIN baru maksimal 12 digit')
    .regex(/^\d+$/, 'PIN baru hanya boleh berisi angka'),
});

const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const updateSettingsSchema = z.object({
  boothName: z.string().min(1).max(100).optional(),
  brandTitle: z.string().min(1).max(100).optional(),
  tagline: z.string().min(1).max(100).optional(),
  welcomeText: z.string().min(1).max(255).optional(),
  welcomeHeadline: z.string().min(1).max(255).optional(),
  welcomeSubheadline: z.string().max(500).nullable().optional(),
  startSessionButtonText: z.string().max(100).nullable().optional(),
  primaryColor: z.string().regex(hexColorRegex, 'Format warna harus hex (contoh: #6C5CE7)').optional(),
  secondaryColor: z.string().regex(hexColorRegex, 'Format warna harus hex (contoh: #A29BFE)').optional(),
  accentColor: z.string().regex(hexColorRegex, 'Format warna harus hex (contoh: #A29BFE)').optional(),
  darkSurfaceColor: z.string().regex(hexColorRegex, 'Format warna harus hex').optional(),
  logoUrl: z.string().nullable().optional(),
  wallpaperUrl: z.string().nullable().optional(),
  attractVideoUrl: z.string().nullable().optional(),
  backgroundBlur: z.number().int().min(0).max(50).optional(),
  backgroundOverlayOpacity: z.number().int().min(0).max(100).optional(),
  backgroundFit: z.enum(['cover', 'contain', 'repeat']).optional(),
  backgroundOpacity: z.number().int().min(10).max(100).optional(),
  logoHeight: z.number().int().min(24).max(200).optional(),
  glassmorphismIntensity: z.enum(['light', 'medium', 'heavy']).optional(),
  enableVignette: z.boolean().optional(),
  footerFeature1: z.string().max(100).nullable().optional(),
  footerFeature2: z.string().max(100).nullable().optional(),
  footerFeature3: z.string().max(100).nullable().optional(),
  footerTouchPrompt: z.string().max(150).nullable().optional(),
  retentionHours: z.number().int().min(1).max(720).optional(),
  maxSessionTimeoutSeconds: z.number().int().min(60).max(3600).optional(),
  paymentTimeoutSeconds: z.number().int().min(60).max(1800).optional(),
  autoResetSeconds: z.number().int().min(5).max(300).optional(),
  maintenanceMode: z.boolean().optional(),
  emailDeliveryEnabled: z.boolean().optional(),
  galleryEnabled: z.boolean().optional(),
  livePhotoEnabled: z.boolean().optional(),
  selectedCameraId: z.string().nullable().optional(),
  selectedPrinterName: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  instagramHandle: z.string().nullable().optional(),
  studioAddress: z.string().nullable().optional(),
  promoHeadline: z.string().nullable().optional(),
  promoSubheadline: z.string().nullable().optional(),
  eventPackages: z.any().optional(),
  pageBuilderLanding: z.any().optional(),
  pageBuilderGallery: z.any().optional(),
  customCss: z.string().nullable().optional(),
  welcomeAnimationType: z.string().nullable().optional(),
  welcomeMusicEnabled: z.boolean().optional(),
  welcomeMusicVolume: z.number().int().min(0).max(100).optional(),
  welcomeMusicPreset: z.string().nullable().optional(),
  welcomeMusicCustomUrl: z.string().nullable().optional(),
}).passthrough();
