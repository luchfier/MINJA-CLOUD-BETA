// server/src/services/livePhotoTranscoder.service.ts
// Service Dedicated FFmpeg Video Transcoder & Multi-Slot Live Photo Compositor (Model A)
// Menghasilkan video MP4 (H.264 / AAC) universal 30 FPS dari kombinasi klip slot foto dan frame template overlay

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { humanLogger } from '../utils/humanLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi path binary FFmpeg
const staticFfmpegPath =
  typeof ffmpegStatic === 'string'
    ? ffmpegStatic
    : (ffmpegStatic as any)?.default || 'ffmpeg';

if (staticFfmpegPath) {
  ffmpeg.setFfmpegPath(staticFfmpegPath);
}

export interface LivePhotoSlotInput {
  slotIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  videoDataUrlOrBase64: string;
  rotation?: number;
}

export interface ComposeLivePhotoOptions {
  outputWidth?: number;
  outputHeight?: number;
  fps?: number;
  durationSec?: number;
  customFileName?: string;
}

export interface ComposeLivePhotoResult {
  success: boolean;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  error?: string;
}

export interface ComposeSlideshowOptions {
  outputWidth?: number;
  outputHeight?: number;
  durationPerPhotoSec?: number;
  loopCount?: number;
  fps?: number;
  customFileName?: string;
}

export interface ComposeSlideshowResult {
  success: boolean;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  error?: string;
}

export class LivePhotoTranscoderService {
  private baseStorageDir: string;

  constructor() {
    this.baseStorageDir = path.resolve(__dirname, '../../storage/galleries');
    try {
      fs.mkdirSync(this.baseStorageDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  /**
   * Mengurai string base64 / data URL menjadi buffer binary
   */
  private parseBase64ToBuffer(dataUrl: string): Buffer {
    const commaIdx = dataUrl.indexOf(',');
    const cleanData = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    return Buffer.from(cleanData.replace(/\s/g, ''), 'base64');
  }

  /**
   * Memeriksa ketersediaan engine FFmpeg di sistem
   */
  public async checkAvailability(): Promise<{ available: boolean; path: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        ffmpeg.getAvailableCodecs((err, codecs) => {
          if (err || !codecs) {
            resolve({
              available: false,
              path: staticFfmpegPath,
              error: err?.message || 'FFmpeg tidak dapat dijalankan',
            });
            return;
          }
          const hasH264 = !!(codecs.libx264 || codecs.h264);
          resolve({
            available: hasH264,
            path: staticFfmpegPath,
          });
        });
      } catch (e: any) {
        resolve({
          available: false,
          path: staticFfmpegPath,
          error: e?.message || 'Exception saat inisialisasi FFmpeg',
        });
      }
    });
  }

  /**
   * Menggabungkan video klip tiap slot dengan overlay template frame PNG (Model A)
   */
  public async composeLiveFrame(
    sessionId: string,
    slots: LivePhotoSlotInput[],
    frameOverlayDataUrl: string,
    options: ComposeLivePhotoOptions = {}
  ): Promise<ComposeLivePhotoResult> {
    const targetWidth = options.outputWidth || 1440;
    const targetHeight = options.outputHeight || 2160;
    const fps = options.fps || 30;
    const durationSec = options.durationSec || 3.0;

    const sessionDir = path.join(this.baseStorageDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const tmpDir = path.join(sessionDir, `.tmp_live_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const outputFileName = options.customFileName || 'layout_live_4r.mp4';
    const outputFilePath = path.join(sessionDir, outputFileName);

    try {
      humanLogger.info('LivePhoto', `Memulai compositing Live Photo (Model A) untuk sesi ${sessionId}...`);

      // 1. Simpan file video per slot ke folder sementara
      const slotVideoPaths: { path: string; slot: LivePhotoSlotInput }[] = [];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot || !slot.videoDataUrlOrBase64 || slot.videoDataUrlOrBase64.length < 50) continue;

        const videoBuf = this.parseBase64ToBuffer(slot.videoDataUrlOrBase64);
        const slotFilePath = path.join(tmpDir, `slot_${slot.slotIndex ?? i}.webm`);
        fs.writeFileSync(slotFilePath, videoBuf);
        slotVideoPaths.push({ path: slotFilePath, slot });
      }

      if (slotVideoPaths.length === 0) {
        throw new Error('Tidak ada video klip valid yang dikirimkan.');
      }

      // 2. Simpan frame overlay PNG
      const overlayBuf = this.parseBase64ToBuffer(frameOverlayDataUrl);
      const overlayPath = path.join(tmpDir, 'frame_overlay.png');
      fs.writeFileSync(overlayPath, overlayBuf);

      // 3. Bangun perintah FFmpeg dengan fluent-ffmpeg
      const cmd = ffmpeg();

      // Tambahkan input untuk setiap video slot
      for (const item of slotVideoPaths) {
        cmd.input(item.path);
      }

      // Tambahkan input frame overlay PNG di urutan terakhir
      cmd.input(overlayPath);

      // Bangun filter graph
      const filterComplex: string[] = [];

      // A. Layer dasar: kanvas warna hitam proporsional (1440×2160 atau sesuai template)
      filterComplex.push(`color=c=black:s=${targetWidth}x${targetHeight}:d=${durationSec}:r=${fps} [base]`);

      let lastStage = 'base';

      // B. Skalakan, crop, dan letakkan tiap slot video pada koordinat yang ditentukan
      for (let i = 0; i < slotVideoPaths.length; i++) {
        const item = slotVideoPaths[i];
        if (!item) continue;
        const { slot } = item;
        const scaledTag = `scaled_${i}`;
        const stageTag = `stage_${i}`;

        // Skala dan potong video agar proporsional mengisi dimensi slot
        filterComplex.push(
          `[${i}:v] scale=${slot.width}:${slot.height}:force_original_aspect_ratio=increase,crop=${slot.width}:${slot.height} [${scaledTag}]`
        );

        // Tempelkan video slot ke atas stage sebelumnya
        filterComplex.push(
          `[${lastStage}][${scaledTag}] overlay=${slot.x}:${slot.y} [${stageTag}]`
        );

        lastStage = stageTag;
      }

      // C. Tempelkan template frame overlay PNG di lapisan paling atas
      const overlayInputIndex = slotVideoPaths.length;
      filterComplex.push(
        `[${lastStage}][${overlayInputIndex}:v] overlay=0:0:eof_action=repeat [out]`
      );

      // Eksekusi FFmpeg
      await new Promise<void>((resolve, reject) => {
        cmd
          .complexFilter(filterComplex.join('; '))
          .outputOptions([
            '-map [out]',
            '-c:v libx264',
            '-preset fast',
            '-crf 18',
            '-profile:v high',
            '-level 4.2',
            '-b:v 6000k',
            '-maxrate 12000k',
            '-bufsize 16000k',
            '-pix_fmt yuv420p',
            '-movflags +faststart',
            `-t ${durationSec}`,
            `-r ${fps}`,
          ])
          .output(outputFilePath)
          .on('start', (commandLine) => {
            humanLogger.info('LivePhoto:FFmpeg', `Eksekusi: ${commandLine}`);
          })
          .on('end', () => {
            humanLogger.info('LivePhoto:FFmpeg', `Sukses menghasilkan ${outputFileName}`);
            resolve();
          })
          .on('error', (err, _stdout, stderr) => {
            humanLogger.warn('LivePhoto:FFmpeg', `Gagal: ${err.message}`);
            humanLogger.warn('LivePhoto:FFmpeg', `Stderr: ${stderr}`);
            reject(err);
          })
          .run();
      });

      const stat = fs.statSync(outputFilePath);

      // Backward & forward compatibility mirror: sinkronkan layout_live_1.mp4 <-> layout_live_4r.mp4
      try {
        if (outputFileName === 'layout_live_1.mp4') {
          const legacyPath = path.join(sessionDir, 'layout_live_4r.mp4');
          fs.copyFileSync(outputFilePath, legacyPath);
        } else if (outputFileName === 'layout_live_4r.mp4') {
          const v1Path = path.join(sessionDir, 'layout_live_1.mp4');
          fs.copyFileSync(outputFilePath, v1Path);
        }
      } catch {}

      return {
        success: true,
        fileName: outputFileName,
        filePath: outputFilePath,
        sizeBytes: stat.size,
        durationSec,
        width: targetWidth,
        height: targetHeight,
      };
    } catch (err: any) {
      humanLogger.warn('LivePhoto', `Gagal menyusun Live Photo: ${err?.message || err}`);
      if (fs.existsSync(outputFilePath)) {
        try {
          const s = fs.statSync(outputFilePath);
          if (s.size <= 100) fs.unlinkSync(outputFilePath);
        } catch {}
      }
      return {
        success: false,
        fileName: outputFileName,
        filePath: outputFilePath,
        sizeBytes: 0,
        durationSec,
        width: targetWidth,
        height: targetHeight,
        error: err?.message || 'Gagal memproses video live photo dengan FFmpeg',
      };
    } finally {
      // Bersihkan direktori sementara
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Menggabungkan seluruh foto jepretan mentah menjadi 1 video Slideshow MP4 (Vertical 9:16 Beat Cut) via FFmpeg
   */
  public async composeSlideshowVideo(
    sessionId: string,
    photos: string[],
    options: ComposeSlideshowOptions = {}
  ): Promise<ComposeSlideshowResult> {
    const targetWidth = options.outputWidth || 1080;
    const targetHeight = options.outputHeight || 1920;
    const durationPerPhoto = options.durationPerPhotoSec || 0.85;
    const fps = options.fps || 30;
    const outputFileName = options.customFileName || 'slideshow.mp4';

    const sessionDir = path.join(this.baseStorageDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const tmpDir = path.join(sessionDir, `.tmp_slide_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const outputFilePath = path.join(sessionDir, outputFileName);

    try {
      humanLogger.info('Slideshow', `Memulai pembuatan Slideshow Beat Cut (9:16) untuk sesi ${sessionId}...`);

      // 1. Simpan foto ke direktori sementara
      const validPhotoPaths: string[] = [];
      const inputPhotos = Array.isArray(photos) ? photos : [];
      for (let i = 0; i < inputPhotos.length; i++) {
        const p = inputPhotos[i];
        if (!p || p.length < 20) continue;

        const photoFilePath = path.join(tmpDir, `photo_${i}.jpg`);
        if (p.startsWith('data:') || p.includes('base64,')) {
          const buf = this.parseBase64ToBuffer(p);
          fs.writeFileSync(photoFilePath, buf);
        } else if (fs.existsSync(p)) {
          fs.copyFileSync(p, photoFilePath);
        } else {
          // Cek apakah file berada di sessionDir
          const inSessionPath = path.join(sessionDir, path.basename(p));
          if (fs.existsSync(inSessionPath)) {
            fs.copyFileSync(inSessionPath, photoFilePath);
          } else {
            continue;
          }
        }
        validPhotoPaths.push(photoFilePath);
      }

      // Fallback: Jika validPhotoPaths masih kosong, cari pose_*.jpg yang sudah tersimpan di sessionDir
      if (validPhotoPaths.length === 0 && fs.existsSync(sessionDir)) {
        const sessionFiles = fs.readdirSync(sessionDir)
          .filter((f) => f.toLowerCase().startsWith('pose_') && (f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png')))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
          });

        for (let i = 0; i < sessionFiles.length; i++) {
          const file = sessionFiles[i];
          if (!file) continue;
          const src = path.join(sessionDir, file);
          const dest = path.join(tmpDir, `photo_${i}.jpg`);
          fs.copyFileSync(src, dest);
          validPhotoPaths.push(dest);
        }
      }

      if (validPhotoPaths.length === 0) {
        throw new Error('Tidak ada file foto valid yang dapat diproses untuk slideshow.');
      }

      // 2. Tentukan looping agar durasi total minimal ~5-7 detik (Beat Cut yang dinamis)
      let sequence = [...validPhotoPaths];
      const singleCycleDuration = sequence.length * durationPerPhoto;
      if (singleCycleDuration < 5.0 && sequence.length <= 4) {
        const repeatCount = Math.max(2, Math.ceil(5.0 / singleCycleDuration));
        const expanded: string[] = [];
        for (let r = 0; r < repeatCount; r++) {
          expanded.push(...sequence);
        }
        sequence = expanded;
      }

      const totalDuration = sequence.length * durationPerPhoto;

      // 3. Buat file ffconcat
      const concatFile = path.join(tmpDir, 'concat.txt');
      let concatContent = 'ffconcat version 1.0\n';
      for (const filePath of sequence) {
        const safePath = filePath.replace(/\\/g, '/');
        concatContent += `file '${safePath}'\nduration ${durationPerPhoto}\n`;
      }
      const lastItem = sequence[sequence.length - 1];
      if (lastItem) {
        concatContent += `file '${lastItem.replace(/\\/g, '/')}'\n`;
      }
      fs.writeFileSync(concatFile, concatContent, 'utf-8');

      // 4. Jalankan FFmpeg (Vertical 9:16 tanpa audio)
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatFile)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions([
            `-vf scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`,
            '-c:v libx264',
            '-preset fast',
            '-crf 18',
            '-tune stillimage',
            '-profile:v high',
            '-level 4.2',
            '-b:v 6000k',
            '-maxrate 12000k',
            '-bufsize 16000k',
            '-pix_fmt yuv420p',
            '-movflags +faststart',
            `-r ${fps}`,
          ])
          .output(outputFilePath)
          .on('start', (commandLine) => {
            humanLogger.info('Slideshow:FFmpeg', `Eksekusi: ${commandLine}`);
          })
          .on('end', () => {
            humanLogger.info('Slideshow:FFmpeg', `Sukses menghasilkan ${outputFileName}`);
            resolve();
          })
          .on('error', (err, _stdout, stderr) => {
            humanLogger.warn('Slideshow:FFmpeg', `Gagal: ${err.message}`);
            humanLogger.warn('Slideshow:FFmpeg', `Stderr: ${stderr}`);
            reject(err);
          })
          .run();
      });

      const stat = fs.statSync(outputFilePath);

      return {
        success: true,
        fileName: outputFileName,
        filePath: outputFilePath,
        sizeBytes: stat.size,
        durationSec: totalDuration,
        width: targetWidth,
        height: targetHeight,
      };
    } catch (err: any) {
      humanLogger.warn('Slideshow', `Gagal menyusun Slideshow Video: ${err?.message || err}`);
      if (fs.existsSync(outputFilePath)) {
        try {
          const s = fs.statSync(outputFilePath);
          if (s.size <= 100) fs.unlinkSync(outputFilePath);
        } catch {}
      }
      return {
        success: false,
        fileName: outputFileName,
        filePath: outputFilePath,
        sizeBytes: 0,
        durationSec: 0,
        width: targetWidth,
        height: targetHeight,
        error: err?.message || 'Gagal memproses video slideshow dengan FFmpeg',
      };
    } finally {
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch {
        // ignore
      }
    }
  }
}

export const livePhotoTranscoder = new LivePhotoTranscoderService();
