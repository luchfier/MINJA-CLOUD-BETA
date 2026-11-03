// server/src/routes/renderer.routes.ts
// Endpoint REST untuk Native Windows Processing Core (Sharp + Skia Canvas)
// Menerima spesifikasi komposisi frame dari frontend dan menghasilkan foto 300 DPI fisik di server

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { nativeRendererService } from '../services/nativeRenderer.service.js';
import { sendSuccess, sendError } from '../middleware/error.middleware.js';
import { ErrorCode } from '../types/common.types.js';

const renderSlotSchema = z.object({
  index: z.number().optional(),
  id: z.string().optional(),
  layerIndex: z.number().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  borderRadius: z.number().optional(),
}).passthrough();

const renderTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  layoutType: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  frameUrl: z.string().optional().nullable(),
  slots: z.array(renderSlotSchema),
}).passthrough();

const renderSlotAdjustmentSchema = z.object({
  scale: z.number().optional(),
  panX: z.number().optional(),
  panY: z.number().optional(),
  rotation: z.number().optional(),
  filter: z.string().optional(),
}).passthrough();

const renderStickerSchema = z.object({
  id: z.string(),
  url: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
}).passthrough();

const renderTextSchema = z.object({
  id: z.string(),
  content: z.string(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontColor: z.string().optional(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().optional(),
  isBold: z.boolean().optional(),
  isItalic: z.boolean().optional(),
}).passthrough();

const renderCompositionSchema = z.object({
  sessionId: z.string(),
  designId: z.string().optional(),
  template: renderTemplateSchema,
  photoUrls: z.array(z.string()),
  filter: z.enum(['normal', 'bw', 'sepia', 'warm', 'cool', 'glamour']).optional(),
  adjustments: z
    .object({
      brightness: z.number().optional(),
      contrast: z.number().optional(),
      saturation: z.number().optional(),
      rotation: z.number().optional(),
    })
    .passthrough()
    .optional(),
  slotAdjustments: z.record(z.string(), renderSlotAdjustmentSchema).optional(),
  stickers: z.array(renderStickerSchema).optional(),
  texts: z.array(renderTextSchema).optional(),
});

export const rendererRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/renderer/render-photo
   * Merender komposisi frame foto dengan Skia Canvas & Sharp 300 DPI
   */
  app.post('/api/renderer/render-photo', async (request, reply) => {
    try {
      const parsedBody = renderCompositionSchema.parse(request.body);

      // Konversi slotAdjustments key dari string ke number
      const slotAdjustments: Record<number, any> = {};
      if (parsedBody.slotAdjustments) {
        Object.entries(parsedBody.slotAdjustments).forEach(([key, val]) => {
          slotAdjustments[Number(key)] = val;
        });
      }

      const template = {
        ...parsedBody.template,
        frameUrl: parsedBody.template.frameUrl ?? undefined,
        slots: parsedBody.template.slots.map((s, idx) => ({
          ...s,
          index: s.index ?? idx,
        })),
      };

      const result = await nativeRendererService.renderComposition({
        ...parsedBody,
        template: template as any,
        slotAdjustments,
      });

      return sendSuccess(reply, result, 201);
    } catch (err: any) {
      return sendError(reply, 400, ErrorCode.VALIDATION_ERROR, err.message || 'Gagal merender komposisi foto');
    }
  });
};
