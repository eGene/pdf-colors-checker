import type { AnalysisKind } from './analysis';

export interface HistoryEntry {
  fileHash: string;
  fileName: string;
  mode: AnalysisKind;
  threshold: number;
  cmykInkThreshold?: number;
  totalPages: number;
  bwPages: number[];
  colorPages: number[];
  analyzedAt: number;
}
