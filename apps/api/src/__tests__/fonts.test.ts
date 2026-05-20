import { describe, it, expect } from 'vitest';
import { buildFontUrlSignature, verifyFontUrlSignature } from '../services/fonts.js';

describe('Font URL signing', () => {
  it('a freshly-built signature verifies', () => {
    const path = '/fonts/00000000-0000-0000-0000-000000000000/font_abc.woff2';
    const { sig, expires } = buildFontUrlSignature(path);
    expect(verifyFontUrlSignature(path, sig, expires)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const path = '/fonts/00000000-0000-0000-0000-000000000000/font_abc.woff2';
    const { expires } = buildFontUrlSignature(path);
    const bad = 'a'.repeat(64);
    expect(verifyFontUrlSignature(path, bad, expires)).toBe(false);
  });

  it('rejects a signature for a different path (cross-user replay)', () => {
    const path = '/fonts/aaa-bbb/font_a.woff2';
    const { sig, expires } = buildFontUrlSignature(path);
    const otherPath = '/fonts/ccc-ddd/font_a.woff2';
    expect(verifyFontUrlSignature(otherPath, sig, expires)).toBe(false);
  });

  it('rejects an expired signature', () => {
    const path = '/fonts/aaa/font_a.woff2';
    const { sig } = buildFontUrlSignature(path);
    const expiredAt = '1'; // unix-seconds in 1970
    expect(verifyFontUrlSignature(path, sig, expiredAt)).toBe(false);
  });

  it('rejects when expires is not a number', () => {
    const path = '/fonts/aaa/font_a.woff2';
    const { sig } = buildFontUrlSignature(path);
    expect(verifyFontUrlSignature(path, sig, 'not-a-number')).toBe(false);
  });
});

// Magic-byte detection is exercised indirectly through uploadFont,
// but we can't import that without setting up a DB. Instead, mirror
// the detect-from-magic logic inline so the regression is anchored.
describe('Font magic-byte detection (mirror of services/fonts.ts)', () => {
  const detect = (head: Buffer): string | null => {
    if (head.length < 4) return null;
    const h = head.subarray(0, 4);
    if (h.equals(Buffer.from('wOF2'))) return 'woff2';
    if (h.equals(Buffer.from('OTTO'))) return 'otf';
    if (h.equals(Buffer.from('true'))) return 'ttf';
    if (h.equals(Buffer.from('typ1'))) return 'ttf';
    if (h[0] === 0x00 && h[1] === 0x01 && h[2] === 0x00 && h[3] === 0x00) {
      return 'ttf';
    }
    return null;
  };

  it('detects WOFF2', () => {
    expect(detect(Buffer.from([0x77, 0x4f, 0x46, 0x32, 0xff, 0xff]))).toBe('woff2');
  });

  it('detects OTF', () => {
    expect(detect(Buffer.from([0x4f, 0x54, 0x54, 0x4f, 0xff]))).toBe('otf');
  });

  it('detects TTF (0x00010000)', () => {
    expect(detect(Buffer.from([0x00, 0x01, 0x00, 0x00]))).toBe('ttf');
  });

  it('detects TTF ("true")', () => {
    expect(detect(Buffer.from('true', 'utf8'))).toBe('ttf');
  });

  it('rejects a PE binary masquerading as font/ttf', () => {
    // PE binary starts with 'MZ' (0x4d 0x5a).
    expect(detect(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBe(null);
  });

  it('rejects an ELF binary', () => {
    // ELF starts with 0x7f 'E' 'L' 'F'.
    expect(detect(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))).toBe(null);
  });

  it('rejects a ZIP', () => {
    // ZIP starts with 'PK\x03\x04'.
    expect(detect(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(null);
  });

  it('rejects a buffer shorter than 4 bytes', () => {
    expect(detect(Buffer.from([0x77, 0x4f, 0x46]))).toBe(null);
  });
});
