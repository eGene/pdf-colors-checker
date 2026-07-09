import { inkcovRawToPercent } from './constants';
import type { InkcovLine } from '../types/pdf';

const INKCOV_LINE_RE = /(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+CMYK\s+(.+)/;

/** Parse one Ghostscript inkcov stdout line. */
export function parseInkcovLine(text: string): InkcovLine | null {
  const matches = String(text).match(INKCOV_LINE_RE);
  if (!matches) return null;
  return {
    c: inkcovRawToPercent(parseFloat(matches[1])),
    m: inkcovRawToPercent(parseFloat(matches[2])),
    y: inkcovRawToPercent(parseFloat(matches[3])),
    k: inkcovRawToPercent(parseFloat(matches[4])),
    pageLabel: matches[5],
  };
}
