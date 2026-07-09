import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisSessionProvider } from '@/features/session/AnalysisSessionProvider';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';
import { ANALYSIS_KINDS, TAB_STATUS } from '@/lib/constants';
import { UPLOAD_ERROR_MESSAGE } from '@/features/session/sessionReducer';

const pdf2png = vi.fn();
const classifyPageFromDataUrl = vi.fn();
const runGhostscriptInkcov = vi.fn();
const analyzeColorProfile = vi.fn();

vi.mock('@/lib/pdf2png', () => ({ pdf2png: (...args: unknown[]) => pdf2png(...args) }));
vi.mock('@/lib/analysis/rgbAnalysis', () => ({
  classifyPageFromDataUrl: (...args: unknown[]) => classifyPageFromDataUrl(...args),
}));
const cancelGsColorsJobs = vi.fn();

vi.mock('@/lib/ghostscript/ghostscriptWorker', () => ({
  runGhostscriptInkcov: (...args: unknown[]) => runGhostscriptInkcov(...args),
  cancelGsColorsJobs: () => cancelGsColorsJobs(),
}));
vi.mock('@/lib/colorProfile', () => ({
  analyzeColorProfile: (...args: unknown[]) => analyzeColorProfile(...args),
}));
vi.mock('@/lib/fileHash', () => ({
  hashFile: vi.fn().mockResolvedValue('hash'),
}));
vi.mock('@/lib/analysisHistory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analysisHistory')>();
  return {
    ...actual,
    loadHistory: vi.fn(() => []),
    saveHistoryEntry: vi.fn((entry) => [entry]),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return <AnalysisSessionProvider>{children}</AnalysisSessionProvider>;
}

function makePdfFile(name = 'test.pdf') {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' });
}

function mockCmykLines() {
  runGhostscriptInkcov.mockImplementation((_input, onDone, _progress, onLine) => {
    onLine('0.1000 0.0000 0.0000 0.5000 CMYK page 1');
    onLine('0.0000 0.2000 0.0000 0.4000 CMYK page 2');
    onDone(true);
  });
}

describe('useAnalysisSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdf2png.mockResolvedValue(['data:image/png;base64,page1', 'data:image/png;base64,page2']);
    classifyPageFromDataUrl.mockResolvedValue('bw');
    mockCmykLines();
    analyzeColorProfile.mockResolvedValue({
      verdict: 'ok',
      documentColorSpaces: ['RGB'],
      stats: { totalPages: 1, colorSpaceCount: 1, spotColorCount: 0 },
      icc: null,
      spotColors: [],
      perPage: [],
      note: '',
    });
  });

  it('initializes with no loaded pages and default tab', () => {
    const { result } = renderHook(() => useAnalysisSessionContext(), { wrapper });
    expect(result.current.pages).toBeNull();
    expect(result.current.initialTab).toBe(ANALYSIS_KINDS.RGB);
    expect(result.current.activeTab).toBe(ANALYSIS_KINDS.RGB);
    expect(result.current.isProcessing).toBe(false);
  });

  it('updates initial tab from dashboard', () => {
    const { result } = renderHook(() => useAnalysisSessionContext(), { wrapper });
    act(() => {
      result.current.setInitialTab(ANALYSIS_KINDS.CMYK);
    });
    expect(result.current.initialTab).toBe(ANALYSIS_KINDS.CMYK);
  });

  it('preserves initial tab on reset', () => {
    const { result } = renderHook(() => useAnalysisSessionContext(), { wrapper });
    act(() => {
      result.current.setInitialTab(ANALYSIS_KINDS.CMYK);
      result.current.reset();
    });
    expect(result.current.initialTab).toBe(ANALYSIS_KINDS.CMYK);
    expect(result.current.pages).toBeNull();
  });

  it('sets uploadError when file processing fails', async () => {
    pdf2png.mockRejectedValueOnce(new Error('render failed'));
    const { result } = renderHook(() => useAnalysisSessionContext(), { wrapper });

    await act(async () => {
      result.current.handleFileSelected(makePdfFile());
    });

    await waitFor(() => {
      expect(result.current.uploadError).toBe(UPLOAD_ERROR_MESSAGE);
    });
    expect(result.current.pages).toBeNull();
    expect(result.current.isProcessing).toBe(false);
  });

  it('ensureTabAnalysis skips when tab is already DONE', async () => {
    const { result } = renderHook(() => useAnalysisSessionContext(), { wrapper });

    act(() => {
      result.current.setInitialTab(ANALYSIS_KINDS.PICKER);
    });

    await act(async () => {
      result.current.handleFileSelected(makePdfFile());
    });

    await waitFor(() => {
      expect(result.current.pages).not.toBeNull();
      expect(result.current.tabs.picker.status).toBe(TAB_STATUS.DONE);
    });

    const callsBefore = runGhostscriptInkcov.mock.calls.length;

    act(() => {
      result.current.handleTabChange(ANALYSIS_KINDS.PICKER);
    });

    expect(runGhostscriptInkcov).toHaveBeenCalledTimes(callsBefore);
    expect(result.current.tabs.picker.status).toBe(TAB_STATUS.DONE);
  });

  it('lazy-loads CMYK only once when switching to CMYK tab', async () => {
    const { result } = renderHook(() => useAnalysisSessionContext(), { wrapper });

    act(() => {
      result.current.setInitialTab(ANALYSIS_KINDS.PICKER);
    });

    await act(async () => {
      result.current.handleFileSelected(makePdfFile());
    });

    await waitFor(() => expect(result.current.pages).not.toBeNull());

    act(() => {
      result.current.handleTabChange(ANALYSIS_KINDS.CMYK);
    });

    await waitFor(() => {
      expect(result.current.tabs.cmyk.status).toBe(TAB_STATUS.DONE);
    });

    expect(runGhostscriptInkcov).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleTabChange(ANALYSIS_KINDS.CMYK);
    });

    expect(runGhostscriptInkcov).toHaveBeenCalledTimes(1);
  });

  it('re-runs CMYK after reset and second file upload', async () => {
    const { result } = renderHook(() => useAnalysisSessionContext(), { wrapper });

    act(() => {
      result.current.setInitialTab(ANALYSIS_KINDS.PICKER);
    });

    await act(async () => {
      result.current.handleFileSelected(makePdfFile('first.pdf'));
    });
    await waitFor(() => expect(result.current.pages).not.toBeNull());

    act(() => {
      result.current.handleTabChange(ANALYSIS_KINDS.CMYK);
    });
    await waitFor(() => {
      expect(result.current.tabs.cmyk.status).toBe(TAB_STATUS.DONE);
      expect(result.current.inkCoverage.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.reset();
    });
    expect(cancelGsColorsJobs).toHaveBeenCalled();

    await act(async () => {
      result.current.handleFileSelected(makePdfFile('second.pdf'));
    });
    await waitFor(() => expect(result.current.pages).not.toBeNull());

    act(() => {
      result.current.handleTabChange(ANALYSIS_KINDS.CMYK);
    });

    await waitFor(() => {
      expect(result.current.tabs.cmyk.status).toBe(TAB_STATUS.DONE);
      expect(result.current.inkCoverage.length).toBeGreaterThan(0);
    });
    expect(runGhostscriptInkcov).toHaveBeenCalledTimes(2);
  });

  it('reanalyze forces CMYK to run again', async () => {
    const { result } = renderHook(() => useAnalysisSessionContext(), { wrapper });

    act(() => {
      result.current.setInitialTab(ANALYSIS_KINDS.CMYK);
    });

    await act(async () => {
      result.current.handleFileSelected(makePdfFile());
    });
    await waitFor(() => {
      expect(result.current.tabs.cmyk.status).toBe(TAB_STATUS.DONE);
    });

    act(() => {
      result.current.reanalyze();
    });

    await waitFor(() => {
      expect(result.current.tabs.cmyk.status).toBe(TAB_STATUS.DONE);
      expect(result.current.inkCoverage.length).toBeGreaterThan(0);
    });
    expect(runGhostscriptInkcov).toHaveBeenCalledTimes(2);
  });
});
