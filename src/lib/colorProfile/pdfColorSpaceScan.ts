/**
 * Structural PDF color profile analysis via pdf-lib.
 * Scans page Resources (ColorSpace + image XObjects), not raw content-stream operators.
 */
import {
  PDFName,
  PDFArray,
  PDFDict,
  PDFRawStream,
  PDFRef,
  PDFString,
  PDFHexString,
  PDFNumber,
  type PDFObject,
} from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { componentsToSpace } from './iccDescription';

type PdfContext = import('pdf-lib').PDFDocument['context'];
type StringSet = Set<string>;
type RefSeenSet = Set<string>;

function pdfStringValue(obj: PDFObject | null | undefined): string | null {
  if (!obj) return null;
  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    try {
      const decoded = obj as PDFString & { decodeText?: () => string; asString?: () => string };
      return decoded.decodeText?.() ?? decoded.asString?.() ?? String(obj);
    } catch {
      return null;
    }
  }
  return null;
}

function pdfNameValue(obj: PDFObject | null | undefined): string | null {
  if (!obj) return null;
  if (obj instanceof PDFName) return obj.decodeText();
  return null;
}

function pdfDictNumber(dict: PDFDict | null | undefined, key: string): number | undefined {
  if (!dict) return undefined;
  try {
    const val = dict.lookup(PDFName.of(key));
    if (val instanceof PDFNumber) return val.asNumber();
    return undefined;
  } catch {
    return undefined;
  }
}

function resolveObject(ctx: PdfContext, obj: PDFObject | PDFRef | null | undefined): PDFObject | null {
  if (obj == null) return null;
  if (
    obj instanceof PDFDict ||
    obj instanceof PDFArray ||
    obj instanceof PDFName ||
    obj instanceof PDFString ||
    obj instanceof PDFHexString ||
    obj instanceof PDFRawStream
  ) {
    return obj;
  }
  try {
    return ctx.lookup(obj) ?? null;
  } catch {
    return null;
  }
}

function dictFromXObject(obj: PDFObject | null): PDFDict | null {
  if (obj instanceof PDFDict) return obj;
  if (obj instanceof PDFRawStream) return obj.dict;
  return null;
}

function classifyColorSpaceEntry(
  ctx: PdfContext,
  entry: PDFObject | null,
  spaces: StringSet,
  spots: StringSet,
): void {
  if (!entry) return;

  if (entry instanceof PDFName) {
    const name = pdfNameValue(entry);
    if (name === 'DeviceRGB' || name === 'RGB') spaces.add('RGB');
    else if (name === 'DeviceCMYK' || name === 'CMYK') spaces.add('CMYK');
    else if (name === 'DeviceGray' || name === 'Gray' || name === 'G') spaces.add('GRAYSCALE');
    return;
  }

  if (!(entry instanceof PDFArray) || entry.size() === 0) return;

  const head = entry.lookup(0);
  const headName = head instanceof PDFName ? pdfNameValue(head) : null;
  if (!headName) return;

  if (headName === 'ICCBased' && entry.size() >= 2) {
    const second = resolveObject(ctx, entry.lookup(1));
    if (!(second instanceof PDFRawStream)) return;
    const stream = second;
    const num = pdfDictNumber(stream.dict, 'N');
    const space = componentsToSpace(num);
    if (space) spaces.add(space);
    return;
  }

  if (headName === 'Separation' && entry.size() >= 2) {
    const colorant = entry.lookup(1);
    const spotName = pdfNameValue(colorant) ?? pdfStringValue(colorant);
    if (spotName) {
      spots.add(spotName);
      spaces.add('SPOT COLOR');
    }
    return;
  }

  if (headName === 'DeviceN' && entry.size() >= 2) {
    const namesArr = resolveObject(ctx, entry.lookup(1));
    if (namesArr instanceof PDFArray) {
      for (let i = 0; i < namesArr.size(); i++) {
        const n = namesArr.lookup(i);
        const spotName = pdfNameValue(n) ?? pdfStringValue(n);
        if (spotName) spots.add(spotName);
      }
      spaces.add('SPOT COLOR');
    }
    return;
  }

  if (headName === 'Indexed' || headName === 'I') {
    if (entry.size() >= 2) {
      const base = resolveObject(ctx, entry.lookup(1));
      classifyColorSpaceEntry(ctx, base, spaces, spots);
    }
    return;
  }

  if (headName === 'CalRGB') {
    spaces.add('RGB');
    return;
  }

  if (headName === 'CalGray') {
    spaces.add('GRAYSCALE');
    return;
  }

  if (headName === 'Lab') {
    spaces.add('LAB');
    return;
  }

  if (headName === 'Pattern') {
    if (entry.size() >= 2) {
      const base = resolveObject(ctx, entry.lookup(1));
      classifyColorSpaceEntry(ctx, base, spaces, spots);
    } else {
      spaces.add('RGB');
    }
  }
}

function collectFromColorSpaceDict(
  ctx: PdfContext,
  dict: PDFDict | null,
  spaces: StringSet,
  spots: StringSet,
): void {
  if (!dict) return;
  for (const [, value] of dict.entries()) {
    const resolved = resolveObject(ctx, value);
    classifyColorSpaceEntry(ctx, resolved, spaces, spots);
  }
}

function collectFromXObjects(
  ctx: PdfContext,
  xobjDict: PDFDict | null,
  spaces: StringSet,
  spots: StringSet,
  seen: RefSeenSet,
): void {
  if (!xobjDict) return;
  for (const [, ref] of xobjDict.entries()) {
    if (ref instanceof PDFRef) {
      const key = ref.toString();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    const xobj = resolveObject(ctx, ref);
    const dict = dictFromXObject(xobj);
    if (!dict) continue;
    const subtype = dict.lookupMaybe(PDFName.of('Subtype'), PDFName);
    const subtypeName = pdfNameValue(subtype);

    if (subtypeName === 'Image') {
      const cs = dict.lookup(PDFName.of('ColorSpace'));
      if (cs) {
        classifyColorSpaceEntry(ctx, resolveObject(ctx, cs), spaces, spots);
      }
      continue;
    }

    if (subtypeName === 'Form') {
      const res = resolveObject(ctx, dict.lookup(PDFName.of('Resources')));
      if (res instanceof PDFDict) {
        collectFromResources(ctx, res, spaces, spots, seen);
      }
    }
  }
}

function collectFromShadingObject(
  ctx: PdfContext,
  shading: PDFObject | null,
  spaces: StringSet,
  spots: StringSet,
): void {
  const dict = shading instanceof PDFRawStream ? shading.dict : shading;
  if (!(dict instanceof PDFDict)) return;
  const cs = dict.lookup(PDFName.of('ColorSpace'));
  if (cs) classifyColorSpaceEntry(ctx, resolveObject(ctx, cs), spaces, spots);
}

function collectFromShadings(
  ctx: PdfContext,
  shadingDict: PDFDict | null,
  spaces: StringSet,
  spots: StringSet,
): void {
  if (!(shadingDict instanceof PDFDict)) return;
  for (const [, ref] of shadingDict.entries()) {
    collectFromShadingObject(ctx, resolveObject(ctx, ref), spaces, spots);
  }
}

function collectFromPatterns(
  ctx: PdfContext,
  patternDict: PDFDict | null,
  spaces: StringSet,
  spots: StringSet,
  seen: RefSeenSet,
): void {
  if (!(patternDict instanceof PDFDict)) return;
  for (const [, ref] of patternDict.entries()) {
    if (ref instanceof PDFRef) {
      const key = ref.toString();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    const pattern = resolveObject(ctx, ref);
    const dict = pattern instanceof PDFRawStream ? pattern.dict : pattern;
    if (!(dict instanceof PDFDict)) continue;

    const shading = dict.lookup(PDFName.of('Shading'));
    if (shading) {
      collectFromShadingObject(ctx, resolveObject(ctx, shading), spaces, spots);
    }
    const res = resolveObject(ctx, dict.lookup(PDFName.of('Resources')));
    if (res instanceof PDFDict) {
      collectFromResources(ctx, res, spaces, spots, seen);
    }
  }
}

function collectFromResources(
  ctx: PdfContext,
  res: PDFDict | null,
  spaces: StringSet,
  spots: StringSet,
  seen: RefSeenSet,
): void {
  if (!res) return;
  const csDict = resolveObject(ctx, res.lookup(PDFName.of('ColorSpace')));
  if (csDict instanceof PDFDict) {
    collectFromColorSpaceDict(ctx, csDict, spaces, spots);
  }
  const xobjDict = resolveObject(ctx, res.lookup(PDFName.of('XObject')));
  if (xobjDict instanceof PDFDict) {
    collectFromXObjects(ctx, xobjDict, spaces, spots, seen);
  }
  const shadingDict = resolveObject(ctx, res.lookup(PDFName.of('Shading')));
  if (shadingDict instanceof PDFDict) {
    collectFromShadings(ctx, shadingDict, spaces, spots);
  }
  const patternDict = resolveObject(ctx, res.lookup(PDFName.of('Pattern')));
  if (patternDict instanceof PDFDict) {
    collectFromPatterns(ctx, patternDict, spaces, spots, seen);
  }
}

function getPageResources(_ctx: PdfContext, page: PDFPage): PDFDict | null {
  try {
    return page.node.Resources() ?? null;
  } catch {
    return null;
  }
}

function collectFromAppearanceStream(
  ctx: PdfContext,
  apStream: PDFObject | null,
  spaces: StringSet,
  spots: StringSet,
  seen: RefSeenSet,
): void {
  const dict = apStream instanceof PDFRawStream ? apStream.dict : apStream;
  if (!(dict instanceof PDFDict)) return;
  const res = resolveObject(ctx, dict.lookup(PDFName.of('Resources')));
  if (res instanceof PDFDict) {
    collectFromResources(ctx, res, spaces, spots, seen);
  }
}

function collectFromAnnots(
  ctx: PdfContext,
  annots: PDFArray | null,
  spaces: StringSet,
  spots: StringSet,
  seen: RefSeenSet,
): void {
  if (!(annots instanceof PDFArray)) return;
  for (let i = 0; i < annots.size(); i++) {
    const annot = resolveObject(ctx, annots.get(i));
    if (!(annot instanceof PDFDict)) continue;
    const ap = resolveObject(ctx, annot.lookup(PDFName.of('AP')));
    if (!(ap instanceof PDFDict)) continue;

    const nRef = ap.lookup(PDFName.of('N'));
    if (nRef instanceof PDFRef) {
      const key = nRef.toString();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    const normal = resolveObject(ctx, nRef);
    if (normal instanceof PDFRawStream) {
      collectFromAppearanceStream(ctx, normal, spaces, spots, seen);
    } else if (normal instanceof PDFDict) {
      for (const [, stateRef] of normal.entries()) {
        if (stateRef instanceof PDFRef) {
          const key = stateRef.toString();
          if (seen.has(key)) continue;
          seen.add(key);
        }
        collectFromAppearanceStream(ctx, resolveObject(ctx, stateRef), spaces, spots, seen);
      }
    }
  }
}

function getPageAnnots(page: PDFPage): PDFArray | null {
  try {
    return page.node.Annots() ?? null;
  } catch {
    return null;
  }
}

export function buildVerdict(docSpaces: string[]): string {
  const hasRgb = docSpaces.includes('RGB');
  const hasCmyk = docSpaces.includes('CMYK');
  const hasSpot = docSpaces.includes('SPOT COLOR');
  const hasLab = docSpaces.includes('LAB');
  if (hasRgb && hasCmyk) return 'This PDF mixes RGB and CMYK';
  if (hasRgb && hasSpot) return 'This PDF uses RGB and spot colors';
  if (hasCmyk && hasSpot) return 'This PDF uses CMYK and spot colors';
  if (hasRgb) return 'This PDF uses RGB color spaces';
  if (hasCmyk) return 'This PDF uses CMYK color spaces';
  if (hasSpot) return 'This PDF uses spot colors';
  if (hasLab) return 'This PDF uses Lab color spaces';
  if (docSpaces.includes('GRAYSCALE')) return 'This PDF uses grayscale only';
  return 'No standard color spaces detected in document resources';
}

export function scanPageColorSpaces(
  ctx: PdfContext,
  page: PDFPage,
): { spaces: Set<string>; spots: Set<string> } {
  const spaces = new Set<string>();
  const spots = new Set<string>();
  try {
    const seen = new Set<string>();
    const res = getPageResources(ctx, page);
    if (res instanceof PDFDict) {
      collectFromResources(ctx, res, spaces, spots, seen);
    }
    const annots = getPageAnnots(page);
    if (annots instanceof PDFArray) {
      collectFromAnnots(ctx, annots, spaces, spots, seen);
    }
  } catch (e) {
    console.warn('Color profile: page resources parse failed', e);
  }
  return { spaces, spots };
}

export { pdfStringValue, pdfDictNumber, resolveObject };
