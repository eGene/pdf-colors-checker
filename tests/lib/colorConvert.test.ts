import { describe, expect, it } from 'vitest';
import {
  clampByte,
  createImageSampler,
  imagePixelFromPointer,
  rgbToCmyk,
  rgbToHex,
} from '../../src/lib/colorConvert';

describe('colorConvert', () => {
  describe('clampByte', () => {
    it('clamps to 0–255', () => {
      expect(clampByte(-10)).toBe(0);
      expect(clampByte(300)).toBe(255);
      expect(clampByte(128.4)).toBe(128);
    });
  });

  describe('rgbToHex', () => {
    it('formats uppercase hex', () => {
      expect(rgbToHex(255, 0, 128)).toBe('#FF0080');
    });
  });

  describe('rgbToCmyk', () => {
    it('returns pure black as K-only', () => {
      expect(rgbToCmyk(0, 0, 0)).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    });

    it('returns saturated red with no K', () => {
      const cmyk = rgbToCmyk(255, 0, 0);
      expect(cmyk.k).toBe(0);
      expect(cmyk.c).toBe(0);
      expect(cmyk.m).toBe(100);
      expect(cmyk.y).toBe(100);
    });
  });

  describe('createImageSampler', () => {
    it('returns null when image has no dimensions', () => {
      const img = { naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement;
      expect(createImageSampler(img)).toBeNull();
    });
  });

  describe('imagePixelFromPointer', () => {
    function mockImg({
      naturalWidth,
      naturalHeight,
      rect,
    }: {
      naturalWidth: number;
      naturalHeight: number;
      rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
    }) {
      return {
        naturalWidth,
        naturalHeight,
        getBoundingClientRect: () => rect,
      };
    }

    it('returns null when image has no dimensions', () => {
      expect(
        imagePixelFromPointer(
          { naturalWidth: 0, naturalHeight: 0, getBoundingClientRect: () => new DOMRect() },
          10,
          10,
        ),
      ).toBeNull();
    });

    it('maps pointer in letterboxed wide image', () => {
      const img = mockImg({
        naturalWidth: 200,
        naturalHeight: 100,
        rect: { left: 0, top: 0, width: 200, height: 200 },
      });
      const pt = imagePixelFromPointer(img as HTMLImageElement, 100, 100)!;
      expect(pt.pixelX).toBeGreaterThanOrEqual(0);
      expect(pt.pixelY).toBeGreaterThanOrEqual(0);
    });

    it('returns null for clicks in letterbox padding', () => {
      const img = mockImg({
        naturalWidth: 200,
        naturalHeight: 100,
        rect: { left: 0, top: 0, width: 200, height: 200 },
      });
      expect(imagePixelFromPointer(img as HTMLImageElement, 100, 5)).toBeNull();
    });

    it('maps pointer in pillarboxed tall image', () => {
      const img = mockImg({
        naturalWidth: 100,
        naturalHeight: 200,
        rect: { left: 0, top: 0, width: 200, height: 200 },
      });
      const pt = imagePixelFromPointer(img as HTMLImageElement, 100, 100)!;
      expect(pt.pixelX).toBe(50);
    });
  });
});
