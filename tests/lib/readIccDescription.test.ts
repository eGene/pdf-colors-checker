import { describe, expect, it } from 'vitest';
import { readIccDescription } from '../../src/lib/colorProfile';

function writeU32BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

/** Build minimal ICC header + one tag table entry. */
function buildIccWithTag(tagSig: string, tagPayload: Uint8Array): Uint8Array {
  const tagTableStart = 128;
  const tagEntryStart = tagTableStart + 4;
  const dataOffset = tagEntryStart + 12;
  const totalSize = dataOffset + tagPayload.length;
  const buf = new Uint8Array(totalSize);
  writeU32BE(buf, tagTableStart, 1);
  buf[tagEntryStart] = tagSig.charCodeAt(0);
  buf[tagEntryStart + 1] = tagSig.charCodeAt(1);
  buf[tagEntryStart + 2] = tagSig.charCodeAt(2);
  buf[tagEntryStart + 3] = tagSig.charCodeAt(3);
  writeU32BE(buf, tagEntryStart + 4, dataOffset);
  writeU32BE(buf, tagEntryStart + 8, tagPayload.length);
  buf.set(tagPayload, dataOffset);
  return buf;
}

function buildDescTag(text: string): Uint8Array {
  const ascii = new TextEncoder().encode(text);
  const payload = new Uint8Array(12 + ascii.length);
  payload[0] = 'd'.charCodeAt(0);
  payload[1] = 'e'.charCodeAt(0);
  payload[2] = 's'.charCodeAt(0);
  payload[3] = 'c'.charCodeAt(0);
  writeU32BE(payload, 8, ascii.length);
  payload.set(ascii, 12);
  return payload;
}

function buildMlucTag(text: string): Uint8Array {
  const recordSize = 12;
  const stringOffset = 16 + recordSize;
  const utf16Len = text.length;
  const utf16 = new Uint8Array(utf16Len * 2);
  for (let i = 0; i < text.length; i++) {
    utf16[i * 2] = (text.charCodeAt(i) >> 8) & 0xff;
    utf16[i * 2 + 1] = text.charCodeAt(i) & 0xff;
  }
  const payload = new Uint8Array(stringOffset + utf16.length);
  payload[0] = 'm'.charCodeAt(0);
  payload[1] = 'l'.charCodeAt(0);
  payload[2] = 'u'.charCodeAt(0);
  payload[3] = 'c'.charCodeAt(0);
  writeU32BE(payload, 8, 1);
  writeU32BE(payload, 12, recordSize);
  writeU32BE(payload, 16 + 4, utf16Len);
  writeU32BE(payload, 16 + 8, stringOffset);
  payload.set(utf16, stringOffset);
  return payload;
}

describe('readIccDescription', () => {
  it('returns null for too-short input', () => {
    expect(readIccDescription(new Uint8Array(100))).toBeNull();
  });

  it('reads desc tag ASCII description', () => {
    const icc = buildIccWithTag('desc', buildDescTag('sRGB IEC61966-2.1'));
    expect(readIccDescription(icc)).toBe('sRGB IEC61966-2.1');
  });

  it('reads mluc tag localized description', () => {
    const icc = buildIccWithTag('mluc', buildMlucTag('Adobe RGB'));
    expect(readIccDescription(icc)).toBe('Adobe RGB');
  });
});
