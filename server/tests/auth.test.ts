// tests/auth.test.ts
// Unit tests untuk Autentikasi Argon2id, JWT, dan Schema Validation
// Sesuai TEST_PLAN.md & SECURITY.md

import { describe, it, expect, beforeAll } from 'vitest';
import { hashPin, verifyPin, signAdminToken, verifyAdminToken } from '../src/utils/auth.util.js';
import { adminLoginSchema, adminChangePinSchema } from '../src/schemas/admin.schema.js';
import { createPackageSchema } from '../src/schemas/package.schema.js';
import { loadEnv } from '../src/config/env.js';

// Setup environment for testing
process.env['DATABASE_URL'] = process.env['DATABASE_URL'] || 'postgresql://localhost:5432/minjaphotobooth_test';
process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars-long';
process.env['BOOTH_API_KEY'] = 'test-booth-key';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

loadEnv();

describe('Auth Utilities (Argon2id & JWT)', () => {
  it('should hash PIN with Argon2id and verify correctly', async () => {
    const pin = '123456';
    const hash = await hashPin(pin);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isMatch = await verifyPin(pin, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPin('654321', hash);
    expect(isWrong).toBe(false);
  });

  it('should sign and verify admin JWT token', () => {
    const adminId = 'admin_test_123';
    const { token, expiresAt } = signAdminToken(adminId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(expiresAt).toBeDefined();

    const decoded = verifyAdminToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(adminId);
    expect(['owner', 'admin']).toContain(decoded?.role);
    expect(decoded?.iss).toBe('minjaphotobooth');
  });

  it('should reject invalid JWT token', () => {
    const decoded = verifyAdminToken('invalid-token-string');
    expect(decoded).toBeNull();
  });
});

describe('Zod Schema Validations', () => {
  it('validates admin login PIN correctly', () => {
    expect(() => adminLoginSchema.parse({ pin: '123456' })).not.toThrow();
    expect(() => adminLoginSchema.parse({ pin: '123456789012' })).not.toThrow();

    // Kurang dari 6 digit
    expect(() => adminLoginSchema.parse({ pin: '12345' })).toThrow();
    // Lebih dari 12 digit
    expect(() => adminLoginSchema.parse({ pin: '1234567890123' })).toThrow();
    // Berisi huruf
    expect(() => adminLoginSchema.parse({ pin: '12345a' })).toThrow();
  });

  it('validates package creation rules', () => {
    // Valid package
    expect(() =>
      createPackageSchema.parse({
        name: 'Basic Strip',
        price: 35000,
        durationSeconds: 180,
        maxShots: 6,
        maxSelections: 3,
        defaultPrints: 1,
        additionalPrintPrice: 5000,
      })
    ).not.toThrow();

    // Harga bukan kelipatan 500
    expect(() =>
      createPackageSchema.parse({
        name: 'Invalid Price',
        price: 35001,
        durationSeconds: 180,
        maxShots: 6,
        maxSelections: 3,
        defaultPrints: 1,
      })
    ).toThrow();

    // maxSelections > maxShots
    expect(() =>
      createPackageSchema.parse({
        name: 'Invalid Shots',
        price: 35000,
        durationSeconds: 180,
        maxShots: 2,
        maxSelections: 5,
        defaultPrints: 1,
      })
    ).toThrow();
  });
});
