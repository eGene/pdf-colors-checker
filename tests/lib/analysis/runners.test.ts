import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYSIS_KINDS } from '@/lib/constants';
import {
  createRunnerEpoch,
  runCmykAnalysis,
  runProfileAnalysis,
  runRgbAnalysis,
} from '@/lib/analysis/runners';
import type { SessionAction } from '@/features/session/sessionReducer';

const classifyPageFromDataUrl = vi.fn();
const runGhostscriptInkcov = vi.fn();
const analyzeColorProfile = vi.fn();
const hashFile = vi.fn();

vi.mock('@/lib/analysis/rgbAnalysis', () => ({
  classifyPageFromDataUrl: (...args: unknown[]) => classifyPageFromDataUrl(...args),
}));
vi.mock('@/lib/ghostscript/ghostscriptWorker', () => ({
  runGhostscriptInkcov: (...args: unknown[]) => runGhostscriptInkcov(...args),
  cancelGsColorsJobs: vi.fn(),
}));
vi.mock('@/lib/colorProfile', () => ({
  analyzeColorProfile: (...args: unknown[]) => analyzeColorProfile(...args),
}));
vi.mock('@/lib/fileHash', () => ({
  hashFile: (...args: unknown[]) => hashFile(...args),
}));
vi.mock('@/lib/analysisHistory', () => ({
  saveHistoryEntry: vi.fn((entry) => [entry]),
}));

function collectDispatch() {
  const actions: SessionAction[] = [];
  const dispatch = (action: SessionAction) => {
    actions.push(action);
  };
  return { actions, dispatch };
}

describe('analysis runners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classifyPageFromDataUrl.mockResolvedValue('bw');
    hashFile.mockResolvedValue('hash');
    analyzeColorProfile.mockResolvedValue({ verdict: 'ok' });
  });

  it('runRgbAnalysis dispatches progress and done', async () => {
    const { actions, dispatch } = collectDispatch();
    const file = new File(['x'], 't.pdf', { type: 'application/pdf' });

    await runRgbAnalysis(dispatch, ['page1', 'page2'], file, 0.01, 0.5);

    expect(actions.some((a) => a.type === 'SET_TAB' && a.tab === ANALYSIS_KINDS.RGB)).toBe(true);
    expect(actions.some((a) => a.type === 'RGB_PROGRESS')).toBe(true);
    expect(actions.some((a) => a.type === 'RGB_DONE')).toBe(true);
    expect(classifyPageFromDataUrl).toHaveBeenCalledTimes(2);
  });

  it('runCmykAnalysis dispatches rows and done on success', () => {
    const { actions, dispatch } = collectDispatch();
    const epoch = createRunnerEpoch();

    runGhostscriptInkcov.mockImplementation((_input, onDone, _progress, onLine) => {
      onLine('0.1000 0.0000 0.0000 0.5000 CMYK page 1');
      onDone(true);
    });

    runCmykAnalysis(dispatch, new ArrayBuffer(8), epoch, false);

    expect(actions.some((a) => a.type === 'CMYK_ROW')).toBe(true);
    expect(actions.some((a) => a.type === 'CMYK_DONE')).toBe(true);
  });

  it('runCmykAnalysis dispatches failed when ghostscript returns false', () => {
    const { actions, dispatch } = collectDispatch();
    const epoch = createRunnerEpoch();

    runGhostscriptInkcov.mockImplementation((_input, onDone) => {
      onDone(false);
    });

    runCmykAnalysis(dispatch, new ArrayBuffer(8), epoch, false);

    expect(actions.some((a) => a.type === 'CMYK_FAILED')).toBe(true);
  });

  it('runProfileAnalysis dispatches done on success', async () => {
    const { actions, dispatch } = collectDispatch();

    await runProfileAnalysis(dispatch, new ArrayBuffer(8));

    expect(actions.some((a) => a.type === 'SET_TAB' && a.tab === ANALYSIS_KINDS.PROFILE)).toBe(
      true,
    );
    expect(actions.some((a) => a.type === 'PROFILE_DONE')).toBe(true);
  });

  it('runProfileAnalysis dispatches failed on error', async () => {
    const { actions, dispatch } = collectDispatch();
    analyzeColorProfile.mockRejectedValueOnce(new Error('fail'));

    await runProfileAnalysis(dispatch, new ArrayBuffer(8));

    expect(actions.some((a) => a.type === 'PROFILE_FAILED')).toBe(true);
  });

  it('runCmykAnalysis retries without annotations when include fails', () => {
    const { actions, dispatch } = collectDispatch();
    const epoch = createRunnerEpoch();
    let call = 0;

    runGhostscriptInkcov.mockImplementation((input, onDone, _progress, onLine) => {
      call += 1;
      if (input.includeAnnotations) {
        onDone(false);
        return;
      }
      onLine('0.1000 0.0000 0.0000 0.5000 CMYK page 1');
      onDone(true);
    });

    runCmykAnalysis(dispatch, new ArrayBuffer(8), epoch, true);

    expect(runGhostscriptInkcov).toHaveBeenCalledTimes(2);
    expect(runGhostscriptInkcov.mock.calls[0][0].includeAnnotations).toBe(true);
    expect(runGhostscriptInkcov.mock.calls[1][0].includeAnnotations).toBe(false);
    expect(actions.some((a) => a.type === 'CMYK_DONE')).toBe(true);
    expect(actions.some((a) => a.type === 'SET_CMYK_ANNOTATION_NOTE')).toBe(true);
  });

  it('ignores cmyk callbacks after epoch bump', () => {
    const { actions, dispatch } = collectDispatch();
    const epoch = createRunnerEpoch();
    let onDone: ((ok: boolean) => void) | undefined;
    let onLine: ((line: string) => void) | undefined;

    runGhostscriptInkcov.mockImplementation((_input, done, _progress, line) => {
      onDone = done;
      onLine = line;
    });

    runCmykAnalysis(dispatch, new ArrayBuffer(8), epoch, false);
    epoch.bumpEpoch();
    onLine?.('0.1000 0.0000 0.0000 0.5000 CMYK page 1');
    onDone?.(true);

    expect(actions.filter((a) => a.type === 'CMYK_ROW')).toHaveLength(0);
    expect(actions.filter((a) => a.type === 'CMYK_DONE')).toHaveLength(0);
  });
});
