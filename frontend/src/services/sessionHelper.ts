/**
 * Mengekstrak 4 digit nomor urut sesi murni angka (contoh: '0018', '0001')
 * Digunakan untuk portal galeri mobile (gallery.minja.my.id) dan input lookup pelanggan
 */
export function formatSessionDigits(sessionId?: string | null): string {
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
 * Memformat ID sesi menjadi Kode Sesi resmi MinjaPhotobooth berawalan 'MJA-'
 * Format: MJA-XXXX (misal: MJA-0018 atau MJA-0001)
 */
export function formatSessionCode(sessionId?: string | null): string {
  if (!sessionId) return 'MJA-0001';
  const clean = sessionId.trim();
  if (/^[A-Z0-9]+-\d{8}-\d+$/i.test(clean)) return clean.toUpperCase();
  if (clean.startsWith('MJA-')) return clean;
  if (clean.startsWith('MJ-')) return 'MJA-' + clean.slice(3);

  const digits = clean.replace(/\D/g, '');
  if (digits.length > 0) {
    return `MJA-${digits.padStart(4, '0').slice(-4)}`;
  }

  const suffix = (clean.slice(-4) || '0001').toUpperCase();
  return `MJA-${suffix}`;
}

/**
 * Format ringkas untuk badge atau nomor antrean (contoh: #0001 atau #0023)
 */
export function formatShortSessionCode(sessionId?: string | null): string {
  return `#${formatSessionDigits(sessionId)}`;
}
