// src/schemas/delivery.schema.ts
// Zod schemas untuk Distribusi Digital (Email Delivery & Cloud Storage Gallery)

import { z } from 'zod';

export const sendEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(5, 'Alamat email minimal 5 karakter')
    .max(100, 'Alamat email maksimal 100 karakter')
    .email('Format alamat email tidak valid'),
});

export const uploadGalleryFileSchema = z.object({
  fileType: z
    .preprocess((val) => {
      if (val === 'print_strip') return 'layout_4r';
      if (val === 'single_photo') return 'raw_photo';
      if (val === 'animated_gif' || val === 'slideshow_video') return 'live_video';
      return val;
    }, z.enum(['layout_4r', 'live_video', 'raw_photo']))
    .default('layout_4r'),
  dataUrl: z.string().min(1, 'Data URL / base64 content wajib disertakan'),
  fileName: z.string().optional(),
});

export const composeLivePhotoSchema = z.object({
  slots: z
    .array(
      z.object({
        slotIndex: z.number().int().default(0),
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
        videoDataUrlOrBase64: z.string().min(10),
        rotation: z.number().optional(),
      })
    )
    .min(1, 'Minimal 1 slot video wajib disertakan'),
  frameOverlayDataUrl: z.string().min(10, 'Frame overlay PNG transparan wajib disertakan'),
  options: z
    .object({
      outputWidth: z.number().positive().optional(),
      outputHeight: z.number().positive().optional(),
      fps: z.number().min(15).max(60).optional(),
      durationSec: z.number().min(1).max(10).optional(),
      customFileName: z.string().optional(),
    })
    .optional(),
});

export const composeSlideshowSchema = z.object({
  photos: z.array(z.string()).min(1, 'Minimal 1 foto wajib disertakan untuk slideshow'),
  options: z
    .object({
      outputWidth: z.number().positive().optional(),
      outputHeight: z.number().positive().optional(),
      durationPerPhotoSec: z.number().min(0.2).max(5).optional(),
      loopCount: z.number().int().min(1).max(5).optional(),
      fps: z.number().min(15).max(60).optional(),
      customFileName: z.string().optional(),
    })
    .optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type UploadGalleryFileInput = z.infer<typeof uploadGalleryFileSchema>;
export type ComposeLivePhotoInput = z.infer<typeof composeLivePhotoSchema>;
export type ComposeSlideshowInput = z.infer<typeof composeSlideshowSchema>;
