/**
 * Worker-safe pdf.js renderer using OffscreenCanvas factories.
 * Not an extension of pdf2png — DOM canvas factories break in Workers.
 */

export interface RenderedPage {
  width: number;
  height: number;
  pageWidthPt: number;
  pageHeightPt: number;
  imageData: ImageData;
}

export interface RenderPagesOptions {
  dpi: number;
  maxPixelVolume?: number;
  onPage?: (index: number, total: number) => void;
  signal?: { cancelled: () => boolean };
}

export type EcoPdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => { width: number; height: number };
    render: (ctx: {
      canvasContext: CanvasRenderingContext2D;
      viewport: unknown;
    }) => { promise: Promise<void> };
    cleanup: () => void;
  }>;
  destroy: () => Promise<void>;
};

const DEFAULT_MAX_PIXELS = 80_000_000;

class OffscreenCanvasFactory {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
    return {
      canvas,
      context: canvas.getContext('2d') as OffscreenCanvasRenderingContext2D,
    };
  }
  reset(canvasAndContext: { canvas: OffscreenCanvas }, width: number, height: number) {
    canvasAndContext.canvas.width = Math.max(1, width);
    canvasAndContext.canvas.height = Math.max(1, height);
  }
  destroy(canvasAndContext: { canvas: OffscreenCanvas }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

/** No-op filter factory matching pdf.js BaseFilterFactory (needed on document destroy). */
class WorkerFilterFactory {
  addFilter() {
    return 'none';
  }
  addHCMFilter() {
    return 'none';
  }
  addHighlightHCMFilter() {
    return 'none';
  }
  destroy(_keepHCM = false) {
    /* no SVG filters to clear in workers */
  }
}

/** Minimal Document stand-in so FontLoader works off the main thread. */
function workerOwnerDocument(): Document {
  const fonts = (globalThis as unknown as { fonts?: FontFaceSet }).fonts;
  return {
    fonts,
    baseURI: self.location?.href ?? '',
    createElement(name: string) {
      if (name === 'canvas') {
        return new OffscreenCanvas(1, 1) as unknown as HTMLElement;
      }
      return {
        style: {},
        sheet: { insertRule() {}, cssRules: [] },
        setAttribute() {},
        appendChild() {},
        remove() {},
      } as unknown as HTMLElement;
    },
    documentElement: { style: {} },
    head: { appendChild() {}, removeChild() {} },
    body: {},
  } as unknown as Document;
}

function absoluteWorkerSrc(): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  try {
    return new URL(`${normalized}js/pdf.worker.min.js`, self.location.origin).href;
  } catch {
    return `${normalized}js/pdf.worker.min.js`;
  }
}

/**
 * Nested classic pdf.js worker per document. Do not import pdf.worker.js into
 * this module worker (UMD bootstrap would steal onmessage). Do not reuse a
 * shared workerPort — document.destroy() Terminates that worker and the next
 * open fails. pdf.js 3.11 ignores disableWorker; fake-worker needs document.
 */
export async function openPdfDocument(data: Uint8Array | ArrayBuffer): Promise<EcoPdfDocument> {
  const pdfjs = await import('pdfjs-dist/build/pdf');
  const src = absoluteWorkerSrc();
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = src;
  }
  // Fresh nested worker for this document only.
  const port = new Worker(src);
  const worker = new pdfjs.PDFWorker({ port });
  // pdf.js takes ownership of `data` and may detach the ArrayBuffer — always copy
  // so CACHE_FILE / afterBytes buffers stay valid for re-optimize and re-preview.
  const source = data instanceof Uint8Array ? data : new Uint8Array(data);
  const bytes = source.slice();
  try {
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      worker,
      ownerDocument: workerOwnerDocument(),
      canvasFactory: new OffscreenCanvasFactory(),
      filterFactory: new WorkerFilterFactory(),
      useWorkerFetch: false,
      isEvalSupported: false,
      isOffscreenCanvasSupported: true,
    });
    const doc = await loadingTask.promise;
    return {
      get numPages() {
        return doc.numPages;
      },
      getPage: (n) => doc.getPage(n),
      async destroy() {
        try {
          await doc.destroy();
        } finally {
          try {
            port.terminate();
          } catch {
            /* ignore */
          }
        }
      },
    };
  } catch (err) {
    try {
      worker.destroy();
    } catch {
      /* ignore */
    }
    try {
      port.terminate();
    } catch {
      /* ignore */
    }
    throw err;
  }
}

export async function renderPdfPages(
  data: Uint8Array | ArrayBuffer,
  opts: RenderPagesOptions,
): Promise<RenderedPage[]> {
  const dpi = opts.dpi;
  const maxPixels = opts.maxPixelVolume ?? DEFAULT_MAX_PIXELS;
  const doc = await openPdfDocument(data);
  try {
    const scale = dpi / 72;
    let volume = 0;
    const pages: RenderedPage[] = [];
    const total = doc.numPages;

    for (let i = 1; i <= total; i++) {
      if (opts.signal?.cancelled()) throw new Error('cancelled');
      opts.onPage?.(i, total);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const w = Math.ceil(viewport.width);
      const h = Math.ceil(viewport.height);
      volume += w * h;
      if (volume > maxPixels) {
        throw new Error(
          `Document too large to flatten at ${dpi} dpi (pixel volume cap exceeded). Try a lower DPI.`,
        );
      }

      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      const imageData = ctx.getImageData(0, 0, w, h);
      for (let p = 3; p < imageData.data.length; p += 4) imageData.data[p] = 255;

      const base = page.getViewport({ scale: 1 });
      pages.push({
        width: w,
        height: h,
        pageWidthPt: base.width,
        pageHeightPt: base.height,
        imageData,
      });
      page.cleanup();
    }
    return pages;
  } finally {
    await doc.destroy();
  }
}

export async function renderPageRaster(
  doc: EcoPdfDocument,
  pageNumber: number,
  dpi: number,
): Promise<RenderedPage> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: dpi / 72 });
  const w = Math.ceil(viewport.width);
  const h = Math.ceil(viewport.height);
  const maxPixels = DEFAULT_MAX_PIXELS;
  if (w * h > maxPixels) {
    throw new Error(
      `Page ${pageNumber} too large to flatten at ${dpi} dpi (pixel volume cap exceeded). Try a lower DPI.`,
    );
  }
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  const imageData = ctx.getImageData(0, 0, w, h);
  for (let p = 3; p < imageData.data.length; p += 4) imageData.data[p] = 255;
  const base = page.getViewport({ scale: 1 });
  page.cleanup();
  return {
    width: w,
    height: h,
    pageWidthPt: base.width,
    pageHeightPt: base.height,
    imageData,
  };
}

export async function renderSinglePage(
  doc: EcoPdfDocument,
  pageNumber: number,
  dpi: number,
): Promise<Blob> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: dpi / 72 });
  const w = Math.ceil(viewport.width);
  const h = Math.ceil(viewport.height);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  page.cleanup();
  return canvas.convertToBlob({ type: 'image/png' });
}
