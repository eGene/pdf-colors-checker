import { describe, expect, it } from 'vitest';
import { scanContentStreamColorSpaces } from '../../src/lib/colorProfile/contentStreamColorScan';

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

describe('scanContentStreamColorSpaces', () => {
  it('detects direct fill and stroke device-color operators', () => {
    const spaces = scanContentStreamColorSpaces(
      encode('0 g 0 G 0.1 0.2 0.3 rg 0.4 0.5 0.6 RG 0 1 1 0 k 1 0 0 0 K'),
    );

    expect([...spaces].sort()).toEqual(['CMYK', 'GRAYSCALE', 'RGB']);
  });

  it('detects device spaces selected through cs and CS', () => {
    const spaces = scanContentStreamColorSpaces(
      encode('/DeviceCMYK cs 0 1 1 0 sc /DeviceRGB CS 0.2 0.3 0.4 SC'),
    );

    expect([...spaces].sort()).toEqual(['CMYK', 'RGB']);
  });

  it('ignores operator-like text in strings, hex strings, comments, and inline-image data', () => {
    const inputs = [
      '(k K rg RG g G (nested rg)) Tj',
      '<6B204B20726720524720672047> Tj',
      '% k K rg RG g G\n',
      'BI /W 1 /H 1 /BPC 8 ID binary k K rg RG g G bytes EI\n',
    ];

    for (const input of inputs) {
      expect([...scanContentStreamColorSpaces(encode(input))]).toEqual([]);
    }
  });

  it('detects an inline image device color space without scanning its payload', () => {
    const spaces = scanContentStreamColorSpaces(
      encode('BI /W 1 /H 1 /CS /CMYK /BPC 8 ID raw rg g bytes EI'),
    );

    expect([...spaces]).toEqual(['CMYK']);
  });
});
