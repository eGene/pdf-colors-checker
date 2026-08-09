import { PDFDocument, PDFName, PDFNumber } from 'pdf-lib';
import type { FlattenStyle } from '@/types/ecoOptimize';
import {
  applyOutline,
  applySoftLighten,
  applyThreshold,
  pack1BitDeviceGray,
  pack8BitDeviceGray,
} from './applyStyle';
import type { RenderedPage } from './renderPages';

export interface FlattenRebuildOptions {
  style: FlattenStyle;
  grayscale: boolean;
  softStrength: number;
  threshold: number;
  jpegQuality: number;
}

async function imageDataToPngBytes(imageData: ImageData): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
  ctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

async function imageDataToJpgBytes(imageData: ImageData, quality: number): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
  ctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: Math.max(0.4, Math.min(0.95, quality)),
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function assignDeviceGrayImage(
  doc: PDFDocument,
  ref: import('pdf-lib').PDFRef,
  bytes: Uint8Array,
  width: number,
  height: number,
  bitsPerComponent: 1 | 8,
): void {
  const newStream = doc.context.flateStream(bytes);
  newStream.dict.set(PDFName.of('Type'), PDFName.of('XObject'));
  newStream.dict.set(PDFName.of('Subtype'), PDFName.of('Image'));
  newStream.dict.set(PDFName.of('Width'), PDFNumber.of(width));
  newStream.dict.set(PDFName.of('Height'), PDFNumber.of(height));
  newStream.dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceGray'));
  newStream.dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(bitsPerComponent));
  doc.context.assign(ref, newStream);
}

/**
 * Append one transformed page. drawImage embeds the PNG/JPEG; we then swap
 * the known image ref to a packed DeviceGray stream — no save/reload/enumerate.
 */
export async function appendFlattenedPage(
  doc: PDFDocument,
  page: RenderedPage,
  opts: FlattenRebuildOptions,
): Promise<void> {
  const data = page.imageData.data;
  if (opts.style === 'soft') {
    applySoftLighten(data, opts.softStrength, opts.grayscale);
  } else if (opts.style === 'threshold') {
    applyThreshold(data, opts.threshold);
  } else {
    applyOutline(data, page.width, page.height);
  }

  const pdfPage = doc.addPage([page.pageWidthPt, page.pageHeightPt]);
  const useJpeg = opts.style === 'soft' && !opts.grayscale;

  if (useJpeg) {
    const jpg = await imageDataToJpgBytes(page.imageData, opts.jpegQuality);
    const img = await doc.embedJpg(jpg);
    pdfPage.drawImage(img, {
      x: 0,
      y: 0,
      width: page.pageWidthPt,
      height: page.pageHeightPt,
    });
    return;
  }

  const png = await imageDataToPngBytes(page.imageData);
  const img = await doc.embedPng(png);
  pdfPage.drawImage(img, {
    x: 0,
    y: 0,
    width: page.pageWidthPt,
    height: page.pageHeightPt,
  });

  const w = page.width;
  const h = page.height;
  if (opts.style === 'threshold' || opts.style === 'outline') {
    assignDeviceGrayImage(doc, img.ref, pack1BitDeviceGray(data, w, h), w, h, 1);
  } else if (opts.style === 'soft' && opts.grayscale) {
    // Soft+grayscale already forced R=G=B — pack 8bpc DeviceGray without a runtime check.
    assignDeviceGrayImage(doc, img.ref, pack8BitDeviceGray(data, w, h), w, h, 8);
  }
}

export async function finishFlattenedPdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: false });
}

/** Convenience: rebuild from an in-memory page list (tests / small docs). */
export async function rebuildFlattenedPdf(
  pages: RenderedPage[],
  opts: FlattenRebuildOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const page of pages) {
    await appendFlattenedPage(doc, page, opts);
  }
  return finishFlattenedPdf(doc);
}
