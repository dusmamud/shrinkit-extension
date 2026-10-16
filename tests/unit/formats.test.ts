import { describe, expect, it } from 'vitest';
import { isSupportedInputFile, isSupportedInputFileName } from '../../src/lib/image/filenames';

/**
 * Full input-format matrix for isSupportedInputFile / isSupportedInputFileName.
 *
 * Supported inputs (web-app parity): jpg, jpeg, png, gif, webp, bmp, avif.
 * SVG is deliberately REJECTED — the tool cannot decode it.
 * Acceptance is by extension OR by MIME: a valid extension wins even when
 * the MIME is empty or unrelated, and a valid MIME wins even with no
 * usable extension in the file name.
 */

const SUPPORTED: Array<{ ext: string; mime: string }> = [
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'jpeg', mime: 'image/jpeg' },
  { ext: 'png', mime: 'image/png' },
  { ext: 'gif', mime: 'image/gif' },
  { ext: 'webp', mime: 'image/webp' },
  { ext: 'bmp', mime: 'image/bmp' },
  { ext: 'avif', mime: 'image/avif' },
];

describe('supported inputs — correct MIME', () => {
  it.each(SUPPORTED)('accepts .$ext with $mime', ({ ext, mime }) => {
    expect(isSupportedInputFile(new File([], `photo.${ext}`, { type: mime }))).toBe(true);
  });
});

describe('supported inputs — empty MIME (extension only)', () => {
  it.each(SUPPORTED)('accepts .$ext with empty MIME', ({ ext }) => {
    expect(isSupportedInputFile(new File([], `photo.${ext}`, { type: '' }))).toBe(true);
  });
});

describe('supported inputs — odd MIME (extension wins)', () => {
  it.each(SUPPORTED)('accepts .$ext with application/octet-stream MIME', ({ ext }) => {
    expect(
      isSupportedInputFile(new File([], `photo.${ext}`, { type: 'application/octet-stream' })),
    ).toBe(true);
  });
  it('accepts a valid extension even with an unrelated text MIME', () => {
    expect(isSupportedInputFile(new File([], 'photo.png', { type: 'text/plain' }))).toBe(true);
  });
});

describe('supported inputs — MIME only (no usable extension)', () => {
  it.each(SUPPORTED)('accepts $mime with an extensionless name', ({ mime }) => {
    expect(isSupportedInputFile(new File([], 'photo', { type: mime }))).toBe(true);
  });
  it('accepts the legacy Windows BMP MIME image/x-ms-bmp', () => {
    expect(isSupportedInputFile(new File([], 'photo', { type: 'image/x-ms-bmp' }))).toBe(true);
    expect(isSupportedInputFile(new File([], 'photo.bmp', { type: 'image/x-ms-bmp' }))).toBe(true);
  });
  it('accepts an uppercase MIME', () => {
    expect(isSupportedInputFile(new File([], 'photo', { type: 'IMAGE/JPEG' }))).toBe(true);
  });
});

describe('rejected inputs', () => {
  it('rejects SVG with its MIME', () => {
    expect(isSupportedInputFile(new File([], 'pic.svg', { type: 'image/svg+xml' }))).toBe(false);
  });
  it('rejects SVG with empty MIME', () => {
    expect(isSupportedInputFile(new File([], 'pic.svg', { type: '' }))).toBe(false);
  });
  it('rejects SVG by MIME even with an extensionless name', () => {
    expect(isSupportedInputFile(new File([], 'pic', { type: 'image/svg+xml' }))).toBe(false);
  });
  it('rejects PDF', () => {
    expect(isSupportedInputFile(new File([], 'doc.pdf', { type: 'application/pdf' }))).toBe(false);
    expect(isSupportedInputFile(new File([], 'doc.pdf', { type: '' }))).toBe(false);
  });
  it('rejects TXT', () => {
    expect(isSupportedInputFile(new File([], 'note.txt', { type: 'text/plain' }))).toBe(false);
    expect(isSupportedInputFile(new File([], 'note.txt', { type: '' }))).toBe(false);
  });
  it('rejects ICO (icon format, not a supported input)', () => {
    expect(isSupportedInputFile(new File([], 'pic.ico', { type: 'image/x-icon' }))).toBe(false);
    expect(isSupportedInputFile(new File([], 'pic.ico', { type: '' }))).toBe(false);
    expect(isSupportedInputFile(new File([], 'pic', { type: 'image/x-icon' }))).toBe(false);
  });
  it('rejects extensionless files with no/unknown MIME', () => {
    expect(isSupportedInputFile(new File([], 'photo', { type: '' }))).toBe(false);
    expect(isSupportedInputFile(new File([], 'photo', { type: 'application/octet-stream' }))).toBe(
      false,
    );
  });
  it('rejects a supported-looking MIME paired with a wrong extensionless trap', () => {
    // TIFF is not supported: neither its MIME nor its extension may pass.
    expect(isSupportedInputFile(new File([], 'scan.tiff', { type: 'image/tiff' }))).toBe(false);
    expect(isSupportedInputFile(new File([], 'scan', { type: 'image/tiff' }))).toBe(false);
  });
});

describe('isSupportedInputFileName case-insensitivity', () => {
  it.each(['JPG', 'Jpg', 'jPg', 'JPEG', 'Jpeg'])('accepts pic.%s', (ext) => {
    expect(isSupportedInputFileName(`pic.${ext}`)).toBe(true);
  });
  it.each(['Png', 'PNG', 'pNg'])('accepts pic.%s', (ext) => {
    expect(isSupportedInputFileName(`pic.${ext}`)).toBe(true);
  });
  it.each(['AVIF', 'Avif', 'aViF'])('accepts pic.%s', (ext) => {
    expect(isSupportedInputFileName(`pic.${ext}`)).toBe(true);
  });
  it('rejects SVG/PDF/TXT/ICO regardless of case', () => {
    for (const name of ['pic.SVG', 'doc.PDF', 'note.TXT', 'pic.ICO']) {
      expect(isSupportedInputFileName(name)).toBe(false);
    }
  });
});
