// src/services/sessionHelper.ts
// Utility helper untuk penamaan dan format kode sesi MinjaPhotobooth

/**
 * Memformat ID sesi menjadi Kode Sesi resmi MinjaPhotobooth berawalan 'MJA-'
 * Format: MJA-XXXX (misal: MJA-8921 atau MJA-9B4F)
 *
 * @param sessionId ID sesi (cuid, uuid, atau string ID sesi lainnya)
 * @returns Kode sesi yang rapi dan mudah dibaca berawalan 'MJA-'
 */
export function formatSessionCode(sessionId?: string | null): string {
  if (!sessionId) return 'MJA-0001';
  const clean = sessionId.trim();
  if (clean.startsWith('MJA-')) return clean;
  if (clean.startsWith('MJ-')) return 'MJA-' + clean.slice(3);

  const suffix = (clean.slice(-4) || '0001').toUpperCase();
  return `MJA-${suffix}`;
}

/**
 * Format ringkas untuk badge atau nomor antrean (contoh: #0001 atau #0023)
 */
export function formatShortSessionCode(sessionId?: string | null): string {
  if (!sessionId) return '#0001';
  const clean = sessionId.trim();
  // Jika format MJA-YYYYMMDD-XXXX, ambil XXXX-nya
  const match = clean.match(/^MJA-\d{8}-(\d+)$/i);
  if (match && match[1]) {
    return `#${match[1]}`;
  }
  const suffix = (clean.slice(-4) || '0001').toUpperCase();
  return `#${suffix}`;
}
