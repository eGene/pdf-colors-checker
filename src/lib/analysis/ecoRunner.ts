import { PDFDocument } from 'pdf-lib';
import type { InkCoverageRow } from '@/types/analysis';
import type { DocumentSafety, EcoOptions, EcoProgress, InkPlateTotals } from '@/types/ecoOptimize';
import { parseInkcovLine } from '@/lib/inkcovParse';
import { optimizePdfEmbeddedFonts } from '@/lib/ecoFonts/pdfFontOptimize';
import {
  appendFlattenedPage,
  finishFlattenedPdf,
} from '@/lib/ecoFlatten/rebuildPdf';
import { openPdfDocument, renderPageRaster } from '@/lib/ecoFlatten/renderPages';
import { runFreshGhostscriptJob } from '@/lib/ecoOptimize/freshGhostscript';
import {
  downsampleImagesArgs,
  grayscalePdfArgs,
  inkcovArgs,
  removeImagesArgs,
} from '@/lib/ecoOptimize/gsArgs';
import { aggregateInkPlates } from '@/lib/ecoOptimize/inkTotals';

export interface EcoRunResult {
  output: Uint8Array;
  outputSize: number;
  beforeInk: InkPlateTotals;
  afterInk: InkPlateTotals;
  notes: string[];
}

export interface EcoRunCallbacks {
  onProgress: (progress: EcoProgress) => void;
  isCancelled: () => boolean;
}

async function runInkcov(pdf: Uint8Array, pageAreas: number[]): Promise<InkPlateTotals> {
  const { ok, stdout } = await runFreshGhostscriptJob(inkcovArgs({ resolution: 300 }), pdf);
  if (!ok) throw new Error('Ink coverage measurement failed');
  const rows: InkCoverageRow[] = [];
  let page = 1;
  for (const line of stdout) {
    const parsed = parseInkcovLine(line);
    if (!parsed) continue;
    rows.push({ page, c: parsed.c, m: parsed.m, y: parsed.y, k: parsed.k });
    page += 1;
  }
  return aggregateInkPlates(rows, pageAreas);
}

function keepSmallerOf(original: Uint8Array, candidate: Uint8Array): {
  bytes: Uint8Array;
  grew: boolean;
} {
  if (candidate.byteLength >= original.byteLength) {
    return { bytes: original, grew: true };
  }
  return { bytes: candidate, grew: false };
}

async function runImageStage(
  working: Uint8Array,
  kind: 'downsample' | 'remove',
  args: string[],
  grewNote: string,
  okNote: string,
): Promise<{ bytes: Uint8Array; note: string }> {
  const beforeStage = working;
  const result = await runFreshGhostscriptJob(args, working, { readOutputFile: 'output.pdf' });
  if (!result.ok || !result.outputPdf) {
    throw new Error(kind === 'downsample' ? 'Image downsample failed' : 'Image removal failed');
  }
  const kept = keepSmallerOf(beforeStage, result.outputPdf);
  return { bytes: kept.bytes, note: kept.grew ? grewNote : okNote };
}

export async function runEcoOptimize(
  input: Uint8Array,
  options: EcoOptions,
  safety: DocumentSafety,
  cb: EcoRunCallbacks,
): Promise<EcoRunResult> {
  const notes: string[] = [];
  if (!safety.pageAreas.length) {
    throw new Error('Missing page geometry from safety check — cannot compare ink coverage.');
  }
  const pageAreas = safety.pageAreas;

  const throwIfCancelled = () => {
    if (cb.isCancelled()) {
      const err = new Error('cancelled');
      err.name = 'EcoCancelled';
      throw err;
    }
  };

  cb.onProgress({ phase: 'Measuring ink (before)', current: 0, total: 1 });
  throwIfCancelled();
  const beforeInk = await runInkcov(input, pageAreas);
  throwIfCancelled();

  let working = input;
  const originalSize = input.byteLength;
  let afterPageAreas = pageAreas;

  if (options.mode === 'vector') {
    if (options.grayscale) {
      cb.onProgress({ phase: 'Converting to grayscale', current: 1, total: 4 });
      throwIfCancelled();
      const result = await runFreshGhostscriptJob(grayscalePdfArgs(), working, {
        readOutputFile: 'output.pdf',
      });
      if (!result.ok || !result.outputPdf) throw new Error('Grayscale conversion failed');
      working = result.outputPdf;
      notes.push('Applied grayscale conversion (may increase black toner on K-only printers).');
    }

    if (options.images === 'downsample') {
      cb.onProgress({ phase: 'Downsampling images', current: 2, total: 4 });
      throwIfCancelled();
      const stage = await runImageStage(
        working,
        'downsample',
        downsampleImagesArgs(options.imageDpi),
        'Image downsample would have increased file size — kept the smaller file.',
        `Downsampled images to ${options.imageDpi} dpi.`,
      );
      working = stage.bytes;
      notes.push(stage.note);
    } else if (options.images === 'remove') {
      cb.onProgress({ phase: 'Removing images', current: 2, total: 4 });
      throwIfCancelled();
      const stage = await runImageStage(
        working,
        'remove',
        removeImagesArgs(),
        'Removing images would have increased file size — kept the smaller file.',
        'Removed embedded images.',
      );
      working = stage.bytes;
      notes.push(stage.note);
    }

    if (options.ecoFonts) {
      cb.onProgress({ phase: 'Optimizing embedded fonts', current: 3, total: 4 });
      throwIfCancelled();
      const fontInput = working.slice().buffer;
      const fontResult = await optimizePdfEmbeddedFonts(
        fontInput,
        options.ecoFontIntensity,
        (info) => {
          cb.onProgress({
            phase: `Economy text: ${info.fileName}`,
            current: info.glyphsDone,
            total: Math.max(1, info.glyphsTotal),
          });
        },
      );
      if (fontResult.empty) {
        notes.push(
          fontResult.warnings[0] ??
            'No embedded fonts found — nothing to optimize for text in this document',
        );
      } else {
        working = new Uint8Array(fontResult.data);
        notes.push(
          `Economy text applied to ${fontResult.processedFonts.length} font(s) (selectable text kept; ink delta may be small).`,
        );
        notes.push(...fontResult.warnings);
      }
    }
  } else {
    if (safety.hasAcroForm && !options.flattenAcroFormConfirmed) {
      throw new Error('Flatten is blocked until you confirm that form fields may be removed.');
    }
    cb.onProgress({ phase: 'Flattening pages', current: 0, total: 1 });
    throwIfCancelled();

    const doc = await PDFDocument.create();
    const pdf = await openPdfDocument(working);
    const areas: number[] = [];
    try {
      const total = pdf.numPages;
      for (let i = 1; i <= total; i++) {
        throwIfCancelled();
        cb.onProgress({ phase: 'Flattening pages', current: i, total });
        const rendered = await renderPageRaster(pdf, i, options.flattenDpi);
        areas.push(rendered.pageWidthPt * rendered.pageHeightPt);
        await appendFlattenedPage(doc, rendered, {
          style: options.flattenStyle,
          grayscale: options.flattenGrayscale,
          softStrength: options.flattenSoftStrength,
          threshold: options.flattenThreshold,
          jpegQuality: options.flattenJpegQuality,
        });
        // Drop page raster immediately — do not accumulate N pages of RGBA.
      }
    } finally {
      await pdf.destroy();
    }

    const rebuilt = await finishFlattenedPdf(doc);
    const kept = keepSmallerOf(working, rebuilt);
    working = kept.bytes;
    if (kept.grew) {
      notes.push(
        'Flattened output was larger than the input — kept the smaller original file (no flatten applied).',
      );
    } else {
      afterPageAreas = areas;
      notes.push(
        'Flattened pages — selectable text, links, annotations, bookmarks, forms, and tags are not preserved.',
      );
    }
  }

  throwIfCancelled();
  cb.onProgress({ phase: 'Measuring ink (after)', current: 1, total: 1 });
  const afterInk = await runInkcov(working, afterPageAreas);

  if (working.byteLength > originalSize && options.mode === 'vector') {
    notes.push(
      `Output file is ${working.byteLength} bytes (was ${originalSize}). Size can grow after pdfwrite re-encoding.`,
    );
  }

  notes.push(
    'Ink figures use Ghostscript inkcov at 300 dpi. Real savings are device-dependent — colour-cartridge avoidance on inkjets; near-zero on printers already imaging in K only. Black can rise after grayscale.',
  );

  return {
    output: working,
    outputSize: working.byteLength,
    beforeInk,
    afterInk,
    notes,
  };
}
