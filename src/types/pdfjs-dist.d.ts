declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: string | ArrayBuffer | Uint8Array): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getViewport(opts: { scale: number }): {
          rotation: number;
          viewBox: number[];
        };
        render(ctx: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): {
          promise: Promise<void>;
        };
      }>;
    }>;
  };
}
