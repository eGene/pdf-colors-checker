function readU32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0xff) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff)
  ) >>> 0;
}

function readAscii(bytes: Uint8Array, start: number, len: number): string {
  let s = '';
  for (let i = 0; i < len && start + i < bytes.length; i++) {
    const c = bytes[start + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

/** Parse ICC profile description from raw bytes (no Node Buffer / icc package). */
export function readIccDescription(bytes: Uint8Array | null | undefined): string | null {
  if (!bytes || bytes.length < 132) return null;
  const tagCount = readU32BE(bytes, 128);
  let offset = 132;
  for (let i = 0; i < tagCount && offset + 12 <= bytes.length; i++) {
    const sig =
      String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const dataOffset = readU32BE(bytes, offset + 4);
    const dataSize = readU32BE(bytes, offset + 8);
    if (sig === 'desc' && dataOffset + dataSize <= bytes.length) {
      const type = readAscii(bytes, dataOffset, 4);
      if (type === 'desc') {
        const asciiLen = readU32BE(bytes, dataOffset + 8);
        return readAscii(bytes, dataOffset + 12, Math.min(asciiLen, dataSize - 12));
      }
    }
    if (sig === 'mluc' && dataOffset + dataSize <= bytes.length) {
      const numRecords = readU32BE(bytes, dataOffset + 8);
      const recordSize = readU32BE(bytes, dataOffset + 12);
      let recOff = dataOffset + 16;
      for (let r = 0; r < numRecords && recOff + recordSize <= bytes.length; r++) {
        const strLen = readU32BE(bytes, recOff + 4);
        const strOff = readU32BE(bytes, recOff + 8);
        const absOff = dataOffset + strOff;
        if (strLen > 0 && absOff + strLen * 2 <= bytes.length) {
          let text = '';
          for (let j = 0; j < strLen; j++) {
            const code = (bytes[absOff + j * 2] << 8) | (bytes[absOff + j * 2 + 1] & 0xff);
            if (code === 0) break;
            text += String.fromCharCode(code);
          }
          if (text.trim()) return text.trim();
        }
        recOff += recordSize;
      }
    }
    offset += 12;
  }
  return null;
}

export function componentsToSpace(n: number | undefined): string | null {
  if (n === 1) return 'GRAYSCALE';
  if (n === 3) return 'RGB';
  if (n === 4) return 'CMYK';
  return null;
}
