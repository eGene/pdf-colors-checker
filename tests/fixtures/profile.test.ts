import { describe, expect, it } from 'vitest';
import { analyzeColorProfile } from '../../src/lib/colorProfile';
import {
  loadManifest,
  readFixturePdfBuffer,
  sameStringSet,
  skipIfMissingPdf,
} from '../helpers/fixtures';

describe('profile fixtures', () => {
  const manifest = loadManifest();

  for (const fx of manifest.fixtures) {
    it(`${fx.id}: documentColorSpaces match fixtures.json`, async (ctx) => {
      skipIfMissingPdf(ctx, fx.file, Boolean(fx.optional));
      const result = await analyzeColorProfile(readFixturePdfBuffer(fx.file));
      sameStringSet(result.documentColorSpaces, fx.expected.profileSpaces ?? []);
    });

    if (fx.expected.profileSpots) {
      it(`${fx.id}: spot colors match fixtures.json`, async (ctx) => {
        skipIfMissingPdf(ctx, fx.file, Boolean(fx.optional));
        const result = await analyzeColorProfile(readFixturePdfBuffer(fx.file));
        expect(result.spotColors.map((s) => s.name)).toEqual(fx.expected.profileSpots);
      });
    }

    if (fx.expected.profileHasIcc != null) {
      it(`${fx.id}: ICC presence matches fixtures.json`, async (ctx) => {
        skipIfMissingPdf(ctx, fx.file, Boolean(fx.optional));
        const result = await analyzeColorProfile(readFixturePdfBuffer(fx.file));
        expect(Boolean(result.icc)).toBe(fx.expected.profileHasIcc);
      });
    }
  }

  it('detects direct device-color operators in the Northline demo', async () => {
    const result = await analyzeColorProfile(
      readFixturePdfBuffer('northline-print-quote-demo.pdf'),
    );

    expect(result.verdict).toBe('This PDF mixes RGB, CMYK, and spot colors');
    expect(result.perPage[1].colorSpaces).toContain('GRAYSCALE');
    expect(result.perPage[3].colorSpaces).toContain('RGB');
    expect(result.perPage[5].colorSpaces).toContain('CMYK');
    expect(result.perPage[6].colorSpaces).toContain('CMYK');
    expect(result.perPage[7].colorSpaces).toContain('CMYK');
    expect(result.perPage[10].spotColors).toContain('NorthlineOrange');
  });
});
