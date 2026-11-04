// src/services/settings.service.ts
// Service pengelolaan konfigurasi & branding booth
// Sesuai API_CONTRACT.md §3.2, §3.3

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import type { updateSettingsSchema } from '../schemas/admin.schema.js';
import { logAuditEvent } from './audit.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BRANDING_DIR = path.resolve(__dirname, '../../storage/branding');

export function ensureBrandingDir(): void {
  if (!fs.existsSync(BRANDING_DIR)) {
    fs.mkdirSync(BRANDING_DIR, { recursive: true });
  }
}

/**
 * Menyimpan file branding (logo / wallpaper) base64 ke file fisik di disk lokal (server/storage/branding/)
 * Mengurangi ukuran payload database & local storage dari megabytes menjadi URL singkat ~35 bytes
 */
export async function persistBrandingFile(
  sourceUrl: string | null | undefined,
  type: 'logo' | 'wallpaper'
): Promise<string | null | undefined> {
  if (sourceUrl === null) return null;
  if (!sourceUrl || typeof sourceUrl !== 'string') return sourceUrl;

  const trimmed = sourceUrl.trim();
  if (trimmed === '') return '';

  // Jika bukan Data URL Base64 (misal: sudah berupa /storage/branding/... atau http://), pertahankan apa adanya
  if (!trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  try {
    ensureBrandingDir();
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) return trimmed;

    const mimeMatch = trimmed.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
    let ext = 'png';
    const mime = mimeMatch?.[1]?.toLowerCase();
    if (mime) {
      if (mime === 'jpeg' || mime === 'jpg') ext = 'jpg';
      else if (mime === 'webp') ext = 'webp';
      else if (mime === 'svg+xml' || mime === 'svg') ext = 'svg';
      else ext = 'png';
    }

    const base64Data = trimmed.slice(commaIdx + 1);
    const buffer = Buffer.from(base64Data, 'base64');

    const fileName = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(BRANDING_DIR, fileName);

    await fs.promises.writeFile(filePath, buffer);
    return `/storage/branding/${fileName}`;
  } catch (err) {
    console.warn(`[SettingsService] Gagal menyimpan file branding ${type}:`, err);
    return trimmed;
  }
}

/**
 * Menghapus file branding lama dari disk jika diganti atau dihapus
 */
export async function cleanupOldBrandingFile(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined
): Promise<void> {
  if (!oldUrl || typeof oldUrl !== 'string') return;
  if (oldUrl === newUrl) return;

  // Hanya bersihkan file di dalam /storage/branding/
  if (!oldUrl.startsWith('/storage/branding/')) return;

  try {
    const fileName = path.basename(oldUrl);
    const filePath = path.join(BRANDING_DIR, fileName);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn('[SettingsService] Gagal menghapus file branding fisik lama:', err);
  }
}

function parseKioskTheme(customCss: string | null | undefined): Record<string, any> {
  if (!customCss || typeof customCss !== 'string') return {};
  try {
    const trimmed = customCss.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed);
    }
  } catch (err) {
    console.warn('[SettingsService] Gagal parse customCss JSON:', err);
  }
  return {};
}

export class SettingsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Otomatis memigrasikan logo & wallpaper lama yang masih berformat Base64 ke disk fisik
   */
  private async migrateLegacyBranding<T extends { id: string; logoUrl?: string | null; wallpaperUrl?: string | null }>(
    settings: T
  ): Promise<T> {
    if (!settings) return settings;

    let needsUpdate = false;
    let newLogoUrl = settings.logoUrl;
    let newWallpaperUrl = settings.wallpaperUrl;

    if (typeof settings.logoUrl === 'string' && settings.logoUrl.startsWith('data:image/')) {
      newLogoUrl = (await persistBrandingFile(settings.logoUrl, 'logo')) ?? null;
      needsUpdate = true;
    }

    if (typeof settings.wallpaperUrl === 'string' && settings.wallpaperUrl.startsWith('data:image/')) {
      newWallpaperUrl = (await persistBrandingFile(settings.wallpaperUrl, 'wallpaper')) ?? null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        const updated = await this.prisma.settings.update({
          where: { id: settings.id },
          data: {
            logoUrl: newLogoUrl,
            wallpaperUrl: newWallpaperUrl,
          },
        });
        return updated as unknown as T;
      } catch (err) {
        console.warn('[SettingsService] Gagal memigrasikan branding lama ke disk:', err);
      }
    }

    return settings;
  }

  /**
   * Konfigurasi publik untuk tampilan booth / pelanggan
   * GET /api/settings
   */
  async getPublicSettings() {
    let settings = await this.prisma.settings.findFirst();

    if (!settings) {
      // Inisialisasi default jika belum ada
      settings = await this.prisma.settings.create({
        data: {
          boothName: 'MinjaPhotobooth',
          brandTitle: 'Minja Photobooth',
          welcomeText: 'Selamat datang!',
          primaryColor: '#6C5CE7',
          secondaryColor: '#A29BFE',
        },
      });
    }

    // Auto-migrasikan jika masih ada Base64 lama
    const activeSettings = await this.migrateLegacyBranding(settings);
    const kioskTheme = parseKioskTheme(activeSettings.customCss);

    return {
      boothName: activeSettings.boothName,
      brandTitle: activeSettings.brandTitle,
      tagline: activeSettings.brandTitle,
      welcomeText: activeSettings.welcomeText,
      welcomeHeadline: activeSettings.welcomeText,
      primaryColor: activeSettings.primaryColor,
      secondaryColor: activeSettings.secondaryColor,
      accentColor: activeSettings.secondaryColor,
      logoUrl: activeSettings.logoUrl,
      wallpaperUrl: activeSettings.wallpaperUrl,
      attractVideoUrl: activeSettings.attractVideoUrl,
      maintenanceMode: activeSettings.maintenanceMode,
      emailDeliveryEnabled: activeSettings.emailDeliveryEnabled,
      galleryEnabled: activeSettings.galleryEnabled,
      livePhotoEnabled: activeSettings.livePhotoEnabled,
      paymentTimeoutSeconds: activeSettings.paymentTimeoutSeconds,
      autoResetSeconds: activeSettings.autoResetSeconds,
      whatsappNumber: activeSettings.whatsappNumber,
      instagramHandle: activeSettings.instagramHandle,
      studioAddress: activeSettings.studioAddress,
      promoHeadline: activeSettings.promoHeadline,
      promoSubheadline: activeSettings.promoSubheadline,
      eventPackages: activeSettings.eventPackages,
      pageBuilderLanding: activeSettings.pageBuilderLanding,
      pageBuilderGallery: activeSettings.pageBuilderGallery,
      customCss: activeSettings.customCss || '',
      // Extended Kiosk Theme Configs
      ...kioskTheme,
    };
  }

  /**
   * Seluruh konfigurasi sistem untuk Admin
   * GET /api/admin/settings
   */
  async getAllSettings() {
    let settings = await this.prisma.settings.findFirst();

    if (!settings) {
      settings = await this.prisma.settings.create({
        data: {},
      });
    }

    // Auto-migrasikan jika masih ada Base64 lama
    settings = await this.migrateLegacyBranding(settings);
    const kioskTheme = parseKioskTheme(settings.customCss);

    return {
      ...settings,
      tagline: settings.brandTitle,
      welcomeHeadline: settings.welcomeText,
      accentColor: settings.secondaryColor,
      ...kioskTheme,
    };
  }

  /**
   * Memperbarui konfigurasi sistem
   * PUT /api/admin/settings
   */
  async updateSettings(
    data: z.infer<typeof updateSettingsSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    let settings = await this.prisma.settings.findFirst();

    if (!settings) {
      settings = await this.prisma.settings.create({
        data: {},
      });
    }

    const sanitizedData: any = { ...data };

    // Normalisasi sinonim field frontend
    if (sanitizedData.tagline !== undefined && sanitizedData.brandTitle === undefined) {
      sanitizedData.brandTitle = sanitizedData.tagline;
    }
    if (sanitizedData.welcomeHeadline !== undefined && sanitizedData.welcomeText === undefined) {
      sanitizedData.welcomeText = sanitizedData.welcomeHeadline;
    }
    if (sanitizedData.accentColor !== undefined && sanitizedData.secondaryColor === undefined) {
      sanitizedData.secondaryColor = sanitizedData.accentColor;
    }

    // Ekstrak & simpan file logo jika dikirim sebagai Base64
    if (sanitizedData.logoUrl !== undefined) {
      const newLogoUrl = await persistBrandingFile(sanitizedData.logoUrl, 'logo');
      if (settings.logoUrl && settings.logoUrl !== newLogoUrl) {
        await cleanupOldBrandingFile(settings.logoUrl, newLogoUrl);
      }
      sanitizedData.logoUrl = newLogoUrl ?? null;
    }

    // Ekstrak & simpan file wallpaper jika dikirim sebagai Base64
    if (sanitizedData.wallpaperUrl !== undefined) {
      const newWallpaperUrl = await persistBrandingFile(sanitizedData.wallpaperUrl, 'wallpaper');
      if (settings.wallpaperUrl && settings.wallpaperUrl !== newWallpaperUrl) {
        await cleanupOldBrandingFile(settings.wallpaperUrl, newWallpaperUrl);
      }
      sanitizedData.wallpaperUrl = newWallpaperUrl ?? null;
    }

    // Kumpulkan seluruh konfigurasi visual/audio kiosk yang diperluas
    const existingKioskTheme = parseKioskTheme(settings.customCss);
    const updatedKioskTheme = {
      ...existingKioskTheme,
      ...(sanitizedData.welcomeSubheadline !== undefined && { welcomeSubheadline: sanitizedData.welcomeSubheadline }),
      ...(sanitizedData.startSessionButtonText !== undefined && { startSessionButtonText: sanitizedData.startSessionButtonText }),
      ...(sanitizedData.darkSurfaceColor !== undefined && { darkSurfaceColor: sanitizedData.darkSurfaceColor }),
      ...(sanitizedData.backgroundBlur !== undefined && { backgroundBlur: sanitizedData.backgroundBlur }),
      ...(sanitizedData.backgroundOverlayOpacity !== undefined && { backgroundOverlayOpacity: sanitizedData.backgroundOverlayOpacity }),
      ...(sanitizedData.backgroundFit !== undefined && { backgroundFit: sanitizedData.backgroundFit }),
      ...(sanitizedData.backgroundOpacity !== undefined && { backgroundOpacity: sanitizedData.backgroundOpacity }),
      ...(sanitizedData.logoHeight !== undefined && { logoHeight: sanitizedData.logoHeight }),
      ...(sanitizedData.glassmorphismIntensity !== undefined && { glassmorphismIntensity: sanitizedData.glassmorphismIntensity }),
      ...(sanitizedData.enableVignette !== undefined && { enableVignette: sanitizedData.enableVignette }),
      ...(sanitizedData.footerFeature1 !== undefined && { footerFeature1: sanitizedData.footerFeature1 }),
      ...(sanitizedData.footerFeature2 !== undefined && { footerFeature2: sanitizedData.footerFeature2 }),
      ...(sanitizedData.footerFeature3 !== undefined && { footerFeature3: sanitizedData.footerFeature3 }),
      ...(sanitizedData.footerTouchPrompt !== undefined && { footerTouchPrompt: sanitizedData.footerTouchPrompt }),
    };

    // Filter agar HANYA kolom prisma resmi yang dimasukkan ke query prisma.settings.update
    const validPrismaColumns = new Set([
      'boothName',
      'brandTitle',
      'welcomeText',
      'primaryColor',
      'secondaryColor',
      'logoUrl',
      'wallpaperUrl',
      'attractVideoUrl',
      'whatsappNumber',
      'instagramHandle',
      'studioAddress',
      'promoHeadline',
      'promoSubheadline',
      'eventPackages',
      'pageBuilderLanding',
      'pageBuilderGallery',
      'customCss',
      'retentionHours',
      'maxSessionTimeoutSeconds',
      'paymentTimeoutSeconds',
      'autoResetSeconds',
      'maintenanceMode',
      'emailDeliveryEnabled',
      'galleryEnabled',
      'livePhotoEnabled',
      'selectedCameraId',
      'selectedPrinterName',
    ]);

    const prismaData: Record<string, any> = {};
    for (const key of Object.keys(sanitizedData)) {
      if (validPrismaColumns.has(key)) {
        prismaData[key] = sanitizedData[key];
      }
    }
    // Simpan serialisasi JSON kiosk theme ke customCss
    prismaData.customCss = JSON.stringify(updatedKioskTheme);

    const updated = await this.prisma.settings.update({
      where: { id: settings.id },
      data: prismaData,
    });

    await logAuditEvent(this.prisma, {
      action: 'SETTINGS_UPDATED',
      adminId,
      ipAddress,
      details: { changedFields: Object.keys(data) },
    });

    return {
      ...updated,
      tagline: updated.brandTitle,
      welcomeHeadline: updated.welcomeText,
      accentColor: updated.secondaryColor,
      ...updatedKioskTheme,
    };
  }
}
