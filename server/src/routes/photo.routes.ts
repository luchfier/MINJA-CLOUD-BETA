// server/src/routes/photo.routes.ts
// Raw Camera Photo Processing Route — MinjaPhotobooth V2
// POST /api/photos/process-raw
// Menerima binary JPEG dari browser canvas, mengembalikan JPEG terproses Sharp

import { FastifyInstance } from 'fastify';
import { photoProcessorService } from '../services/photoProcessor.service.js';
import { humanLogger } from '../utils/humanLogger.js';
import { sendError, ErrorCode } from '../middleware/error.middleware.js';

export async function photoRoutes(app: FastifyInstance) {
  /**
   * POST /api/photos/process-raw
   * Content-Type: image/jpeg  (raw binary body)
   * Body: Raw JPEG buffer dari browser canvas (max 30MB)
   *
   * Response: JPEG binary terproses Sharp (Content-Type: image/jpeg)
   * Header X-Photo-Width, X-Photo-Height, X-Processing-Ms untuk debugging
   */
  app.post(
    '/api/photos/process-raw',
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      try {
        // Ambil raw body sebagai Buffer
        const rawBody = request.body as Buffer | string;

        let inputBuffer: Buffer;
        if (Buffer.isBuffer(rawBody)) {
          inputBuffer = rawBody;
        } else if (typeof rawBody === 'string') {
          // Fallback: base64 data URL (misal dari web fallback)
          const base64Part = rawBody.includes(',') ? rawBody.split(',')[1] : rawBody;
          inputBuffer = Buffer.from(base64Part ?? rawBody, 'base64');
        } else {
          return sendError(reply, 400, ErrorCode.VALIDATION_ERROR, 'Body harus berupa JPEG binary atau base64 string');
        }

        if (!inputBuffer || inputBuffer.length < 1000) {
          return sendError(reply, 400, ErrorCode.VALIDATION_ERROR, 'Buffer foto terlalu kecil atau kosong');
        }

        const result = await photoProcessorService.processRawCapture(inputBuffer);

        return reply
          .status(200)
          .header('Content-Type', 'image/jpeg')
          .header('Content-Length', result.buffer.length.toString())
          .header('X-Photo-Width', result.width.toString())
          .header('X-Photo-Height', result.height.toString())
          .header('X-Processing-Ms', result.processingMs.toString())
          .header('Cache-Control', 'no-store')
          .send(result.buffer);
      } catch (err: any) {
        humanLogger.warn('PhotoRoutes', `Gagal memproses foto mentah: ${err?.message}`);
        return sendError(reply, 500, ErrorCode.INTERNAL_ERROR, 'Gagal memproses foto kamera');
      }
    }
  );
}
