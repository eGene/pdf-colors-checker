import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { expect, type TestContext } from 'vitest';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../test-fixtures');

export interface FixtureExpected {
  pages: number;
  rgbColorPages?: number[];
  cmykColorPagesAt0?: number[];
  cmykColorPagesAtDefault?: number[];
  profileSpaces?: string[];
  profileSpots?: string[];
  profileHasIcc?: boolean;
}

export interface FixtureEntry {
  id: string;
  file: string;
  source?: string;
  license?: string;
  notes?: string;
  optional?: boolean;
  expected: FixtureExpected;
}

export interface FixtureManifest {
  rgbThreshold: number;
  cmykThresholdStrict: number;
  cmykThresholdDefault: number;
  fixtures: FixtureEntry[];
}

export function loadManifest(): FixtureManifest {
  const raw = readFileSync(join(FIXTURES_DIR, 'fixtures.json'), 'utf8');
  return JSON.parse(raw) as FixtureManifest;
}

export function fixturePdfPath(fileName: string): string {
  return join(FIXTURES_DIR, fileName);
}

export function fixturePdfExists(fileName: string): boolean {
  return existsSync(fixturePdfPath(fileName));
}

export function readFixturePdfBuffer(fileName: string): ArrayBuffer {
  const buf = readFileSync(fixturePdfPath(fileName));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export function skipIfMissingPdf(ctx: TestContext, fileName: string, optional = false): void {
  if (!fixturePdfExists(fileName)) {
    ctx.skip(
      optional
        ? `Optional fixture missing: ${fileName} (run yarn fixtures:download)`
        : `Fixture missing: ${fileName} (run yarn fixtures:download)`,
    );
  }
}

export function sameStringSet(a: string[], b: string[]): void {
  expect(new Set(a).size).toBe(a.length);
  expect(new Set(b).size).toBe(b.length);
  expect(new Set(a)).toEqual(new Set(b));
}
