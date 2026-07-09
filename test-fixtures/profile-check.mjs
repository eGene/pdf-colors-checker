#!/usr/bin/env node
/** Print documentColorSpaces per fixture (uses app colorProfile.js). */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { analyzeColorProfile } from '../src/lib/colorProfile.js';

const dir = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(dir, 'fixtures.json'), 'utf8'));

for (const fx of manifest.fixtures) {
  const path = join(dir, fx.file);
  try {
    const buf = readFileSync(path);
    const result = await analyzeColorProfile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    console.log(
      JSON.stringify({
        id: fx.id,
        spaces: result.documentColorSpaces,
        spots: result.spotColors.map((s) => s.name),
        hasIcc: Boolean(result.icc),
        verdict: result.verdict,
      }),
    );
  } catch (e) {
    console.log(JSON.stringify({ id: fx.id, error: String(e.message || e) }));
  }
}
