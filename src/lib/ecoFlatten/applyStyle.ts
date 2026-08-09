/** Pixel transforms for flatten Save Ink styles. Operate on RGBA ImageData buffers. */

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function applySoftLighten(
  data: Uint8ClampedArray,
  strength: number,
  toGray: boolean,
): void {
  const s = Math.max(0, Math.min(1, strength));
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    if (toGray) {
      const y = luminance(r, g, b);
      r = g = b = y;
    }
    data[i] = Math.round(r + (255 - r) * s);
    data[i + 1] = Math.round(g + (255 - g) * s);
    data[i + 2] = Math.round(b + (255 - b) * s);
    data[i + 3] = 255;
  }
}

export function applyThreshold(data: Uint8ClampedArray, threshold: number): void {
  const t = Math.max(0, Math.min(1, threshold)) * 255;
  for (let i = 0; i < data.length; i += 4) {
    const y = luminance(data[i], data[i + 1], data[i + 2]);
    const v = y >= t ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }
}

/** Sobel outline: keep edge pixels dark, wash the rest. */
export function applyOutline(data: Uint8ClampedArray, width: number, height: number): void {
  const src = new Uint8ClampedArray(data);
  const gray = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      gray[y * width + x] = luminance(src[i], src[i + 1], src[i + 2]);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = 255;
        continue;
      }
      const tl = gray[(y - 1) * width + (x - 1)];
      const tc = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const ml = gray[y * width + (x - 1)];
      const mr = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const bc = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];
      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.hypot(gx, gy);
      const v = mag > 40 ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
}

/** Pack bilevel RGBA into 1-bpc DeviceGray (MSB-first; bit 1 = white). */
export function pack1BitDeviceGray(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const rowBytes = Math.ceil(width / 8);
  const out = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // White (or light) → set bit; black stays 0.
      if (data[i] >= 128) {
        out[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return out;
}

export function pack8BitDeviceGray(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    out[p] = data[i];
  }
  return out;
}
