import { describe, it, expect } from 'vitest';
import { generateSchema } from '../routes/generate.js';

/**
 * Watermark schema is hardened against the sprint-12 audit findings.
 * These tests pin the bounds so a future refactor can't silently widen
 * them. Imports the REAL schema rather than a mirror so drift is
 * visible.
 */
describe('Watermark schema bounds', () => {
  const base = { html: '<h1>x</h1>' };

  it('accepts a sensible watermark', () => {
    const r = generateSchema.safeParse({
      ...base,
      watermark: { text: 'DRAFT', color: '#cccccc', opacity: 0.3, angle: -45, fontSize: 64 },
    });
    expect(r.success).toBe(true);
  });

  it('accepts a named CSS color', () => {
    const r = generateSchema.safeParse({
      ...base,
      watermark: { color: 'red' },
    });
    expect(r.success).toBe(true);
  });

  it('rejects a CSS-injection color string', () => {
    const r = generateSchema.safeParse({
      ...base,
      watermark: { color: 'red; } body { display:none } @import url(//attacker) /*' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects watermark.text longer than 200 chars', () => {
    const r = generateSchema.safeParse({
      ...base,
      watermark: { text: 'A'.repeat(201) },
    });
    expect(r.success).toBe(false);
  });

  it('rejects Infinity fontSize', () => {
    const r = generateSchema.safeParse({
      ...base,
      watermark: { fontSize: Number.POSITIVE_INFINITY },
    });
    expect(r.success).toBe(false);
  });

  it('rejects fontSize above 400', () => {
    const r = generateSchema.safeParse({
      ...base,
      watermark: { fontSize: 1e308 },
    });
    expect(r.success).toBe(false);
  });

  it('rejects angle outside [-360, 360]', () => {
    expect(generateSchema.safeParse({ ...base, watermark: { angle: 720 } }).success).toBe(false);
    expect(generateSchema.safeParse({ ...base, watermark: { angle: -361 } }).success).toBe(false);
  });

  it('rejects opacity above 1', () => {
    const r = generateSchema.safeParse({ ...base, watermark: { opacity: 1.5 } });
    expect(r.success).toBe(false);
  });

  it('rejects opacity below 0', () => {
    const r = generateSchema.safeParse({ ...base, watermark: { opacity: -0.1 } });
    expect(r.success).toBe(false);
  });
});
