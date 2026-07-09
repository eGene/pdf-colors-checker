import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_KINDS,
  clampCmykInkThreshold,
  cmykInkThresholdFromSlider,
  cmykInkThresholdToSlider,
  cmykPageVerdict,
  formatCmykInkThreshold,
  getAnalysisKindLabel,
  getShareUrls,
  inkcovRawToPercent,
  normalizeAnalysisKind,
} from '../../src/lib/constants';
import { exportActiveTab, exportCmyk, exportPicks, exportRgb } from '../../src/lib/exportResults';

describe('constants', () => {
  describe('inkcovRawToPercent', () => {
    it('converts 0–1 raw inkcov to percent with two decimals', () => {
      expect(inkcovRawToPercent(0)).toBe(0);
      expect(inkcovRawToPercent(0.005)).toBe(0.5);
      expect(inkcovRawToPercent(1)).toBe(100);
    });

    it('clamps negative raw values to zero', () => {
      expect(inkcovRawToPercent(-0.1)).toBe(0);
    });
  });

  describe('cmykPageVerdict', () => {
    it('counts any C/M/Y at 0% threshold', () => {
      expect(cmykPageVerdict(0.01, 0, 0, 0)).toBe('COLOR');
      expect(cmykPageVerdict(0, 0, 0, 100)).toBe('B/W');
    });

    it('ignores K-only at default 0.5% threshold', () => {
      expect(cmykPageVerdict(0, 0, 0, 0.5)).toBe('B/W');
    });

    it('matches pdfkit rich-gray edge: color at 0%, B/W at 0.5%', () => {
      expect(cmykPageVerdict(0.25, 0.25, 0.25, 0)).toBe('COLOR');
      expect(cmykPageVerdict(0.25, 0.25, 0.25, 0.5)).toBe('B/W');
    });
  });

  describe('cmyk threshold slider', () => {
    it('round-trips slider hundredths and percent', () => {
      expect(cmykInkThresholdFromSlider(50)).toBe(0.5);
      expect(cmykInkThresholdToSlider(0.5)).toBe(50);
    });

    it('clamps threshold input', () => {
      expect(clampCmykInkThreshold(-1)).toBe(0);
      expect(clampCmykInkThreshold(99)).toBe(10);
    });

    it('formats threshold label', () => {
      expect(formatCmykInkThreshold(0)).toBe('0% (any C/M/Y)');
      expect(formatCmykInkThreshold(0.5)).toBe('0.5%');
    });
  });

  describe('normalizeAnalysisKind', () => {
    it('accepts lowercase and legacy uppercase values', () => {
      expect(normalizeAnalysisKind('rgb')).toBe(ANALYSIS_KINDS.RGB);
      expect(normalizeAnalysisKind('RGB')).toBe(ANALYSIS_KINDS.RGB);
      expect(normalizeAnalysisKind('CMYK')).toBe(ANALYSIS_KINDS.CMYK);
    });

    it('returns null for invalid values', () => {
      expect(normalizeAnalysisKind('invalid')).toBeNull();
      expect(normalizeAnalysisKind(42)).toBeNull();
    });
  });

  describe('getShareUrls', () => {
    it('returns encoded social share URLs', () => {
      const urls = getShareUrls();
      expect(urls.x).toContain('twitter.com/intent/tweet');
      expect(urls.linkedin).toContain('linkedin.com');
      expect(urls.facebook).toContain('facebook.com');
      expect(urls.x).toContain(encodeURIComponent('https://gosignpdf.com/colors-checker/'));
    });
  });

  describe('getAnalysisKindLabel', () => {
    it('returns human labels for analysis kinds', () => {
      expect(getAnalysisKindLabel(ANALYSIS_KINDS.RGB)).toContain('RGB');
      expect(getAnalysisKindLabel(ANALYSIS_KINDS.CMYK)).toContain('CMYK');
    });
  });
});

describe('exportResults', () => {
  it('exports RGB summary text', () => {
    const result = exportRgb({
      threshold: 0.01,
      bwPages: [0],
      colorPages: [1],
      totalPages: 2,
    });
    expect(result.filename).toBe('rgb-analysis.txt');
    expect(result.content).toContain('mode: RGB');
    expect(result.content).toContain('total: 2');
  });

  it('exports CMYK CSV with derived verdicts', () => {
    const result = exportCmyk({
      inkCoverage: [{ page: 1, c: 0, m: 0, y: 0, k: 50 }],
      cmykInkThreshold: 0.5,
      verdictFor: () => 'B/W',
    });
    expect(result?.filename).toBe('cmyk-coverage.csv');
    expect(result?.content).toContain('B/W');
  });

  it('exports picker CSV', () => {
    const result = exportPicks({
      colorPicks: [
        {
          hex: '#FF0000',
          r: 255,
          g: 0,
          b: 0,
          c: 0,
          m: 100,
          y: 100,
          k: 0,
          pageNumber: 1,
          pixelX: 10,
          pixelY: 20,
        },
      ],
    });
    expect(result?.filename).toBe('color-picks.csv');
    expect(result?.content).toContain('#FF0000');
  });

  it('exportActiveTab returns null for picker with no picks', () => {
    expect(
      exportActiveTab({
        activeTab: ANALYSIS_KINDS.PICKER,
        pages: ['data:'],
        thresholds: { rgb: 0.01, cmykInk: 0.5 },
        bwPages: [],
        colorPages: [],
        inkCoverage: [],
        profileResult: null,
        colorPicks: [],
        verdictFor: () => 'B/W',
      }),
    ).toBeNull();
  });
});
