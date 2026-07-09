export interface InkcovLine {
  c: number;
  m: number;
  y: number;
  k: number;
  pageLabel: string;
}

export interface Pdf2PngOptions {
  renderDelayMs?: number;
  workerSrc?: string;
  useNodeCanvas?: boolean;
}

export interface CmykDisplay {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface RgbSample {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ImagePixelHit {
  pixelX: number;
  pixelY: number;
  localX: number;
  localY: number;
  renderWidth: number;
  renderHeight: number;
  rect: DOMRect;
}

export interface ColorPick {
  hex: string;
  r: number;
  g: number;
  b: number;
  c: number;
  m: number;
  y: number;
  k: number;
  pageIndex: number;
  pageNumber: number;
  pixelX: number;
  pixelY: number;
}
