import { describe, expect, it } from 'vitest';
import { parseInkcovLine } from '../../src/lib/inkcovParse';

describe('parseInkcovLine', () => {
  it('parses a valid inkcov line', () => {
    const row = parseInkcovLine('0.250000  0.000000  0.000000  0.500000 CMYK 1');
    expect(row).toEqual({
      c: 25,
      m: 0,
      y: 0,
      k: 50,
      pageLabel: '1',
    });
  });

  it('returns null for non-matching text', () => {
    expect(parseInkcovLine('Loading...')).toBeNull();
    expect(parseInkcovLine('Error: something failed')).toBeNull();
  });

  it('returns null for partial CMYK line', () => {
    expect(parseInkcovLine('0.1 0.2 0.3 CMYK 1')).toBeNull();
  });
});
