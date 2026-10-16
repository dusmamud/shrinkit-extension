/**
 * Social media resizer engine for the ShrinkIt extension.
 *
 * Ported from the ShrinkIt web app's social engine. Fits the source photo to
 * the exact preset dimensions, either center-cropping to fill the box
 * ('crop-fill') or fitting the whole photo inside with dark padding
 * ('fit-pad', so nothing is cropped out). Encodes JPEG at quality 0.92.
 *
 * The preset labels are the contracted English identifiers; the UI renders
 * localized preset names via t() keyed by preset id (see SocialTool).
 * Engine errors use coded messages ('decode-failed', 'encode-failed') so
 * the caller can localize them.
 */
export interface SocialPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

function isOffscreen(canvas: OffscreenCanvas | HTMLCanvasElement): canvas is OffscreenCanvas {
  return typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas;
}

export type SocialFitMode = 'crop-fill' | 'fit-pad';

export const SOCIAL_PRESETS: SocialPreset[] = [
  { id: 'ig-square', label: 'Instagram Square', width: 1080, height: 1080 },
  { id: 'ig-story', label: 'Instagram Story / Reel', width: 1080, height: 1920 },
  { id: 'yt-thumb', label: 'YouTube Thumbnail', width: 1280, height: 720 },
  { id: 'li-banner', label: 'LinkedIn Banner', width: 1584, height: 396 },
  { id: 'fb-post', label: 'Facebook Post', width: 1200, height: 630 },
  { id: 'x-post', label: 'X Post', width: 1600, height: 900 },
];

export async function resizeToPreset(
  file: File,
  preset: SocialPreset,
  fitMode: SocialFitMode = 'crop-fill',
): Promise<Blob> {
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

  if (fitMode === 'crop-fill') {
    const targetAspect = targetWidth / targetHeight;
    const srcAspect = srcWidth / srcHeight;
    let cropWidth = srcWidth;
    let cropHeight = srcHeight;
    let cropX = 0;
    let cropY = 0;
    if (srcAspect > targetAspect) {
      cropWidth = Math.round(srcHeight * targetAspect);
      cropX = Math.round((srcWidth - cropWidth) / 2);
    } else {
      cropHeight = Math.round(srcWidth / targetAspect);
      cropY = Math.round((srcHeight - cropHeight) / 2);
    }
    ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  } else {
    ctx.fillStyle = '#121214';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
    const scaledWidth = Math.round(srcWidth * scale);
    const scaledHeight = Math.round(srcHeight * scale);
    const dx = Math.round((targetWidth - scaledWidth) / 2);
    const dy = Math.round((targetHeight - scaledHeight) / 2);
    ctx.drawImage(bitmap, dx, dy, scaledWidth, scaledHeight);
  }
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
