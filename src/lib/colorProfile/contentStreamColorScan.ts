export type ContentColorSpace = 'RGB' | 'CMYK' | 'GRAYSCALE';

const BYTE = {
  NULL: 0x00,
  TAB: 0x09,
  LF: 0x0a,
  FF: 0x0c,
  CR: 0x0d,
  SPACE: 0x20,
  PERCENT: 0x25,
  LEFT_PAREN: 0x28,
  RIGHT_PAREN: 0x29,
  SLASH: 0x2f,
  LEFT_ANGLE: 0x3c,
  RIGHT_ANGLE: 0x3e,
  LEFT_BRACKET: 0x5b,
  RIGHT_BRACKET: 0x5d,
  LEFT_BRACE: 0x7b,
  RIGHT_BRACE: 0x7d,
  BACKSLASH: 0x5c,
} as const;

function isWhitespace(byte: number): boolean {
  return (
    byte === BYTE.NULL ||
    byte === BYTE.TAB ||
    byte === BYTE.LF ||
    byte === BYTE.FF ||
    byte === BYTE.CR ||
    byte === BYTE.SPACE
  );
}

function isDelimiter(byte: number): boolean {
  return (
    byte === BYTE.LEFT_PAREN ||
    byte === BYTE.RIGHT_PAREN ||
    byte === BYTE.LEFT_ANGLE ||
    byte === BYTE.RIGHT_ANGLE ||
    byte === BYTE.LEFT_BRACKET ||
    byte === BYTE.RIGHT_BRACKET ||
    byte === BYTE.LEFT_BRACE ||
    byte === BYTE.RIGHT_BRACE ||
    byte === BYTE.SLASH ||
    byte === BYTE.PERCENT
  );
}

function readAscii(bytes: Uint8Array, start: number, end: number): string {
  let value = '';
  for (let i = start; i < end; i++) value += String.fromCharCode(bytes[i]);
  return value;
}

function skipComment(bytes: Uint8Array, start: number): number {
  let i = start + 1;
  while (i < bytes.length && bytes[i] !== BYTE.LF && bytes[i] !== BYTE.CR) i++;
  return i;
}

function skipLiteralString(bytes: Uint8Array, start: number): number {
  let depth = 1;
  let i = start + 1;
  while (i < bytes.length && depth > 0) {
    const byte = bytes[i];
    if (byte === BYTE.BACKSLASH) {
      i += 2;
      continue;
    }
    if (byte === BYTE.LEFT_PAREN) depth++;
    else if (byte === BYTE.RIGHT_PAREN) depth--;
    i++;
  }
  return i;
}

function skipHexString(bytes: Uint8Array, start: number): number {
  let i = start + 1;
  while (i < bytes.length && bytes[i] !== BYTE.RIGHT_ANGLE) i++;
  return Math.min(i + 1, bytes.length);
}

function skipInlineImageData(bytes: Uint8Array, start: number): number {
  let i = start;
  if (i < bytes.length && isWhitespace(bytes[i])) i++;

  while (i + 2 < bytes.length) {
    const precededByWhitespace = i === 0 || isWhitespace(bytes[i - 1]);
    const followedByWhitespace = isWhitespace(bytes[i + 2]);
    if (precededByWhitespace && bytes[i] === 0x45 && bytes[i + 1] === 0x49 && followedByWhitespace) {
      return i + 2;
    }
    i++;
  }
  return bytes.length;
}

function addDeviceSpace(name: string | null, spaces: Set<ContentColorSpace>): void {
  if (name === 'DeviceRGB' || name === 'RGB') spaces.add('RGB');
  else if (name === 'DeviceCMYK' || name === 'CMYK') spaces.add('CMYK');
  else if (name === 'DeviceGray' || name === 'Gray' || name === 'G') spaces.add('GRAYSCALE');
}

/**
 * Detects device color spaces used directly by a decoded PDF content stream.
 *
 * This is a lexical scan rather than a regex so operator-like bytes inside
 * strings, comments, hex strings, and inline-image payloads are ignored.
 */
export function scanContentStreamColorSpaces(bytes: Uint8Array): Set<ContentColorSpace> {
  const spaces = new Set<ContentColorSpace>();
  let previousName: string | null = null;
  let inlineImageDictionary = false;
  let inlineImageKey: string | null = null;
  let i = 0;

  while (i < bytes.length) {
    const byte = bytes[i];

    if (isWhitespace(byte)) {
      i++;
      continue;
    }
    if (byte === BYTE.PERCENT) {
      i = skipComment(bytes, i);
      continue;
    }
    if (byte === BYTE.LEFT_PAREN) {
      previousName = null;
      i = skipLiteralString(bytes, i);
      continue;
    }
    if (byte === BYTE.LEFT_ANGLE && bytes[i + 1] !== BYTE.LEFT_ANGLE) {
      previousName = null;
      i = skipHexString(bytes, i);
      continue;
    }
    if (byte === BYTE.SLASH) {
      const start = ++i;
      while (i < bytes.length && !isWhitespace(bytes[i]) && !isDelimiter(bytes[i])) i++;
      const name = readAscii(bytes, start, i);
      if (inlineImageDictionary) {
        if (inlineImageKey === 'CS' || inlineImageKey === 'ColorSpace') {
          addDeviceSpace(name, spaces);
          inlineImageKey = null;
        } else {
          inlineImageKey = name;
        }
      }
      previousName = name;
      continue;
    }
    if (isDelimiter(byte)) {
      previousName = null;
      i++;
      continue;
    }

    const start = i;
    while (i < bytes.length && !isWhitespace(bytes[i]) && !isDelimiter(bytes[i])) i++;
    const token = readAscii(bytes, start, i);

    if (inlineImageDictionary) {
      if (token === 'ID') {
        inlineImageDictionary = false;
        inlineImageKey = null;
        previousName = null;
        i = skipInlineImageData(bytes, i);
      }
      continue;
    }

    if (token === 'BI') {
      inlineImageDictionary = true;
      inlineImageKey = null;
      previousName = null;
    } else if (token === 'k' || token === 'K') {
      spaces.add('CMYK');
      previousName = null;
    } else if (token === 'rg' || token === 'RG') {
      spaces.add('RGB');
      previousName = null;
    } else if (token === 'g' || token === 'G') {
      spaces.add('GRAYSCALE');
      previousName = null;
    } else if (token === 'cs' || token === 'CS') {
      addDeviceSpace(previousName, spaces);
      previousName = null;
    } else {
      previousName = null;
    }
  }

  return spaces;
}
