import type { CmykDisplay, ImagePixelHit, RgbSample } from '../types/pdf';

export function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const hr = clampByte(r).toString(16).padStart(2, '0');
  const hg = clampByte(g).toString(16).padStart(2, '0');
  const hb = clampByte(b).toString(16).padStart(2, '0');
  return `#${hr}${hg}${hb}`.toUpperCase();
}

/** Approximate RGB (0–255) → CMYK ink % for on-screen display. */
export function rgbToCmyk(r: number, g: number, b: number): CmykDisplay {
  const rn = clampByte(r) / 255;
  const gn = clampByte(g) / 255;
  const bn = clampByte(b) / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = ((1 - rn - k) / (1 - k)) * 100;
  const m = ((1 - gn - k) / (1 - k)) * 100;
  const y = ((1 - bn - k) / (1 - k)) * 100;
  return {
    c: Math.round(c),
    m: Math.round(m),
    y: Math.round(y),
    k: Math.round(k * 100),
  };
}

/** Map a click on an object-contain <img> to natural pixel coordinates. */
export function imagePixelFromPointer(
  img: Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight' | 'getBoundingClientRect'>,
  clientX: number,
  clientY: number,
): ImagePixelHit | null {
  if (!img?.naturalWidth || !img.naturalHeight) return null;

  const rect = img.getBoundingClientRect();
  const imageAspect = img.naturalWidth / img.naturalHeight;
  const containerAspect = rect.width / rect.height;

  let renderWidth: number;
  let renderHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (imageAspect > containerAspect) {
    renderWidth = rect.width;
    renderHeight = rect.width / imageAspect;
    offsetX = 0;
    offsetY = (rect.height - renderHeight) / 2;
  } else {
    renderHeight = rect.height;
    renderWidth = rect.height * imageAspect;
    offsetX = (rect.width - renderWidth) / 2;
    offsetY = 0;
  }

  const localX = clientX - rect.left - offsetX;
  const localY = clientY - rect.top - offsetY;

  if (localX < 0 || localY < 0 || localX > renderWidth || localY > renderHeight) {
    return null;
  }

  const pixelX = Math.min(
    img.naturalWidth - 1,
    Math.floor((localX / renderWidth) * img.naturalWidth),
  );
  const pixelY = Math.min(
    img.naturalHeight - 1,
    Math.floor((localY / renderHeight) * img.naturalHeight),
  );

  return { pixelX, pixelY, localX, localY, renderWidth, renderHeight, rect };
}

export const LOUPE_CANVAS_PX = 150;
export const LOUPE_DISPLAY_PX = 150;
export const LOUPE_ZOOM = 4;
export const LOUPE_BORDER_WIDTH = 8;

export function drawMagnifierLens(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  pixelX: number,
  pixelY: number,
  borderColor: string,
  zoom: number = LOUPE_ZOOM,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !img.naturalWidth || !img.naturalHeight) return;

  const lens = canvas.width;
  const borderWidth = LOUPE_BORDER_WIDTH;
  const radius = lens / 2 - borderWidth / 2;
  const cx = lens / 2;
  const cy = lens / 2;
  const srcSize = lens / zoom;
  const srcX = Math.max(0, Math.min(img.naturalWidth - srcSize, pixelX - srcSize / 2));
  const srcY = Math.max(0, Math.min(img.naturalHeight - srcSize, pixelY - srcSize / 2));
  const srcW = Math.min(srcSize, img.naturalWidth - srcX);
  const srcH = Math.min(srcSize, img.naturalHeight - srcY);

  ctx.clearRect(0, 0, lens, lens);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, lens, lens);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor || '#adc6ff';
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  const arm = 18;
  const gap = 2;

  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy);
  ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);
  ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap);
  ctx.lineTo(cx, cy + arm);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - arm + 1, cy);
  ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);
  ctx.lineTo(cx + arm - 1, cy);
  ctx.moveTo(cx, cy - arm + 1);
  ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap);
  ctx.lineTo(cx, cy + arm - 1);
  ctx.stroke();

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(cx, cy, radius + borderWidth / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export interface ImageSampler {
  sample(pixelX: number, pixelY: number): RgbSample | null;
}

export function createImageSampler(img: HTMLImageElement): ImageSampler | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width } = imageData;

  return {
    sample(pixelX: number, pixelY: number): RgbSample | null {
      const x = Math.max(0, Math.min(width - 1, pixelX));
      const y = Math.max(0, Math.min(imageData.height - 1, pixelY));
      const i = (y * width + x) * 4;
      return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    },
  };
}

/** @deprecated Prefer createImageSampler for repeated sampling */
export function sampleRgbFromImage(
  img: HTMLImageElement,
  pixelX: number,
  pixelY: number,
): RgbSample | null {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(pixelX, pixelY, 1, 1).data;
  return { r: data[0], g: data[1], b: data[2], a: data[3] };
}
