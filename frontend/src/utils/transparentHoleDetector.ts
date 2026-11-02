// frontend/src/utils/transparentHoleDetector.ts
// Smart Auto-Detect Lubang Foto Transparan pada Frame PNG Studio
// Menggunakan algoritma Connected Component Bounding Box pada Alpha Channel

import type { PhotoSlot } from '../types/template';

export interface HoleDetectionResult {
  detected: boolean;
  slots: PhotoSlot[];
  nativeWidth: number;
  nativeHeight: number;
  orientation: '4R_PORTRAIT' | '4R_LANDSCAPE';
  category: 'single' | 'grid';
  message: string;
}

/**
 * Memuat gambar dari File atau URL string ke HTMLImageElement
 */
function loadImageSource(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar untuk analisis transparansi'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Mendeteksi lubang transparan (alpha === 0 atau alpha < 35) pada gambar PNG
 * dan menghasilkan array PhotoSlot dengan koordinat bounding box yang presisi.
 */
export async function detectTransparentHoles(
  imageSource: File | string,
  targetCanvasWidth = 1200,
  targetCanvasHeight = 1800
): Promise<HoleDetectionResult> {
  const img = await loadImageSource(imageSource);

  const nativeW = img.naturalWidth || 1200;
  const nativeH = img.naturalHeight || 1800;
  const isLandscape = nativeW > nativeH;
  const orientation: '4R_PORTRAIT' | '4R_LANDSCAPE' = isLandscape ? '4R_LANDSCAPE' : '4R_PORTRAIT';

  // Sesuaikan target canvas jika gambar landscape
  let canvasW = targetCanvasWidth;
  let canvasH = targetCanvasHeight;
  if (isLandscape && canvasW < canvasH) {
    canvasW = 1800;
    canvasH = 1200;
  }

  // Downscale image untuk kecepatan dan efisiensi memori (target scan max 360px)
  const scanW = 360;
  const scanH = Math.round((nativeH / nativeW) * scanW);
  const scaleX = canvasW / scanW;
  const scaleY = canvasH / scanH;

  const canvas = document.createElement('canvas');
  canvas.width = scanW;
  canvas.height = scanH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      detected: false,
      slots: [],
      nativeWidth: nativeW,
      nativeHeight: nativeH,
      orientation,
      category: 'single',
      message: 'Canvas 2D context tidak tersedia pada browser',
    };
  }

  // Draw image ke downscaled canvas
  ctx.drawImage(img, 0, 0, scanW, scanH);
  const imgData = ctx.getImageData(0, 0, scanW, scanH);
  const data = imgData.data;

  // Masking transparansi: true jika transparan (alpha < 35)
  // 35 memberikan toleransi untuk anti-aliasing di tepi lubang
  const isTransparent = new Uint8Array(scanW * scanH);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 255;
    if (alpha < 35) {
      isTransparent[i / 4] = 1;
    }
  }

  // Connected Component Labeling via Breadth-First Search (BFS)
  const visited = new Uint8Array(scanW * scanH);
  const components: Array<{ minX: number; maxX: number; minY: number; maxY: number; count: number }> = [];

  const queueX = new Int32Array(scanW * scanH);
  const queueY = new Int32Array(scanW * scanH);

  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const idx = y * scanW + x;
      if (isTransparent[idx] === 1 && visited[idx] === 0) {
        let qHead = 0;
        let qTail = 0;

        queueX[qTail] = x;
        queueY[qTail] = y;
        qTail++;
        visited[idx] = 1;

        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let count = 0;

        while (qHead < qTail) {
          const cx = queueX[qHead]!;
          const cy = queueY[qHead]!;
          qHead++;
          count++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // 4-way connectivity (Atas, Bawah, Kiri, Kanan)
          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx !== undefined && ny !== undefined && nx >= 0 && nx < scanW && ny >= 0 && ny < scanH) {
              const nIdx = ny * scanW + nx;
              if (isTransparent[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queueX[qTail] = nx;
                queueY[qTail] = ny;
                qTail++;
              }
            }
          }
        }

        const widthScan = maxX - minX + 1;
        const heightScan = maxY - minY + 1;
        const density = count / (widthScan * heightScan);

        // Filter: Hanya area lubang yang cukup besar (bukan noise atau titik kecil transparan)
        // Lebar & tinggi minimal ~15px pada scan resolution (~50px pada full-res 4R)
        // Density minimal 0.4 (agar lubang foto berbentuk kotak/persegi/oval, bukan teks tipis)
        if (widthScan >= 15 && heightScan >= 15 && count >= 200 && density >= 0.4) {
          components.push({ minX, maxX, minY, maxY, count });
        }
      }
    }
  }

  // Jika tidak ada komponen lubang yang valid ditemukan
  if (components.length === 0) {
    return {
      detected: false,
      slots: [],
      nativeWidth: nativeW,
      nativeHeight: nativeH,
      orientation,
      category: 'single',
      message: 'Tidak ditemukan lubang transparan yang jelas pada gambar frame.',
    };
  }

  // Urutkan lubang secara natural:
  // Portrait: Atas ke bawah, lalu kiri ke kanan
  // Landscape: Kiri ke kanan, lalu atas ke bawah
  components.sort((a, b) => {
    const rowTolerance = 25; // Toleransi perbedaan Y untuk baris yang sama
    const dy = a.minY - b.minY;
    if (Math.abs(dy) > rowTolerance) {
      return dy;
    }
    return a.minX - b.minX;
  });

  // Konversi bounding box scan kembali ke dimensi target 4R (1200x1800 atau 1800x1200)
  // dengan pembulatan ke kelipatan 5 atau 10 px untuk kerapian studio
  const snapTo = (val: number, step = 5) => Math.round(val / step) * step;

  const detectedSlots: PhotoSlot[] = components.map((comp, idx) => {
    const rawX = comp.minX * scaleX;
    const rawY = comp.minY * scaleY;
    const rawW = (comp.maxX - comp.minX + 1) * scaleX;
    const rawH = (comp.maxY - comp.minY + 1) * scaleY;

    // Pastikan berada di dalam batas kanvas
    const x = Math.max(0, snapTo(rawX));
    const y = Math.max(0, snapTo(rawY));
    const width = Math.min(canvasW - x, Math.max(50, snapTo(rawW)));
    const height = Math.min(canvasH - y, Math.max(50, snapTo(rawH)));

    return {
      id: `s${idx + 1}`,
      x,
      y,
      width,
      height,
      rotation: 0,
      layerIndex: 1,
      borderRadius: 0,
    };
  });

  const category: 'single' | 'grid' = detectedSlots.length === 1 ? 'single' : 'grid';

  return {
    detected: true,
    slots: detectedSlots,
    nativeWidth: nativeW,
    nativeHeight: nativeH,
    orientation,
    category,
    message: `Berhasil mendeteksi ${detectedSlots.length} lubang foto secara otomatis!`,
  };
}
