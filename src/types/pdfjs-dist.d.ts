declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: {
    workerSrc: string;
    workerPort: Worker | null;
  };

  export class PDFWorker {
    constructor(params?: { name?: string | null; port?: Worker | null; verbosity?: number });
    destroy(): void;
  }

  export function getDocument(src: unknown): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getViewport(opts: { scale: number }): {
          width: number;
          height: number;
          rotation: number;
          viewBox: number[];
        };
        render(ctx: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): {
          promise: Promise<void>;
        };
        cleanup: () => void;
      }>;
      destroy(): Promise<void>;
    }>;
  };
}
