import { describe, expect, it } from 'vitest';
import {
  TAB_PIPELINE,
  tabAnalysisSettled,
  tabHasResults,
  tabNeedsMet,
} from '@/lib/analysis/tabPipeline';
import { ANALYSIS_KINDS, TAB_STATUS } from '@/lib/constants';

describe('tabPipeline', () => {
  it('declares needs per analysis kind', () => {
    expect(TAB_PIPELINE.rgb.needs).toEqual(['pages']);
    expect(TAB_PIPELINE.cmyk.needs).toContain('fileBytes');
    expect(TAB_PIPELINE.profile.needs).toEqual(['fileBytes']);
    expect(TAB_PIPELINE.picker.needs).toEqual(['pages']);
  });

  it('tabNeedsMet checks pages and file bytes', () => {
    expect(
      tabNeedsMet(ANALYSIS_KINDS.RGB, { pages: ['data:'], fileBytes: null }),
    ).toBe(true);
    expect(
      tabNeedsMet(ANALYSIS_KINDS.CMYK, { pages: ['data:'], fileBytes: new ArrayBuffer(8) }),
    ).toBe(true);
    expect(
      tabNeedsMet(ANALYSIS_KINDS.CMYK, { pages: ['data:'], fileBytes: null }),
    ).toBe(false);
    expect(
      tabNeedsMet(ANALYSIS_KINDS.PROFILE, { pages: null, fileBytes: new ArrayBuffer(8) }),
    ).toBe(true);
  });

  it('tabHasResults is false for CMYK done with no rows', () => {
    const snapshot = {
      inkCoverage: [],
      profileResult: null,
      pages: ['data:'],
      bwPages: [],
      colorPages: [],
    };
    expect(tabHasResults(ANALYSIS_KINDS.CMYK, snapshot)).toBe(false);
    expect(tabAnalysisSettled(ANALYSIS_KINDS.CMYK, TAB_STATUS.DONE, snapshot)).toBe(false);
  });
});
