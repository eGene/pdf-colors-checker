import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFDict,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';
import type { ColorProfileResult } from '@/types/profile';
import { componentsToSpace, readIccDescription } from './iccDescription';
import {
  buildVerdict,
  pdfDictNumber,
  pdfStringValue,
  resolveObject,
  scanPageColorSpaces,
} from './pdfColorSpaceScan';

export async function analyzeColorProfile(arrayBuffer: ArrayBuffer): Promise<ColorProfileResult> {
  const doc = await PDFDocument.load(arrayBuffer, {
    updateMetadata: false,
    throwOnInvalidObject: false,
  });
  const ctx = doc.context;

  let icc = null;
  let outputIntentLabel = null;

  try {
    const catalog = ctx.lookup(ctx.trailerInfo.Root, PDFDict);
    const outputIntents = catalog?.lookupMaybe(PDFName.of('OutputIntents'), PDFArray);
    if (outputIntents && outputIntents.size() > 0) {
      const oi = outputIntents.lookup(0, PDFDict);
      const ident = pdfStringValue(oi?.lookup(PDFName.of('OutputConditionIdentifier')));
      const registry = pdfStringValue(oi?.lookup(PDFName.of('RegistryName')));
      outputIntentLabel = ident || registry || null;

      const destResolved = resolveObject(ctx, oi?.lookup(PDFName.of('DestOutputProfile')));
      if (destResolved instanceof PDFRawStream) {
        const dest = destResolved;
        const bytes = decodePDFRawStream(dest).decode();
        const n = pdfDictNumber(dest.dict, 'N');
        const desc = readIccDescription(bytes) || outputIntentLabel || 'ICC output intent profile';
        icc = {
          name: desc,
          colorSpace: componentsToSpace(n) ?? 'CMYK',
          deviceClass: 'Output',
          outputIntent: outputIntentLabel,
        };
      }
    }
  } catch (e) {
    console.warn('OutputIntent parse failed', e);
  }

  const pages = doc.getPages();
  const pageData = pages.map((page) => scanPageColorSpaces(ctx, page));

  const docSpacesSet = new Set<string>();
  const spotPageCounts = new Map<string, number>();
  for (const { spaces, spots } of pageData) {
    for (const s of spaces) docSpacesSet.add(s);
    for (const spot of spots) {
      spotPageCounts.set(spot, (spotPageCounts.get(spot) ?? 0) + 1);
    }
  }

  const docHasCmyk = docSpacesSet.has('CMYK');

  const perPage = pageData.map(({ spaces, spots }, i) => {
    const colorSpaces = [...spaces];
    const spotColors = [...spots];
    const usesRgb = colorSpaces.includes('RGB');
    const flag: 'RGB' | 'OK' = usesRgb && docHasCmyk ? 'RGB' : 'OK';

    return {
      pageNumber: i + 1,
      colorSpaces,
      spotColors,
      flag,
    };
  });

  const documentColorSpaces = [...docSpacesSet].sort();
  const spotColors = [...spotPageCounts.entries()]
    .map(([name, pageCount]) => ({ name, pageCount }))
    .sort((a, b) => b.pageCount - a.pageCount);

  const uniqueSpaceKinds = new Set(
    documentColorSpaces.filter((s) => s !== 'SPOT COLOR'),
  );

  return {
    verdict: buildVerdict(documentColorSpaces),
    documentColorSpaces,
    stats: {
      totalPages: pages.length,
      colorSpaceCount: uniqueSpaceKinds.size,
      spotColorCount: spotColors.length,
    },
    icc,
    spotColors,
    perPage,
    note: 'Based on PDF object structure (Resources), not pixel appearance.',
  };
}
