// server/src/services/sessionNameEngine.service.ts
// Dedicated Session Naming Engine — MinjaPhotobooth V2
// Menghasilkan nama dan kode sesi terstruktur non-random (MJA-YYYYMMDD-0001)
// Dilengkapi proteksi concurrency, daily sequence counter, dan offline fallback persistence

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import { humanLogger } from '../utils/humanLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GenerateSessionIdOptions {
  date?: Date;
  prefix?: string;
  padLength?: number;
}

export interface ParsedSessionName {
  isStructured: boolean;
  prefix: string;
  dateStr?: string;
  date?: Date;
  sequence?: number;
  raw: string;
  displayCode: string;
}

interface LocalCounterState {
  date: string;
  lastSequence: number;
  updatedAt: string;
}

export class SessionNameEngine {
  private baseStorageDir: string;
  private counterFilePath: string;
  private lockPromise: Promise<void> = Promise.resolve();

  constructor(
    private prisma?: PrismaClient,
    customStorageDir?: string
  ) {
    this.baseStorageDir =
      customStorageDir || path.resolve(__dirname, '../../storage');
    this.counterFilePath = path.join(this.baseStorageDir, 'session-counter.json');
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    try {
      if (!fs.existsSync(this.baseStorageDir)) {
        fs.mkdirSync(this.baseStorageDir, { recursive: true });
      }
    } catch {
      // ignore
    }
  }

  /**
   * Concurrency lock untuk menjamin tidak ada nomor urut sesi duplikat
   * jika ada beberapa request tiba di milidetik yang sama
   */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    let releaseLock: () => void;
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const currentLock = this.lockPromise;
    this.lockPromise = (async () => {
      await currentLock;
      await nextLock;
    })();

    await currentLock;
    try {
      return await fn();
    } finally {
      releaseLock!();
    }
  }

  /**
   * Mengubah objek Date ke format YYYYMMDD waktu lokal
   */
  public formatDateToYmd(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  /**
   * Membaca counter lokal dari file storage/session-counter.json
   */
  private readLocalCounter(): LocalCounterState | null {
    try {
      if (fs.existsSync(this.counterFilePath)) {
        const raw = fs.readFileSync(this.counterFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data.lastSequence === 'number' && typeof data.date === 'string') {
          return data as LocalCounterState;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Menyimpan counter lokal ke file storage/session-counter.json
   */
  private saveLocalCounter(dateStr: string, seq: number): void {
    try {
      this.ensureStorageDir();
      const state: LocalCounterState = {
        date: dateStr,
        lastSequence: seq,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.counterFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SessionNameEngine] Gagal menyimpan file counter lokal:', err);
    }
  }

  /**
   * Menghitung urutan sesi tertinggi hari ini dari database Prisma
   */
  private async getHighestSequenceFromDb(date: Date, prefix: string, dateStr: string): Promise<number> {
    if (!this.prisma) return 0;

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Cari sesi yang dibuat hari ini
      const todaySessions = await this.prisma.session.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
        },
      });

      let maxSeq = 0;
      const expectedPrefix = `${prefix}-${dateStr}-`;

      for (const s of todaySessions) {
        if (s.id.startsWith(expectedPrefix)) {
          const suffix = s.id.substring(expectedPrefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }

      // Jika ada sesi hari ini tetapi ID belum berpola (misal cuid lama),
      // jadikan total jumlah sesi hari ini sebagai baseline
      if (maxSeq === 0 && todaySessions.length > 0) {
        maxSeq = todaySessions.length;
      }

      return maxSeq;
    } catch (err) {
      console.warn('[SessionNameEngine] DB sequence check warning:', err);
      return 0;
    }
  }

  /**
   * ENGINE UTAMA: Menghasilkan ID Sesi Baru Non-Random Berurutan
   * Format Standar: MJA-YYYYMMDD-0001 (misal: MJA-20261027-0001)
   */
  public async generateNextSessionId(options: GenerateSessionIdOptions = {}): Promise<string> {
    return this.withLock(async () => {
      const targetDate = options.date || new Date();
      const prefix = (options.prefix || 'MJA').toUpperCase().trim();
      const padLength = options.padLength || 4;
      const dateStr = this.formatDateToYmd(targetDate);

      // 1. Cek urutan tertinggi dari database
      const dbSeq = await this.getHighestSequenceFromDb(targetDate, prefix, dateStr);

      // 2. Cek counter lokal (persisten offline)
      let localSeq = 0;
      const localCounter = this.readLocalCounter();
      if (localCounter && localCounter.date === dateStr) {
        localSeq = localCounter.lastSequence;
      }

      // 3. Tentukan nomor urut berikutnya (selalu increment dan ambil yang tertinggi)
      const currentHighest = Math.max(dbSeq, localSeq);
      const nextSeq = currentHighest + 1;

      // 4. Update file counter lokal seketika
      this.saveLocalCounter(dateStr, nextSeq);

      const seqStr = String(nextSeq).padStart(padLength, '0');
      const sessionId = `${prefix}-${dateStr}-${seqStr}`;

      humanLogger.session(`[SessionNameEngine] ID Sesi baru terstruktur: ${sessionId} (Urutan #${nextSeq} hari ini)`);

      return sessionId;
    });
  }

  /**
   * Mengekstrak detail informasi dari ID sesi
   */
  public parseSessionName(sessionId: string): ParsedSessionName {
    if (!sessionId || typeof sessionId !== 'string') {
      return {
        isStructured: false,
        prefix: 'MJA',
        raw: '',
        displayCode: 'MJA-0001',
      };
    }

    const clean = sessionId.trim();
    // Pola MJA-YYYYMMDD-XXXX (contoh: MJA-20261027-0001)
    const match = clean.match(/^([A-Z0-9]+)-(\d{8})-(\d+)$/i);

    if (match && match[1] && match[2] && match[3]) {
      const prefix = match[1].toUpperCase();
      const dateStr = match[2];
      const seq = parseInt(match[3], 10);

      const year = parseInt(dateStr.slice(0, 4), 10);
      const month = parseInt(dateStr.slice(4, 6), 10) - 1;
      const day = parseInt(dateStr.slice(6, 8), 10);
      const date = new Date(year, month, day);

      return {
        isStructured: true,
        prefix,
        dateStr,
        date,
        sequence: seq,
        raw: clean,
        displayCode: clean,
      };
    }

    return {
      isStructured: false,
      prefix: 'MJA',
      raw: clean,
      displayCode: this.formatSessionCode(clean),
    };
  }

  /**
   * Mengekstrak 4 digit nomor urut sesi murni angka (contoh: '0018', '0001')
   * Digunakan untuk portal galeri mobile (gallery.minja.my.id), lookup, dan receipt
   */
  public formatSessionDigits(sessionId?: string | null): string {
    if (!sessionId) return '0001';
    const clean = sessionId.trim();

    if (clean.includes('-')) {
      const parts = clean.split('-');
      const last = parts[parts.length - 1].replace(/\D/g, '');
      if (last.length > 0) {
        return last.padStart(4, '0').slice(-4);
      }
    }

    const digits = clean.replace(/\D/g, '');
    if (digits.length > 0) {
      return digits.padStart(4, '0').slice(-4);
    }

    return '0001';
  }

  /**
   * Memformat kode sesi untuk keperluan internal laporan / audit / display terstruktur
   */
  public formatSessionCode(sessionId?: string | null): string {
    if (!sessionId) return 'MJA-0001';
    const clean = sessionId.trim();

    // Jika sudah format terstruktur lengkap MJA-YYYYMMDD-XXXX atau KIOSK-YYYYMMDD-XXXX
    if (/^[A-Z0-9]+-\d{8}-\d+$/i.test(clean)) {
      return clean.toUpperCase();
    }

    // Jika ada tanda minus (misal MJA-0005)
    if (clean.includes('-')) {
      return clean.toUpperCase();
    }

    // Jika format legacy CUID
    if (clean.length > 10) {
      return `MJA-${clean.slice(-4).toUpperCase()}`;
    }

    // Format pendek (misal MJA01 atau angka)
    const digits = clean.replace(/\D/g, '');
    if (digits.length > 0) {
      return `MJA-${digits.padStart(4, '0').slice(-4)}`;
    }

    return `MJA-${clean.slice(-4).toUpperCase()}`;
  }

  /**
   * Menghitung total sesi yang dibuat hari ini
   */
  public async getTodaySessionCount(date: Date = new Date()): Promise<number> {
    const dateStr = this.formatDateToYmd(date);
    const dbSeq = await this.getHighestSequenceFromDb(date, 'MJA', dateStr);
    const local = this.readLocalCounter();
    const localSeq = local && local.date === dateStr ? local.lastSequence : 0;
    return Math.max(dbSeq, localSeq);
  }
}

// Singleton instance siap pakai untuk seluruh backend
let sharedEngineInstance: SessionNameEngine | null = null;

export function getSessionNameEngine(prisma?: PrismaClient): SessionNameEngine {
  if (!sharedEngineInstance) {
    sharedEngineInstance = new SessionNameEngine(prisma);
  } else if (prisma && !(sharedEngineInstance as any).prisma) {
    (sharedEngineInstance as any).prisma = prisma;
  }
  return sharedEngineInstance;
}
