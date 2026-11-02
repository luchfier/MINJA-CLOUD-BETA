// src/middleware/error.middleware.ts
// Global error handler untuk Fastify
// Menangkap AppError dan error tidak terduga, mengembalikan format ApiResponse konsisten.

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../types/common.types.js';
export { AppError, ErrorCode } from '../types/common.types.js';

/**
 * Memformat respons sukses seragam.
 */
export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  reply.status(statusCode).send({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Memformat respons error seragam.
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): void {
  reply.status(statusCode).send({
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Global error handler yang dipasang ke Fastify.
 */
export function globalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const logger = request.log;

  // Kasus 1: AppError (error bisnis yang diketahui)
  if (error instanceof AppError) {
    logger.warn(
      { code: error.code, statusCode: error.statusCode },
      error.message
    );
    sendError(reply, error.statusCode, error.code, error.message, error.details);
    return;
  }

  // Kasus 1.5: Zod validation error
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(reply, 400, ErrorCode.VALIDATION_ERROR, 'Validasi data tidak sesuai', {
      errors: details,
    });
    return;
  }

  // Kasus 2: Fastify validation error
  if (error.validation) {
    const details = error.validation.map((v) => ({
      field: v.instancePath || v.params?.missingProperty || 'unknown',
      message: v.message || 'Invalid value',
    }));
    sendError(reply, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', {
      errors: details,
    });
    return;
  }

  // Kasus 3: Error tidak terduga
  logger.error({ err: error, url: request.url, method: request.method }, 'Unhandled error');
  sendError(
    reply,
    500,
    ErrorCode.INTERNAL_ERROR,
    process.env['NODE_ENV'] === 'production'
      ? 'Terjadi kesalahan internal'
      : error.message || 'Internal Server Error'
  );
}
