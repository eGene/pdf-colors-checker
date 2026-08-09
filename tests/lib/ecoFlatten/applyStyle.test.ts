import { describe, expect, it } from 'vitest';
import {
  applySoftLighten,
  applyThreshold,
  pack1BitDeviceGray,
} from '@/lib/ecoFlatten/applyStyle';

function rgba(w: number, h: number, fill: [number, number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return data;
}

describe('applyStyle', () => {
  it('soft lighten moves pixels toward white', () => {
    const data = rgba(2, 2, [0, 0, 0, 255]);
    applySoftLighten(data, 0.5, true);
    expect(data[0]).toBeGreaterThan(0);
    expect(data[0]).toBeLessThan(255);
  });

  it('threshold produces bilevel luminance', () => {
    const data = rgba(2, 1, [200, 200, 200, 255]);
    data[4] = data[5] = data[6] = 10;
    applyThreshold(data, 0.5);
    expect(data[0]).toBe(255);
    expect(data[4]).toBe(0);
  });

  it('packs 1-bit DeviceGray with bit 1 = white', () => {
    // 8 black pixels → all bits 0
    const black = rgba(8, 1, [0, 0, 0, 255]);
    expect(pack1BitDeviceGray(black, 8, 1)).toEqual(new Uint8Array([0x00]));

    // 8 white pixels → all bits 1
    const white = rgba(8, 1, [255, 255, 255, 255]);
    expect(pack1BitDeviceGray(white, 8, 1)).toEqual(new Uint8Array([0xff]));

    // first pixel white, rest black → MSB set
    const mixed = rgba(8, 1, [0, 0, 0, 255]);
    mixed[0] = mixed[1] = mixed[2] = 255;
    expect(pack1BitDeviceGray(mixed, 8, 1)[0]).toBe(0x80);
  });
});
