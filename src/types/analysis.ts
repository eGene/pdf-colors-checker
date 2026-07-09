export type AnalysisKind = 'rgb' | 'cmyk' | 'profile' | 'picker';

export type TabStatus = 'idle' | 'running' | 'done' | 'error';

/** CMYK ink coverage and export labels (uppercase for display/CSV). */
export type PageVerdict = 'COLOR' | 'B/W';

export interface InkCoverageRow {
  page: number;
  c: number;
  m: number;
  y: number;
  k: number;
}

/** RGB pixel classification from rendered page images (lowercase internal values). */
export type PageClassification = 'bw' | 'color';

export interface TabState {
  status: TabStatus;
  progress: number;
  error: string | null;
}
