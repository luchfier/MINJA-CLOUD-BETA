// minja-cloud/server/src/config/env.ts
// Environment variable loader & validation for Minja Cloud VPS Platform

import { z } from 'zod';

const envSchema = z.object({
  // Central PostgreSQL Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // JWT Secret
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Cloud Master Key & Booth Auth
  CLOUD_MASTER_KEY: z.string().default('minja_cloud_master_secret_key_change_me'),
  BOOTH_API_KEY: z.string().default('mja_cloud_booth_key_default'),

  // Midtrans Payment Gateway (jika settlement diproses oleh VPS)
  MIDTRANS_SERVER_KEY: z.string().default(''),
  MIDTRANS_CLIENT_KEY: z.string().default(''),
  MIDTRANS_IS_PRODUCTION: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Email Delivery (SMTP / Nodemailer)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z
    .string()
    .default('587')
    .transform((v) => parseInt(v, 10)),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('Minja Photobooth <noreply@minjaphotobooth.com>'),

  // Resend Email REST API
  RESEND_API_KEY: z.string().default(''),
  RESEND_FROM: z.string().default('Minja Photobooth <onboarding@resend.dev>'),

  // Cloudflare R2 / AWS S3 Object Storage (Galeri Publik 48 Jam)
  S3_ENDPOINT: z.string().default(''),
  S3_ACCESS_KEY: z.string().default(''),
  S3_SECRET_KEY: z.string().default(''),
  S3_BUCKET_NAME: z.string().default('minjaphotobooth'),
  S3_REGION: z.string().default('auto'),

  // Digital Gallery Public Domain
  GALLERY_BASE_URL: z.string().default('https://gallery.minja.com'),
  R2_PUBLIC_DOMAIN: z.string().default(''),

  // Kiosk Identification
  KIOSK_CODE: z.string().default('MJA-01'),
  KIOSK_NAME: z.string().default('Minja Photobooth Studio'),
  KIOSK_LOCATION: z.string().default('Lokasi Utama'),

  // App & Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .default('4000')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(65535)),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(
      `\n❌ Minja Cloud Environment validation failed:\n${formatted}\n`
    );
    process.exit(1);
  }

  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    throw new Error('Environment not loaded. Call loadEnv() first.');
  }
  return _env;
}

export function reloadEnv(): Env {
  _env = null;
  return loadEnv();
}
