// src/utils/session.util.ts
// Utility helper penamaan dan format kode sesi MinjaPhotobooth
// Terintegrasi langsung dengan Dedicated SessionNameEngine

import { getSessionNameEngine, type ParsedSessionName } from '../services/sessionNameEngine.service.js';

export { type ParsedSessionName };

/**
 * Memformat ID sesi menjadi Kode Sesi resmi MinjaPhotobooth berawalan 'MJA-'
 * Format: MJA-YYYYMMDD-0001 (atau fallback MJA-XXXX untuk CUID warisan)
 */
export function formatSessionCode(sessionId?: string | null): string {
  return getSessionNameEngine().formatSessionCode(sessionId);
}

/**
 * Helper untuk parsing komponen nama sesi terstruktur
 */
export function parseSessionName(sessionId: string): ParsedSessionName {
  return getSessionNameEngine().parseSessionName(sessionId);
}
