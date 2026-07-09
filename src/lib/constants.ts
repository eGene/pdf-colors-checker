import type { AnalysisKind, PageVerdict, TabState } from '../types/analysis';

export const ANALYSIS_KINDS = {
  RGB: 'rgb',
  CMYK: 'cmyk',
  PROFILE: 'profile',
  PICKER: 'picker',
} as const;

export const TAB_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  DONE: 'done',
  ERROR: 'error',
} as const;

export const ANALYSIS_KIND_LABELS: Record<AnalysisKind, string> = {
  [ANALYSIS_KINDS.RGB]: 'Color vs B&W (RGB)',
  [ANALYSIS_KINDS.CMYK]: 'Ink coverage (CMYK)',
  [ANALYSIS_KINDS.PROFILE]: 'Color profile',
  [ANALYSIS_KINDS.PICKER]: 'Color picker',
};

export const ANALYSIS_KIND_SHORT_LABELS: Record<AnalysisKind, string> = {
  [ANALYSIS_KINDS.RGB]: 'RGB',
  [ANALYSIS_KINDS.CMYK]: 'CMYK',
  [ANALYSIS_KINDS.PROFILE]: 'Profile',
  [ANALYSIS_KINDS.PICKER]: 'Picker',
};

export const ANALYSIS_KIND_HEADINGS: Record<AnalysisKind, string> = {
  [ANALYSIS_KINDS.RGB]: 'Color vs black & white',
  [ANALYSIS_KINDS.CMYK]: 'Ink coverage',
  [ANALYSIS_KINDS.PROFILE]: 'Color profile',
  [ANALYSIS_KINDS.PICKER]: 'Color picker',
};

export const ANALYSIS_TAB_ORDER: { id: AnalysisKind; label: string }[] = [
  { id: ANALYSIS_KINDS.RGB, label: ANALYSIS_KIND_LABELS.rgb },
  { id: ANALYSIS_KINDS.CMYK, label: ANALYSIS_KIND_LABELS.cmyk },
  { id: ANALYSIS_KINDS.PROFILE, label: ANALYSIS_KIND_LABELS.profile },
  { id: ANALYSIS_KINDS.PICKER, label: ANALYSIS_KIND_LABELS.picker },
];

export const DONATE_URL = 'https://app.gosignpdf.com/pricing#pricing-tip-section';
export const FEEDBACK_URL = 'https://gosignpdf.com/contact-us/';

/** AskYourPDF affiliate referral link. */
export const ASKYOURPDF_AFFILIATE_URL = 'https://www.askyourpdf.com?via=gosignpdf';

export const FOOTER_LINKS = {
  terms: 'https://gosignpdf.com/legal/terms-and-conditions/',
  privacy: 'https://gosignpdf.com/legal/privacy-policy/',
  support: 'https://gosignpdf.com/contact-us/',
  source: 'https://github.com/eGene/pdf-colors-checker',
};

/** Canonical URL for social share intents (not localhost). */
export const SHARE_PAGE_URL = 'https://gosignpdf.com/colors-checker/';

export const SHARE_TEXT =
  'PDF Colors Checker — color vs B&W pages, CMYK ink coverage, and color profile inspection in your browser.';

export function getShareUrls(): { x: string; linkedin: string; facebook: string } {
  const url = encodeURIComponent(SHARE_PAGE_URL);
  const text = encodeURIComponent(SHARE_TEXT);
  return {
    x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  };
}

export const HISTORY_STORAGE_KEY = 'colors-checker-history';
export const HISTORY_MAX_ENTRIES = 6;

/**
 * Default min C/M/Y ink % (Ghostscript inkcov) to count a page as color.
 * CLI tutorials often use 0% (any C/M/Y); we default to 0.5% to ignore trace ink.
 */
export const DEFAULT_CMYK_COLOR_INK_THRESHOLD = 0.5;

/** Slider range for CMYK threshold UI (percent). Max 10.00%, step 0.01% via hundredths. */
export const CMYK_INK_THRESHOLD_MAX = 10;
export const CMYK_INK_THRESHOLD_SLIDER_MAX_HUNDREDTHS = CMYK_INK_THRESHOLD_MAX * 100;

/** Ghostscript inkcov reports 0–1 (1.0 = 100% of pixels use that plate). */
export function inkcovRawToPercent(raw: number): number {
  return Math.round(Math.max(0, raw) * 10000) / 100;
}

export function cmykPageHasColorInk(
  c: number,
  m: number,
  y: number,
  minInkPercent: number = DEFAULT_CMYK_COLOR_INK_THRESHOLD,
): boolean {
  if (minInkPercent <= 0) {
    return c > 0 || m > 0 || y > 0;
  }
  return c >= minInkPercent || m >= minInkPercent || y >= minInkPercent;
}

export function cmykPageVerdict(
  c: number,
  m: number,
  y: number,
  minInkPercent: number = DEFAULT_CMYK_COLOR_INK_THRESHOLD,
): PageVerdict {
  return cmykPageHasColorInk(c, m, y, minInkPercent) ? 'COLOR' : 'B/W';
}

/** @param sliderHundredths 0–1000 → 0.00%–10.00% */
export function cmykInkThresholdFromSlider(sliderHundredths: number): number {
  return sliderHundredths / 100;
}

export function cmykInkThresholdToSlider(percent: number): number {
  return Math.round(percent * 100);
}

export function clampCmykInkThreshold(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > CMYK_INK_THRESHOLD_MAX) return CMYK_INK_THRESHOLD_MAX;
  return Math.round(value * 10000) / 10000;
}

export function formatCmykInkThreshold(percent: number): string {
  if (percent === 0) return '0% (any C/M/Y)';
  const trimmed = percent.toFixed(4).replace(/\.?0+$/, '');
  return `${trimmed}%`;
}

export function getAnalysisKindLabel(kind: AnalysisKind): string {
  return ANALYSIS_KIND_LABELS[kind];
}

export function getAnalysisKindShortLabel(kind: AnalysisKind): string {
  return ANALYSIS_KIND_SHORT_LABELS[kind];
}

/** Normalize legacy uppercase mode values from localStorage. */
export function normalizeAnalysisKind(value: unknown): AnalysisKind | null {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase();
  if (lower === ANALYSIS_KINDS.RGB) return ANALYSIS_KINDS.RGB;
  if (lower === ANALYSIS_KINDS.CMYK) return ANALYSIS_KINDS.CMYK;
  if (lower === ANALYSIS_KINDS.PROFILE) return ANALYSIS_KINDS.PROFILE;
  if (lower === ANALYSIS_KINDS.PICKER) return ANALYSIS_KINDS.PICKER;
  return null;
}

export function createInitialTabStates(): Record<AnalysisKind, TabState> {
  const idle: TabState = { status: TAB_STATUS.IDLE, progress: 0, error: null };
  return {
    [ANALYSIS_KINDS.RGB]: { ...idle },
    [ANALYSIS_KINDS.CMYK]: { ...idle },
    [ANALYSIS_KINDS.PROFILE]: { ...idle },
    [ANALYSIS_KINDS.PICKER]: { ...idle },
  };
}
