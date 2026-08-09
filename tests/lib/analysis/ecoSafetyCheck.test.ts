import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import { checkDocumentSafety } from '@/lib/analysis/ecoSafetyCheck';

describe('checkDocumentSafety', () => {
  it('reports no form/signature on a plain PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    const safety = await checkDocumentSafety(bytes);
    expect(safety.hasAcroForm).toBe(false);
    expect(safety.hasSignature).toBe(false);
    expect(safety.pageAreas.length).toBe(1);
  });

  it('detects AcroForm on the catalog', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const form = doc.getForm();
    form.createTextField('name');
    const bytes = await doc.save();
    const safety = await checkDocumentSafety(bytes);
    expect(safety.hasAcroForm).toBe(true);
    void PDFName;
  });
});
