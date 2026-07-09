// @vitest-environment node

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { pdf2png } from '../../src/lib/pdf2png';
import { loadManifest, readFixturePdfBuffer, skipIfMissingPdf } from '../helpers/fixtures';

const workerSrc = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../node_modules/pdfjs-dist/legacy/build/pdf.worker',
);

describe('pdf2png fixtures', () => {
  const manifest = loadManifest();
  const targets = manifest.fixtures.filter((fx) =>
    ['grayscale-image', 'pdflatex-4-pages'].includes(fx.id),
  );

  for (const fx of targets) {
    it(`${fx.id}: renders expected page count as PNG data URLs`, async (ctx) => {
      skipIfMissingPdf(ctx, fx.file, Boolean(fx.optional));
      const bytes = readFixturePdfBuffer(fx.file);
      const images = await pdf2png(bytes, {
        renderDelayMs: 0,
        workerSrc,
        useNodeCanvas: true,
      });
      expect(images).toHaveLength(fx.expected.pages);
      for (const url of images) {
        expect(url).toMatch(/^data:image\/png;base64,/);
        expect(url.length).toBeGreaterThan(100);
      }
    });
  }
});
