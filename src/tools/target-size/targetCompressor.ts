/**
 * Target file-size compressor for the ShrinkIt extension.
 *
 * Ported from the ShrinkIt web app's target-size compressor, adapted to the
 * extension contract:
 *   compressToTargetKb(file, targetKb, { format })
 *     -> { blob, bytes, quality, width, height }
 *
 * Strategy: binary-search JPEG/WebP quality (8 iterations, early stop when
 * within 2% / 500 bytes of the ceiling), then a bounded scale-down loop
 * (×0.85 per step, at most 12 steps, never below 64 px). PNG is lossless, so
 * quality is meaningless there: encode once per size and rely on scaling.
 *
 * Honest failure: when no quality / dimension combination fits the ceiling,
 * this throws Error('target-unreachable') instead of returning an
 * over-target blob. Callers map the coded messages ('invalid-target',
 * 'decode-failed', 'encode-failed', 'target-unreachable') to localized text.
 * The input blob is returned untouched when it already fits the ceiling and
 * its MIME type matches the requested format, so a 30 KB PNG asked for
 * "< 50 KB PNG" is never pointlessly re-encoded (and possibly enlarged).
 */
import { FORMAT_MIME } from '../../lib/image/filenames';

export type TargetFormat = 'jpeg' | 'png' | 'webp';

export interface TargetCompressResult {
  blob: Blob;
  bytes: number;
  /** Best quality that fit, 0–100. 100 for PNG (lossless) and for the fast path. */
  quality: number;
  width: number;
  height: number;
}

export interface TargetCompressOptions {
  format: TargetFormat;
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function isOffscreen(canvas: AnyCanvas): canvas is OffscreenCanvas {
  return typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas;
}

function encodeCanvas(canvas: AnyCanvas, mime: string, quality: number): Promise<Blob> {
  if (isOffscreen(canvas)) {
    return canvas.convertToBlob({ type: mime, quality });
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode-failed'))),
      mime,
      quality,
    );
  });
}

export async function compressToTargetKb(
  file: File,
  targetKb: number,
  opts: TargetCompressOptions,
): Promise<TargetCompressResult> {
  if (!Number.isFinite(targetKb) || targetKb <= 0) {
    throw new Error('invalid-target');
  }
  const targetBytes = Math.floor(targetKb * 1024);
  const mime = FORMAT_MIME[opts.format];
  const lossless = opts.format === 'png';

  // Fast path: already fits, same format — return the input untouched.
  if (file.size <= targetBytes && file.type === mime) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error('decode-failed');
    }
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    if (width <= 0 || height <= 0) {
      throw new Error('decode-failed');
    }
    return { blob: file, bytes: file.size, quality: 100, width, height };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('decode-failed');
  }
  const srcWidth = bitmap.width;
  const srcHeight = bitmap.height;
  if (srcWidth <= 0 || srcHeight <= 0) {
    bitmap.close();
    throw new Error('decode-failed');
  }

  // Cap very large inputs up front (same rule as the web app: 1200 px for
  // <= 50 KB targets, 2400 px otherwise).
  const maxDim = targetKb <= 50 ? 1200 : 2400;
  let width = srcWidth;
  let height = srcHeight;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('encode-failed');
  }

  const encodeAt = async (w: number, h: number, quality: number): Promise<Blob> => {
    canvas.width = w;
    canvas.height = h;
    if (opts.format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    return encodeCanvas(canvas, mime, quality);
  };

  /** Best fit at the given dimensions, or null when nothing fits there. */
  const bestFitAt = async (
    w: number,
    h: number,
  ): Promise<{ blob: Blob; quality: number } | null> => {
    if (lossless) {
      const blob = await encodeAt(w, h, 1);
      return blob.size <= targetBytes ? { blob, quality: 1 } : null;
    }
    let minQ = 0.05;
    let maxQ = 0.98;
    let best: { blob: Blob; quality: number } | null = null;
    for (let i = 0; i < 8; i++) {
      const midQ = (minQ + maxQ) / 2;
      const blob = await encodeAt(w, h, midQ);
      if (blob.size <= targetBytes) {
        best = { blob, quality: midQ };
        minQ = midQ;
        if (targetBytes - blob.size <= Math.max(500, targetBytes * 0.02)) {
          break;
        }
      } else {
        maxQ = midQ;
      }
    }
    return best;
  };

  try {
    let best = await bestFitAt(width, height);

    // Scale-down loop: bounded, so it can never run forever.
    let steps = 0;
    while (!best && steps < 12) {
      const nextWidth = Math.max(64, Math.round(width * 0.85));
      const nextHeight = Math.max(64, Math.round(height * 0.85));
      if (nextWidth === width && nextHeight === height) {
        break;
      }
      width = nextWidth;
      height = nextHeight;
      steps += 1;
      best = await bestFitAt(width, height);
    }

    if (!best) {
      throw new Error('target-unreachable');
    }
    return {
      blob: best.blob,
      bytes: best.blob.size,
      quality: Math.round(best.quality * 100),
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
}
