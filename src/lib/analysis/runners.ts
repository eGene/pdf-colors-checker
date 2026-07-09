import { ANALYSIS_KINDS, TAB_STATUS } from '@/lib/constants';
import { saveHistoryEntry } from '@/lib/analysisHistory';
import { hashFile } from '@/lib/fileHash';
import { parseInkcovLine } from '@/lib/inkcovParse';
import { pdf2png } from '@/lib/pdf2png';
import { analyzeColorProfile } from '@/lib/colorProfile';
import {
  cancelGsColorsJobs,
  runGhostscriptInkcov,
} from '@/lib/ghostscript/ghostscriptWorker';
import { classifyPageFromDataUrl } from '@/lib/analysis/rgbAnalysis';
import type { AnalysisKind, InkCoverageRow } from '@/types/analysis';
import type { HistoryEntry } from '@/types/history';
import type { SessionAction } from '@/features/session/sessionReducer';

export type RunnerDispatch = (action: SessionAction) => void;

export interface RunnerEpoch {
  getEpoch: () => number;
  bumpEpoch: () => void;
}

export function createRunnerEpoch(): RunnerEpoch {
  let epoch = 0;
  return {
    getEpoch: () => epoch,
    bumpEpoch: () => {
      epoch += 1;
      cancelGsColorsJobs();
    },
  };
}

async function persistRgbHistory(
  dispatch: RunnerDispatch,
  file: File,
  pageImages: string[],
  bw: number[],
  color: number[],
  thresholds: { rgb: number; cmykInk: number },
): Promise<void> {
  try {
    const fileHash = await hashFile(file);
    const entry: HistoryEntry = {
      fileHash,
      fileName: file.name,
      mode: ANALYSIS_KINDS.RGB,
      threshold: thresholds.rgb,
      cmykInkThreshold: thresholds.cmykInk,
      totalPages: pageImages.length,
      bwPages: [...bw],
      colorPages: [...color],
      analyzedAt: Date.now(),
    };
    dispatch({ type: 'SET_HISTORY', history: saveHistoryEntry(entry) });
  } catch (e) {
    console.error('Failed to save analysis history', e);
  }
}

export async function runRgbAnalysis(
  dispatch: RunnerDispatch,
  pages: string[],
  file: File,
  threshold: number,
  cmykInk: number,
): Promise<void> {
  dispatch({
    type: 'SET_TAB',
    tab: ANALYSIS_KINDS.RGB,
    patch: { status: TAB_STATUS.RUNNING, progress: 0, error: null },
  });
  dispatch({ type: 'SET_PROCESSING', isProcessing: true, label: 'RGB analysis' });

  const bw: number[] = [];
  const color: number[] = [];
  for (let idx = 0; idx < pages.length; idx++) {
    const verdict = await classifyPageFromDataUrl(pages[idx], threshold);
    if (verdict === 'bw') bw.push(idx);
    else color.push(idx);
    dispatch({
      type: 'RGB_PROGRESS',
      bwPages: [...bw],
      colorPages: [...color],
      progress: idx + 1,
    });
  }

  dispatch({ type: 'RGB_DONE', bwPages: bw, colorPages: color });
  await persistRgbHistory(dispatch, file, pages, bw, color, { rgb: threshold, cmykInk });
}

export function runCmykAnalysis(
  dispatch: RunnerDispatch,
  fileBytes: ArrayBuffer,
  epochRef: RunnerEpoch,
  includeAnnotations: boolean,
): void {
  dispatch({ type: 'CMYK_RESET' });
  dispatch({
    type: 'SET_TAB',
    tab: ANALYSIS_KINDS.CMYK,
    patch: { status: TAB_STATUS.RUNNING, progress: 0, error: null },
  });
  dispatch({ type: 'SET_PROCESSING', isProcessing: true, label: 'CMYK coverage' });

  const epoch = epochRef.getEpoch();
  const rows: InkCoverageRow[] = [];
  let pageIdx = 0;

  const finish = (ok: boolean, annotationNote: string | null) => {
    if (epoch !== epochRef.getEpoch()) return;
    if (!ok) {
      dispatch({
        type: 'CMYK_FAILED',
        error: 'CMYK ink coverage analysis failed. Please try again.',
      });
      return;
    }
    if (rows.length === 0) {
      dispatch({
        type: 'CMYK_FAILED',
        error: 'CMYK ink coverage analysis returned no data. Please try again.',
      });
      return;
    }
    if (annotationNote) {
      dispatch({ type: 'SET_CMYK_ANNOTATION_NOTE', note: annotationNote });
    }
    dispatch({ type: 'CMYK_DONE', rows: [...rows] });
  };

  const runOnce = (withAnnotations: boolean, retriedWithoutAnnots: boolean) => {
    if (retriedWithoutAnnots) {
      rows.length = 0;
      pageIdx = 0;
      dispatch({ type: 'CMYK_RESET' });
    }

    runGhostscriptInkcov(
      { pdfBytes: fileBytes, includeAnnotations: withAnnotations },
      (ok) => {
        if (epoch !== epochRef.getEpoch()) return;
        if (!ok && withAnnotations && includeAnnotations && !retriedWithoutAnnots) {
          runOnce(false, true);
          return;
        }
        const annotationNote =
          retriedWithoutAnnots && ok
            ? 'Could not include annotation ink on this PDF; results exclude annotations.'
            : null;
        finish(ok, annotationNote);
      },
      () => {},
      (element) => {
        if (epoch !== epochRef.getEpoch()) return;
        const raw = typeof element === 'string' ? element : String(element);
        const parsed = parseInkcovLine(raw);
        if (parsed) {
          const row: InkCoverageRow = {
            page: pageIdx + 1,
            c: parsed.c,
            m: parsed.m,
            y: parsed.y,
            k: parsed.k,
          };
          rows.push(row);
          pageIdx += 1;
          dispatch({ type: 'CMYK_ROW', row });
        }
      },
    );
  };

  runOnce(includeAnnotations, false);
}

export async function runProfileAnalysis(
  dispatch: RunnerDispatch,
  fileBytes: ArrayBuffer,
): Promise<void> {
  dispatch({
    type: 'SET_TAB',
    tab: ANALYSIS_KINDS.PROFILE,
    patch: { status: TAB_STATUS.RUNNING, progress: 0, error: null },
  });
  dispatch({ type: 'SET_PROCESSING', isProcessing: true, label: 'Color profile' });
  try {
    const result = await analyzeColorProfile(fileBytes);
    dispatch({ type: 'PROFILE_DONE', result });
  } catch (e) {
    console.error('Color profile analysis failed', e);
    dispatch({
      type: 'PROFILE_FAILED',
      error: 'Color profile analysis failed. Please try again.',
    });
  }
}

export interface TabRunContext {
  pages: string[] | null;
  fileBytes: ArrayBuffer | null;
  file: File | null;
  thresholds: { rgb: number; cmykInk: number };
  cmykIncludeAnnotations: boolean;
  epoch: RunnerEpoch;
}

/** Mark picker ready after file load (no async work). */
export function markPickerReady(dispatch: RunnerDispatch): void {
  dispatch({
    type: 'SET_TAB',
    tab: ANALYSIS_KINDS.PICKER,
    patch: { status: TAB_STATUS.DONE, progress: 0, error: null },
  });
  dispatch({ type: 'SET_PROCESSING', isProcessing: false, label: null });
}

/**
 * Start analysis for a tab. Single dispatch point for upload, tab-change, and reanalyze.
 * Picker has no runner — callers handle CLEAR_PICKER / markPickerReady separately.
 */
export function runAnalysisKind(
  dispatch: RunnerDispatch,
  tab: AnalysisKind,
  ctx: TabRunContext,
): void {
  if (tab === ANALYSIS_KINDS.PICKER) return;

  if (tab === ANALYSIS_KINDS.RGB) {
    if (!ctx.pages?.length || !ctx.file) return;
    void runRgbAnalysis(dispatch, ctx.pages, ctx.file, ctx.thresholds.rgb, ctx.thresholds.cmykInk);
    return;
  }
  if (tab === ANALYSIS_KINDS.CMYK) {
    if (!ctx.fileBytes) return;
    runCmykAnalysis(dispatch, ctx.fileBytes, ctx.epoch, ctx.cmykIncludeAnnotations);
    return;
  }
  if (tab === ANALYSIS_KINDS.PROFILE) {
    if (!ctx.fileBytes) return;
    void runProfileAnalysis(dispatch, ctx.fileBytes);
  }
}

export async function processPdfFile(
  dispatch: RunnerDispatch,
  epochRef: RunnerEpoch,
  selectedFile: File,
  initialTab: AnalysisKind,
  thresholds: { rgb: number; cmykInk: number },
  cmykIncludeAnnotations: boolean,
): Promise<void> {
  epochRef.bumpEpoch();
  dispatch({ type: 'START_FILE_PROCESSING', initialTab });
  try {
    const raw = await selectedFile.arrayBuffer();
    const fileBytes = raw.slice(0);
    const pages = await pdf2png(raw.slice(0));
    dispatch({ type: 'FILE_LOADED', file: selectedFile, fileBytes, pages });

    const ctx: TabRunContext = {
      pages,
      fileBytes,
      file: selectedFile,
      thresholds,
      cmykIncludeAnnotations,
      epoch: epochRef,
    };
    if (initialTab === ANALYSIS_KINDS.PICKER) {
      markPickerReady(dispatch);
    } else {
      runAnalysisKind(dispatch, initialTab, ctx);
    }
  } catch (e) {
    console.error(e);
    dispatch({ type: 'FILE_PROCESS_FAILED' });
  }
}
