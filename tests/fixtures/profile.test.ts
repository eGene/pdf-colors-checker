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
});
