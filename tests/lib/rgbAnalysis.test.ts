import { describe, expect, it, vi } from 'vitest';

const prominentMock = vi.fn();

vi.mock('color.js', () => ({
  prominent: (...args: unknown[]) => prominentMock(...args),
}));

import { classifyPageFromDataUrl, isBwFromProminentColors } from '@/lib/analysis/rgbAnalysis';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('rgbAnalysis', () => {
  describe('isBwFromProminentColors', () => {
    it('returns true for pure gray colors', () => {
      expect(isBwFromProminentColors([[128, 128, 128]], 0.01)).toBe(true);
    });

    it('returns false when red deviates beyond threshold', () => {
      expect(isBwFromProminentColors([[200, 128, 128]], 0.01)).toBe(false);
    });

    it('respects threshold boundary', () => {
      const colors = [[150, 128, 128]];
      expect(isBwFromProminentColors(colors, 0.2)).toBe(true);
      expect(isBwFromProminentColors(colors, 0.01)).toBe(false);
    });
  });

  describe('classifyPageFromDataUrl', () => {
    it('classifies gray prominent colors as bw', async () => {
      prominentMock.mockResolvedValue([[128, 128, 128]]);
      await expect(classifyPageFromDataUrl(TINY_PNG, 0.01)).resolves.toBe('bw');
    });

    it('classifies chromatic prominent colors as color', async () => {
      prominentMock.mockResolvedValue([[255, 0, 0]]);
      await expect(classifyPageFromDataUrl(TINY_PNG, 0.01)).resolves.toBe('color');
    });
  });
});
