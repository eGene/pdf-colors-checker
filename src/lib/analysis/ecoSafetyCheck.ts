import { PDFArray, PDFDocument, PDFDict, PDFName, PDFNumber, PDFRef } from 'pdf-lib';
import type { DocumentSafety } from '@/types/ecoOptimize';

export async function checkDocumentSafety(pdfBytes: ArrayBuffer | Uint8Array): Promise<DocumentSafety> {
  try {
    const doc = await PDFDocument.load(pdfBytes, {
      updateMetadata: false,
      ignoreEncryption: false,
    });

    const pageAreas: number[] = [];
    const pageCount = doc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const page = doc.getPage(i);
      const { width, height } = page.getSize();
      pageAreas.push(width * height);
    }

    let hasAcroForm = false;
    let hasSignature = false;

    const catalog = doc.catalog;
    const acroFormRef = catalog.get(PDFName.of('AcroForm'));
    if (acroFormRef) {
      hasAcroForm = true;
      const acroForm =
        acroFormRef instanceof PDFRef ? doc.context.lookup(acroFormRef) : acroFormRef;
      if (acroForm instanceof PDFDict) {
        const sigFlags = acroForm.get(PDFName.of('SigFlags'));
        if (sigFlags instanceof PDFNumber && (sigFlags.asNumber() & 1) !== 0) {
          hasSignature = true;
        }
        const fields = acroForm.get(PDFName.of('Fields'));
        if (fields && !hasSignature) {
          hasSignature = fieldTreeHasSignature(doc, fields);
        }
      }
    }

    if (!hasSignature) {
      for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
        if (!(obj instanceof PDFDict)) continue;
        const ft = obj.get(PDFName.of('FT'));
        if (ft instanceof PDFName && ft.decodeText() === 'Sig') {
          hasSignature = true;
          break;
        }
        void ref;
      }
    }

    return { hasAcroForm, hasSignature, pageAreas };
  } catch (err) {
    const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
    const message = err instanceof Error ? err.message : String(err);
    if (
      name === 'EncryptedPDFError' ||
      /encrypt|password/i.test(message) ||
      /EncryptedPDFError/i.test(message)
    ) {
      return {
        hasAcroForm: false,
        hasSignature: false,
        pageAreas: [],
        encrypted: true,
        error: "This PDF is password-protected — encrypted PDFs aren't supported yet",
      };
    }
    return {
      hasAcroForm: false,
      hasSignature: false,
      pageAreas: [],
      error: 'Could not inspect this PDF for forms or signatures.',
    };
  }
}

function fieldTreeHasSignature(doc: PDFDocument, root: unknown): boolean {
  const queue: unknown[] = [root];
  const seen = new Set<string>();

  while (queue.length) {
    const node = queue.shift();
    if (node instanceof PDFRef) {
      if (seen.has(node.tag)) continue;
      seen.add(node.tag);
      queue.push(doc.context.lookup(node));
      continue;
    }
    if (node instanceof PDFArray) {
      for (const item of node.asArray()) queue.push(item);
      continue;
    }
    if (!(node instanceof PDFDict)) continue;

    const ft = node.get(PDFName.of('FT'));
    if (ft instanceof PDFName && ft.decodeText() === 'Sig') return true;

    const kids = node.get(PDFName.of('Kids'));
    if (kids) queue.push(kids);
  }
  return false;
}
