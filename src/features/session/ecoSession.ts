import { DEFAULT_ECO_OPTIONS } from '@/types/ecoOptimize';
import type {
  DocumentSafety,
  EcoOptions,
  EcoPhase,
  EcoProgress,
  EcoResult,
  InkPlateTotals,
} from '@/types/ecoOptimize';

export interface EcoSessionSlice {
  options: EcoOptions;
  /** Busy/gate clock for Save Ink UI (tab chrome also mirrors status on tabs.eco). */
  phase: EcoPhase;
  safety: DocumentSafety | null;
  progress: EcoProgress | null;
  result: EcoResult | null;
  beforeInk: InkPlateTotals | null;
  afterInk: InkPlateTotals | null;
  previewBefore: Record<number, string>;
  previewAfter: Record<number, string>;
  previewErrors: Record<string, string>;
  error: string | null;
}

export function createInitialEcoSlice(): EcoSessionSlice {
  return {
    options: { ...DEFAULT_ECO_OPTIONS },
    phase: 'idle',
    safety: null,
    progress: null,
    result: null,
    beforeInk: null,
    afterInk: null,
    previewBefore: {},
    previewAfter: {},
    previewErrors: {},
    error: null,
  };
}

export function revokeUrlMap(map: Record<number, string>): void {
  for (const url of Object.values(map)) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

export function revokeDownload(result: EcoResult | null): void {
  if (result?.downloadUrl) {
    try {
      URL.revokeObjectURL(result.downloadUrl);
    } catch {
      /* ignore */
    }
  }
}

/** Keep current ± window; revoke evicted. */
export function lruPreviewWindow(
  map: Record<number, string>,
  center: number,
  radius = 2,
): Record<number, string> {
  const keep = new Set<number>();
  for (let p = center - radius; p <= center + radius; p++) {
    if (p >= 1) keep.add(p);
  }
  const next: Record<number, string> = {};
  for (const [key, url] of Object.entries(map)) {
    const page = Number(key);
    if (keep.has(page)) next[page] = url;
    else {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }
  }
  return next;
}
