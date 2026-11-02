import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import type { z } from 'zod';
import type { createTemplateSchema, updateTemplateSchema } from '../schemas/template.schema.js';
import { logAuditEvent } from './audit.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRAMES_DIR = path.resolve(__dirname, '../../storage/frames');

function ensureFramesDir() {
  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
  }
}

/**
 * Menyimpan gambar base64 ke file fisik di disk lokal (server/storage/frames/)
 * Mengurangi ukuran payload database dari megabytes menjadi URL singkat ~30 bytes
 */
async function persistFrameFile(sourceUrl: string, identifier: string): Promise<string> {
  if (!sourceUrl || !sourceUrl.startsWith('data:image/')) {
    return sourceUrl;
  }

  try {
    ensureFramesDir();
    const commaIdx = sourceUrl.indexOf(',');
    if (commaIdx === -1) return sourceUrl;

    const mimeMatch = sourceUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
    const ext = mimeMatch && mimeMatch[1] === 'jpeg' ? 'jpg' : (mimeMatch?.[1] || 'png');
    const base64Data = sourceUrl.slice(commaIdx + 1);
    const buffer = Buffer.from(base64Data, 'base64');

    const safeId = identifier.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
    const safeName = `frame_${safeId}_${Date.now()}.${ext}`;
    const filePath = path.join(FRAMES_DIR, safeName);
    await fs.promises.writeFile(filePath, buffer);

    return `/storage/frames/${safeName}`;
  } catch (err) {
    console.warn('[TemplateService] Warning gagal menyimpan frame ke disk, fallback ke string:', err);
    return sourceUrl;
  }
}

export class TemplateService {
  constructor(private prisma: PrismaClient) { }

  private mapTemplateWithLayer<T extends { slots: any }>(t: T): T & { frameLayer: 'overlay' | 'underlay' } {
    const slotsArr = Array.isArray(t.slots) ? t.slots : [];
    const frameLayer = (slotsArr[0]?.frameLayer === 'underlay' ? 'underlay' : 'overlay') as 'overlay' | 'underlay';
    return {
      ...t,
      frameLayer,
    };
  }

  /**
   * Mengambil template aktif untuk pelanggan / booth
   * GET /api/public/templates dan GET /api/templates
   */
  async getActiveTemplates() {
    const templates = await this.prisma.template.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return templates.map((t) => this.mapTemplateWithLayer(t));
  }

  /**
   * Mengambil semua template untuk Admin dengan paginasi
   * GET /api/admin/templates
   */
  async getAllTemplates(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.template.findMany({
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.template.count(),
    ]);

    return {
      items: items.map((t) => this.mapTemplateWithLayer(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mengambil template berdasarkan ID
   */
  async getTemplateById(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new AppError(404, ErrorCode.TEMPLATE_NOT_FOUND, 'Template tidak ditemukan');
    }

    return this.mapTemplateWithLayer(template);
  }

  /**
   * Membuat template baru
   * POST /api/admin/templates
   */
  async createTemplate(
    data: z.infer<typeof createTemplateSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    // Filter out client-side fields that don't exist on Prisma Template model
    const { isDefault: _isDefault, category: _category, frameLayer = 'overlay', slots, ...prismaData } = data;

    // Attach frameLayer into slots JSON so it persists reliably without breaking Prisma engine DLLs
    const enrichedSlots = Array.isArray(slots)
      ? slots.map((s) => ({ ...s, frameLayer }))
      : [];

    // Persist frame PNG to local disk (/storage/frames/) if base64 Data URL to prevent DB bloat
    const tempId = `new_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalFrameUrl = await persistFrameFile(prismaData.frameOverlayUrl, tempId);

    const template = await this.prisma.template.create({
      data: {
        name: prismaData.name,
        thumbnailUrl: prismaData.thumbnailUrl || '',
        frameOverlayUrl: finalFrameUrl,
        orientation: prismaData.orientation || 'portrait',
        slotsCount: prismaData.slotsCount ?? (enrichedSlots.length || 1),
        slots: enrichedSlots as any,
        isActive: prismaData.isActive ?? true,
      },
    });

    await logAuditEvent(this.prisma, {
      action: 'TEMPLATE_CREATED',
      adminId,
      ipAddress,
      details: { templateId: template.id, name: template.name },
    });

    return {
      ...template,
      frameLayer,
    };
  }

  /**
   * Memperbarui template yang ada
   * PUT /api/admin/templates/:id
   */
  async updateTemplate(
    id: string,
    data: z.infer<typeof updateTemplateSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    const existing = await this.getTemplateById(id);

    // Filter out virtual/client fields like isDefault, category, and frameLayer that don't exist on Prisma Template model
    const { isDefault: _isDefault, category: _category, frameLayer, slots, ...prismaData } = data;

    const targetLayer = frameLayer || existing.frameLayer || 'overlay';

    let updatedSlots = slots;
    if (slots) {
      updatedSlots = slots.map((s) => ({ ...s, frameLayer: targetLayer }));
    } else if (frameLayer && Array.isArray(existing.slots)) {
      updatedSlots = (existing.slots as any[]).map((s) => ({ ...s, frameLayer: targetLayer }));
    }

    // Persist frame PNG to local disk (/storage/frames/) if new base64 Data URL
    let finalFrameUrl = prismaData.frameOverlayUrl;
    if (finalFrameUrl && finalFrameUrl.startsWith('data:image/')) {
      finalFrameUrl = await persistFrameFile(finalFrameUrl, id);
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        ...prismaData,
        frameOverlayUrl: finalFrameUrl,
        slots: updatedSlots ? (updatedSlots as any) : undefined,
      },
    });

    await logAuditEvent(this.prisma, {
      action: 'TEMPLATE_UPDATED',
      adminId,
      ipAddress,
      details: { templateId: id, changedFields: Object.keys(data) },
    });

    return {
      ...updated,
      frameLayer: targetLayer,
    };
  }

  /**
   * Menghapus template secara permanen
   * DELETE /api/admin/templates/:id
   */
  async deleteTemplate(id: string, adminId?: string, ipAddress?: string) {
    const template = await this.getTemplateById(id);

    // Unlink any sessions referencing this template to prevent foreign key errors
    await this.prisma.session.updateMany({
      where: { templateId: id },
      data: { templateId: null },
    });

    await this.prisma.template.delete({
      where: { id },
    });

    // Clean up local frame file if stored in /storage/frames/
    if (template.frameOverlayUrl && template.frameOverlayUrl.startsWith('/storage/frames/')) {
      try {
        const filename = path.basename(template.frameOverlayUrl);
        const filePath = path.join(FRAMES_DIR, filename);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (cleanErr) {
        console.warn('[TemplateService] Warning cleaning up frame file:', cleanErr);
      }
    }

    await logAuditEvent(this.prisma, {
      action: 'TEMPLATE_DELETED',
      adminId,
      ipAddress,
      details: { templateId: id, name: template.name },
    });

    return { success: true, message: 'Template berhasil dihapus permanen' };
  }
}
