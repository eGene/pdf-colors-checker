import { describe, expect, it } from 'vitest';
import { formatInkPercent, inkBarWidthPercent } from '../../src/lib/cmykInkDisplay';

describe('cmykInkDisplay', () => {
  describe('formatInkPercent', () => {
    it('formats zero', () => {
      expect(formatInkPercent(0)).toBe('0%');
    });

    it('formats tiny non-zero as less than 0.01%', () => {
      expect(formatInkPercent(0.005)).toBe('<0.01%');
    });

    it('formats sub-1% with two decimals', () => {
      expect(formatInkPercent(0.12)).toBe('0.12%');
    });

    it('formats 1–10% with one decimal', () => {
      expect(formatInkPercent(5.55)).toBe('5.5%');
    });

    it('formats 10%+ as whole numbers', () => {
      expect(formatInkPercent(42.3)).toBe('42%');
    });
  });

  describe('inkBarWidthPercent', () => {
    it('returns zero for zero ink', () => {
      expect(inkBarWidthPercent(0)).toBe(0);
    });

    it('enforces minimum visible bar for tiny values', () => {
      expect(inkBarWidthPercent(0.5)).toBe(2);
    });

    it('caps at 100', () => {
      expect(inkBarWidthPercent(150)).toBe(100);
    });
  });
});
