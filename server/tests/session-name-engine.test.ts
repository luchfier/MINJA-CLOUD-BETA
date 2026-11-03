// server/tests/session-name-engine.test.ts
// Unit Test Suite untuk Dedicated Session Naming Engine

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SessionNameEngine } from '../src/services/sessionNameEngine.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testStorageDir = path.resolve(__dirname, './.tmp_session_engine_test');

describe('Dedicated SessionNameEngine Test Suite', () => {
  let engine: SessionNameEngine;

  beforeEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testStorageDir, { recursive: true });
    engine = new SessionNameEngine(undefined, testStorageDir);
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it('1. Menghasilkan ID sesi pertama terstruktur dengan format MJA-YYYYMMDD-0001', async () => {
    const fixedDate = new Date(2026, 9, 27); // 27 Oktober 2026
    const sessionId = await engine.generateNextSessionId({ date: fixedDate });

    expect(sessionId).toBe('MJA-20261027-0001');
  });

  it('2. Menghasilkan nomor urut berurutan secara deterministik (0001 -> 0002 -> 0003)', async () => {
    const fixedDate = new Date(2026, 9, 27);
    const id1 = await engine.generateNextSessionId({ date: fixedDate });
    const id2 = await engine.generateNextSessionId({ date: fixedDate });
    const id3 = await engine.generateNextSessionId({ date: fixedDate });

    expect(id1).toBe('MJA-20261027-0001');
    expect(id2).toBe('MJA-20261027-0002');
    expect(id3).toBe('MJA-20261027-0003');
  });

  it('3. Proteksi Concurrency: Menghasilkan ID unik tanpa duplikat saat dieksekusi bersamaan', async () => {
    const fixedDate = new Date(2026, 9, 27);
    const promises = Array.from({ length: 15 }, () =>
      engine.generateNextSessionId({ date: fixedDate })
    );

    const results = await Promise.all(promises);
    const uniqueResults = new Set(results);

    expect(uniqueResults.size).toBe(15);
    expect(results).toContain('MJA-20261027-0001');
    expect(results).toContain('MJA-20261027-0015');
  });

  it('4. Reset nomor urut saat tanggal berganti', async () => {
    const day1 = new Date(2026, 9, 27);
    const day2 = new Date(2026, 9, 28);

    const idDay1_1 = await engine.generateNextSessionId({ date: day1 });
    const idDay1_2 = await engine.generateNextSessionId({ date: day1 });
    const idDay2_1 = await engine.generateNextSessionId({ date: day2 });

    expect(idDay1_1).toBe('MJA-20261027-0001');
    expect(idDay1_2).toBe('MJA-20261027-0002');
    expect(idDay2_1).toBe('MJA-20261028-0001');
  });

  it('5. Mem-parsing ID sesi terstruktur dengan akurat', () => {
    const parsed = engine.parseSessionName('MJA-20261027-0042');

    expect(parsed.isStructured).toBe(true);
    expect(parsed.prefix).toBe('MJA');
    expect(parsed.dateStr).toBe('20261027');
    expect(parsed.sequence).toBe(42);
    expect(parsed.date?.getFullYear()).toBe(2026);
    expect(parsed.date?.getMonth()).toBe(9); // Oktober (0-indexed 9)
    expect(parsed.date?.getDate()).toBe(27);
  });

  it('6. Menangani format legacy CUID secara kompatibel', () => {
    const parsed = engine.parseSessionName('cmvqkkwm20001kro6t4cb3csb');

    expect(parsed.isStructured).toBe(false);
    expect(parsed.displayCode).toBe('MJA-3CSB');
  });

  it('7. Format tampilan kode sesi konsisten', () => {
    expect(engine.formatSessionCode('MJA-20261027-0005')).toBe('MJA-20261027-0005');
    expect(engine.formatSessionCode('cmvqkkwm20001kro6t4cb3csb')).toBe('MJA-3CSB');
    expect(engine.formatSessionCode(null)).toBe('MJA-0001');
  });

  it('8. Format digit angka murni untuk cloud gallery mobile (4 digit angka)', () => {
    expect(engine.formatSessionDigits('MJA-20261027-0005')).toBe('0005');
    expect(engine.formatSessionDigits('MJA01-20261103-0018')).toBe('0018');
    expect(engine.formatSessionDigits('MJA01')).toBe('0001');
    expect(engine.formatSessionDigits('0018')).toBe('0018');
    expect(engine.formatSessionDigits(null)).toBe('0001');
  });
});
