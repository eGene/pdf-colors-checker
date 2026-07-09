import type { Pdf2PngOptions } from '../types/pdf';

interface RenderCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): CanvasRenderingContext2D | null;
  toDataURL(type: string): string;
}

async function createRenderCanvas(
  width: number,
  height: number,
  options: Pdf2PngOptions,
): Promise<RenderCanvas> {
  if (options.useNodeCanvas) {
    const { createCanvas } = await import('canvas');
    return createCanvas(width, height) as unknown as RenderCanvas;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function pdf2png(
  src: string | ArrayBuffer | Uint8Array,
  options: Pdf2PngOptions = {},
): Promise<string[]> {
  const renderDelayMs = options.renderDelayMs ?? 0;
  const pdfJS = await import('pdfjs-dist/build/pdf');
  const promises: Promise<string>[] = [];

  pdfJS.GlobalWorkerOptions.workerSrc =
    options.workerSrc ?? 'js/pdf.worker.min.js';

  const pdf = await pdfJS.getDocument(src).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 1;
    const viewport = page.getViewport({ scale });
    const width = [90, 270].includes(viewport.rotation)
      ? viewport.viewBox[3]
      : viewport.viewBox[2];
    const height = [90, 270].includes(viewport.rotation)
      ? viewport.viewBox[2]
      : viewport.viewBox[3];
    const canvas = await createRenderCanvas(width, height, options);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    const renderContext = { canvasContext: ctx, viewport };

    await page.render(renderContext).promise;

    promises.push(
      new Promise((resolve) => {
        setTimeout(() => resolve(canvas.toDataURL('image/png')), renderDelayMs);
      }),
    );
  }

  return Promise.all(promises);
}
