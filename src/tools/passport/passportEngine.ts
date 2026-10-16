/**
 * Passport & visa photo engine for the ShrinkIt extension.
 *
 * Ported from the ShrinkIt web app's passport engine. Center-crops the
 * source photo to the preset aspect ratio (with a slight top bias so heads
 * stay framed), resizes to the exact preset pixel dimensions, composites on
 * a solid white background, and encodes JPEG at quality 0.92.
 *
 * The preset labels are the contracted English identifiers; the UI renders
 * localized preset names via t() keyed by preset id (see PassportTool).
 * Engine errors use coded messages ('decode-failed', 'encode-failed') so
 * the caller can localize them.
 */
export interface PassportPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  dpi: number;
}

function isOffscreen(canvas: OffscreenCanvas | HTMLCanvasElement): canvas is OffscreenCanvas {
  return typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas;
}

export const PASSPORT_PRESETS: PassportPreset[] = [
  { id: 'in-35x45', label: 'India 35×45mm', width: 413, height: 531, dpi: 300 },
  { id: 'us-2x2', label: 'US 2×2 inch', width: 600, height: 600, dpi: 300 },
];

export async function makePassportPhoto(file: File, preset: PassportPreset): Promise<Blob> {
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

  const targetWidth = preset.width;
  const targetHeight = preset.height;
  const targetAspect = targetWidth / targetHeight;
  const srcAspect = srcWidth / srcHeight;

  // Center-crop the source to the target aspect ratio. For tall sources the
  // crop is biased toward the top (30%) so the head stays in frame.
  let cropWidth = srcWidth;
  let cropHeight = srcHeight;
  let cropX = 0;
  let cropY = 0;
  if (srcAspect > targetAspect) {
    cropWidth = Math.round(srcHeight * targetAspect);
    cropX = Math.round((srcWidth - cropWidth) / 2);
  } else {
    cropHeight = Math.round(srcWidth / targetAspect);
    cropY = Math.max(0, Math.round((srcHeight - cropHeight) * 0.3));
  }

  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(targetWidth, targetHeight)
      : document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('encode-failed');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  if (isOffscreen(canvas)) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode-failed'))),
      'image/jpeg',
      0.92,
    );
  });
}
