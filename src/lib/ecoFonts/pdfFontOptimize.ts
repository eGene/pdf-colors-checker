/**
 * Trimmed PDF-embedded-font surgeon path from ecofonts/ecofonts.github.io (MIT).
 * Drops Local Font Access / TTC / bare-descriptor embedding.
 */
import {
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
} from 'pdf-lib';
import { ecoProcessFontFile3 } from './cff';
import { ecoProcessTrueType } from './glyf';
import { ecoProcessType1 } from './type1';

export interface PdfFontOptimizeProgress {
  fileName: string;
  fileIndex: number;
  fileCount: number;
  glyphsDone: number;
  glyphsTotal: number;
}

export type PdfFontOptimizeProgressCallback = (info: PdfFontOptimizeProgress) => void;

export interface PdfFontOptimizeOutput {
  data: ArrayBuffer;
  processedFonts: string[];
  warnings: string[];
  empty: boolean;
}

type FontKind = 'truetype' | 'fontfile3' | 'type1';

export async function optimizePdfEmbeddedFonts(
  data: ArrayBuffer,
  intensity: number,
  onProgress?: PdfFontOptimizeProgressCallback,
): Promise<PdfFontOptimizeOutput> {
  const doc = await PDFDocument.load(data, { updateMetadata: false });

  const targets: { ref: PDFRef; name: string; kind: FontKind }[] = [];
  const seenRefs = new Set<string>();
  let bareDescriptorCount = 0;

  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const type = obj.get(PDFName.of('Type'));
    if (type instanceof PDFName && type.decodeText() === 'Font') continue;

    const candidates: [string, FontKind][] = [
      ['FontFile2', 'truetype'],
      ['FontFile3', 'fontfile3'],
      ['FontFile', 'type1'],
    ];
    let found = false;
    for (const [key, kind] of candidates) {
      const fileRef = obj.get(PDFName.of(key));
      if (fileRef instanceof PDFRef) {
        found = true;
        if (!seenRefs.has(fileRef.tag)) {
          seenRefs.add(fileRef.tag);
          targets.push({ ref: fileRef, name: descriptorFontName(obj), kind });
        }
        break;
      }
    }
    if (!found && type instanceof PDFName && type.decodeText() === 'FontDescriptor') {
      bareDescriptorCount += 1;
    }
  }

  if (targets.length === 0) {
    return {
      data,
      processedFonts: [],
      warnings: [
        bareDescriptorCount > 0
          ? 'No embedded fonts found — fonts are referenced by name only and cannot be optimized'
          : 'No embedded fonts found — nothing to optimize for text in this document',
      ],
      empty: true,
    };
  }

  const processedFonts: string[] = [];
  const warnings: string[] = [];
  const fileCount = targets.length;

  for (let i = 0; i < targets.length; i++) {
    const { ref, name, kind } = targets[i];
    try {
      const stream = doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) {
        throw new Error('font stream has an unexpected object type');
      }
      const subtype = stream.dict.get(PDFName.of('Subtype'));
      const fontBytes = decodePDFRawStream(stream).decode();
      const report = (done: number, total: number) =>
        onProgress?.({
          fileName: name,
          fileIndex: i + 1,
          fileCount,
          glyphsDone: done,
          glyphsTotal: total,
        });

      let buffer: ArrayBuffer;
      let type1Lengths: { length1: number; length2: number; length3: number } | null = null;
      if (kind === 'truetype') {
        buffer = (await ecoProcessTrueType(fontBytes, intensity, report)).buffer;
      } else if (kind === 'type1') {
        const result = await ecoProcessType1(fontBytes, intensity, report);
        buffer = result.buffer;
        type1Lengths = result;
      } else {
        buffer = await ecoProcessFontFile3(fontBytes, intensity, report);
      }

      const newBytes = new Uint8Array(buffer);
      const newStream = doc.context.flateStream(newBytes);
      if (kind === 'truetype') {
        newStream.dict.set(PDFName.of('Length1'), PDFNumber.of(newBytes.length));
      } else if (kind === 'type1' && type1Lengths) {
        newStream.dict.set(PDFName.of('Length1'), PDFNumber.of(type1Lengths.length1));
        newStream.dict.set(PDFName.of('Length2'), PDFNumber.of(type1Lengths.length2));
        newStream.dict.set(PDFName.of('Length3'), PDFNumber.of(type1Lengths.length3));
      } else if (subtype instanceof PDFName) {
        newStream.dict.set(PDFName.of('Subtype'), subtype);
      }
      doc.context.assign(ref, newStream);
      processedFonts.push(name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warnings.push(`${name}: ${message} — kept as-is`);
    }
  }

  if (processedFonts.length === 0) {
    return {
      data,
      processedFonts: [],
      warnings:
        warnings.length > 0
          ? warnings
          : ['No embedded fonts could be processed'],
      empty: true,
    };
  }

  const saved = await doc.save({ useObjectStreams: false });
  const out = new Uint8Array(saved.byteLength);
  out.set(saved);
  return {
    data: out.buffer,
    processedFonts,
    warnings,
    empty: false,
  };
}

function descriptorFontName(descriptor: PDFDict): string {
  const name = descriptor.get(PDFName.of('FontName'));
  if (name instanceof PDFName) return name.decodeText();
  return 'embedded font';
}
