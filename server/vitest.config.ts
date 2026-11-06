import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/minjaphotobooth',
      DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/minjaphotobooth',
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-that-is-at-least-32-chars-long',
      BOOTH_API_KEY: 'test-booth-key',
      LOG_LEVEL: 'silent',
    },
  },
});

