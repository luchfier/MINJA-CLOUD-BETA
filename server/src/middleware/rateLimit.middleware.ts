// src/middleware/rateLimit.middleware.ts
// In-Memory Sliding Window Rate Limiter untuk melindungi endpoint publik dari brute force

import type { FastifyRequest, FastifyReply } from 'fastify';
import { sendError, ErrorCode } from './error.middleware.js';

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimiterOptions {
  max: number;          // Maksimum jumlah request
  timeWindowMs: number; // Jendela waktu (ms), contoh: 60_000 (1 menit)
  message?: string;     // Pesan error kustom
  keyPrefix?: string;   // Prefix isolasi endpoint
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    max,
    timeWindowMs,
    message = 'Terlalu banyak percobaan akses. Silakan tunggu beberapa saat sebelum mencoba kembali.',
    keyPrefix = 'rl',
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Interval pembersihan otomatis IP kedaluwarsa setiap 5 menit (mencegah memory leak)
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < timeWindowMs);
      if (record.timestamps.length === 0) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Jangan blokir process shutdown
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return async function rateLimitPreHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Ambil IP klien (mendukung Cloudflare CF-Connecting-IP & X-Forwarded-For)
    const forwarded = request.headers['x-forwarded-for'];
    const cfIp = request.headers['cf-connecting-ip'];
    const rawIp =
      (typeof cfIp === 'string'
        ? cfIp
        : typeof forwarded === 'string'
          ? forwarded.split(',')[0].trim()
          : request.ip) || 'unknown';
    const key = `${keyPrefix}:${rawIp}`;

    const now = Date.now();
    let record = hits.get(key);

    if (!record) {
      record = { timestamps: [] };
      hits.set(key, record);
    }

    // Buang timestamp yang sudah lewat jendela waktu
    record.timestamps = record.timestamps.filter((ts) => now - ts < timeWindowMs);

    const currentCount = record.timestamps.length;
    const remaining = Math.max(0, max - currentCount);

    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', Math.max(0, remaining - 1));

    if (currentCount >= max) {
      const oldestTs = record.timestamps[0] || now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestTs + timeWindowMs - now) / 1000));

      reply.header('Retry-After', retryAfterSeconds);
      reply.header('X-RateLimit-Reset', Math.ceil((oldestTs + timeWindowMs) / 1000));

      sendError(reply, 429, ErrorCode.RATE_LIMITED, message, {
        retryAfterSeconds,
      });
      return reply;
    }

    // Catat request baru
    record.timestamps.push(now);
  };
}

