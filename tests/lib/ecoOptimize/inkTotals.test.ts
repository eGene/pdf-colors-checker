import { describe, expect, it } from 'vitest';
import { aggregateInkPlates } from '@/lib/ecoOptimize/inkTotals';

describe('aggregateInkPlates', () => {
  it('area-weights colour and black', () => {
    const totals = aggregateInkPlates(
      [
        { page: 1, c: 50, m: 0, y: 0, k: 10 },
        { page: 2, c: 0, m: 0, y: 0, k: 50 },
      ],
      [100, 300],
    );
    // color: (0.5*100 + 0*300)/400 = 0.125 → 12.5%
    expect(totals.color).toBe(12.5);
    // black: (0.1*100 + 0.5*300)/400 = 0.4 → 40%
    expect(totals.black).toBe(40);
  });
});
