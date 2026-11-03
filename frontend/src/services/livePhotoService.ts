// frontend/src/services/livePhotoService.ts
// Kontrak tipe dan pembantu Live Photo (Model A) berbasis Native FFmpeg Transcoder

export interface LivePhotoResult {
  videoBlob?: Blob;
  videoUrl: string;
  durationSec: number;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Menghasilkan URL kanonikal backend untuk video Live Photo Model A (MP4)
 */
export function getLivePhotoCanonicalUrl(sessionId: string): string {
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    const hostBase = port === '5174' || port === '5173' ? `${protocol}//${hostname}:4000` : window.location.origin;
    return `${hostBase}/storage/galleries/${encodeURIComponent(sessionId)}/layout_live_4r.mp4`;
  }
  return `http://localhost:4000/storage/galleries/${encodeURIComponent(sessionId)}/layout_live_4r.mp4`;
}
