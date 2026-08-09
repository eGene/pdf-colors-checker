import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { ANALYSIS_KINDS, cmykPageVerdict } from '@/lib/constants';
import { deleteHistoryEntry } from '@/lib/analysisHistory';
import { downloadExport, exportActiveTab } from '@/lib/exportResults';
import {
  createRunnerEpoch,
  markPickerReady,
  processPdfFile,
  runAnalysisKind,
  type TabRunContext,
} from '@/lib/analysis/runners';
import { tabAnalysisSettled, tabNeedsMet } from '@/lib/analysis/tabPipeline';
import {
  createInitialState,
  sessionReducer,
  type SessionState,
} from '@/features/session/sessionReducer';
import type { AnalysisKind } from '@/types/analysis';
import type { ColorPick } from '@/types/pdf';
import type { HistoryEntry } from '@/types/history';
import type { EcoOptions, EcoPreviewSide } from '@/types/ecoOptimize';
import {
  cacheEcoFile,
  cancelEcoOptimize,
  clearPreviewInFlight,
  requestPreviewPage,
  resetEcoWorker,
  runEcoSafetyCheck,
  setEcoClientHandlers,
  startEcoOptimize,
} from '@/lib/ecoOptimize/ecoOptimizeWorkerClient';

export type AnalysisSessionValue = SessionState & {
  processedCount: number;
  canDownload: boolean;
  setInitialTab: (tab: AnalysisKind) => void;
  setRgbThreshold: (value: number) => void;
  setCmykInkThreshold: (value: number) => void;
  setCmykIncludeAnnotations: (value: boolean) => void;
  setPickerPageIndex: (index: number) => void;
  setColorPicks: (picks: ColorPick[] | ((prev: ColorPick[]) => ColorPick[])) => void;
  setCurrentColorPick: (
    pick: ColorPick | null | ((prev: ColorPick | null) => ColorPick | null),
  ) => void;
  setEcoOptions: (options: Partial<EcoOptions>) => void;
  optimizeInk: () => Promise<void>;
  ensureEcoPreview: (side: EcoPreviewSide, page: number, dpi?: number) => void;
  retryEcoPreview: (side: EcoPreviewSide, page: number) => void;
  handleFileSelected: (file: File) => void;
  handleTabChange: (tab: AnalysisKind) => void;
  handleHistorySelect: (entry: HistoryEntry) => void;
  handleHistoryDelete: (entry: HistoryEntry) => void;
  handleHistoryClose: () => void;
  reanalyze: () => void;
  reset: () => void;
  download: () => void;
  clearUploadError: () => void;
};

export function useAnalysisSession(): AnalysisSessionValue {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createInitialState);
  const epochRef = useRef(createRunnerEpoch());
  const stateRef = useRef(state);
  stateRef.current = state;

  // After upload with eco as initial tab, run safety (optimize does not auto-run).
  useEffect(() => {
    if (!state.fileBytes || !state.pages) return;
    if (state.activeTab !== ANALYSIS_KINDS.ECO) return;
    if (state.eco.safety != null) return;
    if (state.tabs.eco.status === 'running') return;
    ensureTabAnalysis(ANALYSIS_KINDS.ECO, {
      pages: state.pages,
      fileBytes: state.fileBytes,
      file: state.file,
    });
    // ensureTabAnalysis is stable enough via deps below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fileBytes, state.pages, state.activeTab, state.eco.safety, state.tabs.eco.status]);

  useEffect(() => {
    setEcoClientHandlers({
      onSafety: (safety) => dispatch({ type: 'ECO_SAFETY_CHECKED', safety }),
      onProgress: (progress) => dispatch({ type: 'ECO_OPTIMIZE_PROGRESS', progress }),
      onOptimizeDone: (payload) => {
        const downloadUrl = URL.createObjectURL(payload.blob);
        dispatch({
          type: 'ECO_OPTIMIZE_DONE',
          result: {
            downloadUrl,
            outputSize: payload.outputSize,
            notes: payload.notes,
          },
          beforeInk: payload.beforeInk,
          afterInk: payload.afterInk,
        });
      },
      onOptimizeFailed: (message) => dispatch({ type: 'ECO_OPTIMIZE_FAILED', error: message }),
      onOptimizeCancelled: () => dispatch({ type: 'ECO_OPTIMIZE_CANCELLED' }),
      onPreviewReady: (side, page, blob) => {
        const url = URL.createObjectURL(blob);
        dispatch({ type: 'ECO_PREVIEW_PAGE_READY', side, page, url });
      },
      onPreviewFailed: (side, page, message) =>
        dispatch({ type: 'ECO_PREVIEW_PAGE_FAILED', side, page, message }),
    });
  }, []);

  const tabRunContext = useCallback(
    (overrides?: Partial<Pick<TabRunContext, 'pages' | 'fileBytes' | 'file'>>): TabRunContext => ({
      pages: overrides?.pages !== undefined ? overrides.pages : state.pages,
      fileBytes: overrides?.fileBytes !== undefined ? overrides.fileBytes : state.fileBytes,
      file: overrides?.file !== undefined ? overrides.file : state.file,
      thresholds: state.thresholds,
      cmykIncludeAnnotations: state.cmykIncludeAnnotations,
      epoch: epochRef.current,
    }),
    [state.file, state.fileBytes, state.pages, state.thresholds, state.cmykIncludeAnnotations],
  );

  const ensureEcoSafety = useCallback(async (fileBytes: ArrayBuffer) => {
    // Safety check is the one eco action that auto-runs on tab entry.
    await cacheEcoFile(fileBytes);
    await runEcoSafetyCheck();
  }, []);

  const ensureTabAnalysis = useCallback(
    (tab: AnalysisKind, ctx: { pages: string[] | null; fileBytes: ArrayBuffer | null; file: File | null }) => {
      const snapshot = {
        inkCoverage: state.inkCoverage,
        profileResult: state.profileResult,
        pages: state.pages,
        bwPages: state.bwPages,
        colorPages: state.colorPages,
        ecoReady: state.eco.safety != null,
      };
      if (tabAnalysisSettled(tab, state.tabs[tab].status, snapshot)) return;
      if (!tabNeedsMet(tab, ctx)) return;

      if (tab === ANALYSIS_KINDS.PICKER) {
        markPickerReady(dispatch);
        return;
      }

      if (tab === ANALYSIS_KINDS.ECO) {
        if (!ctx.fileBytes) return;
        dispatch({ type: 'ECO_SAFETY_START' });
        void ensureEcoSafety(ctx.fileBytes).catch((err) => {
          dispatch({
            type: 'ECO_SAFETY_FAILED',
            error: err instanceof Error ? err.message : String(err),
          });
        });
        return;
      }

      runAnalysisKind(dispatch, tab, tabRunContext(ctx));
    },
    [
      state.bwPages,
      state.colorPages,
      state.eco.safety,
      state.inkCoverage,
      state.pages,
      state.profileResult,
      state.tabs,
      tabRunContext,
      ensureEcoSafety,
    ],
  );

  const handleFileSelected = useCallback(
    (file: File) => {
      void resetEcoWorker().catch(() => {
        /* Workers unavailable in some test environments */
      });
      void processPdfFile(
        dispatch,
        epochRef.current,
        file,
        state.initialTab,
        state.thresholds,
        state.cmykIncludeAnnotations,
      );
    },
    [state.initialTab, state.thresholds, state.cmykIncludeAnnotations],
  );

  const handleTabChange = useCallback(
    (tab: AnalysisKind) => {
      dispatch({ type: 'SET_ACTIVE_TAB', tab });
      ensureTabAnalysis(tab, {
        pages: state.pages,
        fileBytes: state.fileBytes,
        file: state.file,
      });
    },
    [ensureTabAnalysis, state.file, state.fileBytes, state.pages],
  );

  const optimizeInk = useCallback(async () => {
    if (!state.fileBytes || state.eco.phase === 'optimize' || state.eco.phase === 'safety') return;
    if (!state.eco.safety || state.eco.safety.error || state.eco.safety.encrypted) return;
    dispatch({ type: 'ECO_OPTIMIZE_START' });
    // Failures arrive only via onOptimizeFailed handler — do not catch/re-dispatch.
    await startEcoOptimize(state.eco.options);
  }, [state.eco.options, state.eco.phase, state.eco.safety, state.fileBytes]);

  const ensureEcoPreview = useCallback((side: EcoPreviewSide, page: number, dpi?: number) => {
    requestPreviewPage(side, page, dpi);
  }, []);

  const retryEcoPreview = useCallback((side: EcoPreviewSide, page: number) => {
    dispatch({ type: 'ECO_PREVIEW_CLEAR_ERROR', side, page });
    clearPreviewInFlight(side, page);
    requestPreviewPage(side, page);
  }, []);

  const reanalyze = useCallback(() => {
    if (!state.file) return;
    const tab = state.activeTab;
    if (tab === ANALYSIS_KINDS.PICKER) {
      dispatch({ type: 'CLEAR_PICKER' });
      return;
    }
    if (tab === ANALYSIS_KINDS.ECO) {
      void optimizeInk();
      return;
    }
    runAnalysisKind(dispatch, tab, tabRunContext());
  }, [state.activeTab, state.file, tabRunContext, optimizeInk]);

  const reset = useCallback(() => {
    epochRef.current.bumpEpoch();
    try {
      cancelEcoOptimize();
    } catch {
      /* ignore */
    }
    void resetEcoWorker().catch(() => {
      /* Workers unavailable in some test environments */
    });
    // RESET rebuilds eco slice (preserving options) and revokes eco blob URLs.
    dispatch({ type: 'RESET' });
  }, []);

  const exportPayload = useMemo(
    () =>
      exportActiveTab({
        activeTab: state.activeTab,
        pages: state.pages,
        thresholds: state.thresholds,
        bwPages: state.bwPages,
        colorPages: state.colorPages,
        inkCoverage: state.inkCoverage,
        profileResult: state.profileResult,
        colorPicks: state.colorPicks,
        verdictFor: (c, m, y) => cmykPageVerdict(c, m, y, state.thresholds.cmykInk),
      }),
    [state],
  );

  const download = useCallback(() => {
    if (state.activeTab === ANALYSIS_KINDS.ECO) {
      const url = state.eco.result?.downloadUrl;
      if (!url) return;
      const link = document.createElement('a');
      link.href = url;
      link.download = (state.file?.name?.replace(/\.pdf$/i, '') || 'document') + '-save-ink.pdf';
      link.click();
      return;
    }
    if (exportPayload) downloadExport(exportPayload);
  }, [exportPayload, state.activeTab, state.eco.result?.downloadUrl, state.file?.name]);

  useEffect(() => {
    const entry = state.selectedHistoryEntry;
    if (!entry) return;
    dispatch({ type: 'SET_INITIAL_TAB', tab: entry.mode });
    if (entry.mode === ANALYSIS_KINDS.RGB) {
      dispatch({ type: 'SET_RGB_THRESHOLD', value: entry.threshold });
    }
    if (entry.mode === ANALYSIS_KINDS.CMYK && typeof entry.cmykInkThreshold === 'number') {
      dispatch({ type: 'SET_CMYK_THRESHOLD', value: entry.cmykInkThreshold });
    }
  }, [state.selectedHistoryEntry]);

  const processedCount =
    state.activeTab === ANALYSIS_KINDS.RGB
      ? state.tabs.rgb.progress
      : state.activeTab === ANALYSIS_KINDS.CMYK
        ? state.inkCoverage.length
        : state.activeTab === ANALYSIS_KINDS.ECO
          ? state.eco.progress?.current ?? 0
          : 0;

  const canDownload =
    state.activeTab === ANALYSIS_KINDS.ECO
      ? state.eco.result?.downloadUrl != null
      : exportPayload != null;

  return {
    ...state,
    processedCount,
    canDownload,
    setInitialTab: (tab) => dispatch({ type: 'SET_INITIAL_TAB', tab }),
    setRgbThreshold: (value) => dispatch({ type: 'SET_RGB_THRESHOLD', value }),
    setCmykInkThreshold: (value) => dispatch({ type: 'SET_CMYK_THRESHOLD', value }),
    setCmykIncludeAnnotations: (value) =>
      dispatch({ type: 'SET_CMYK_INCLUDE_ANNOTATIONS', value }),
    setPickerPageIndex: (index) => dispatch({ type: 'SET_PICKER_PAGE', index }),
    setColorPicks: (picks) => {
      const next = typeof picks === 'function' ? picks(stateRef.current.colorPicks) : picks;
      dispatch({ type: 'SET_COLOR_PICKS', picks: next });
    },
    setCurrentColorPick: (pick) => {
      const next =
        typeof pick === 'function' ? pick(stateRef.current.currentColorPick) : pick;
      dispatch({ type: 'SET_CURRENT_PICK', pick: next });
    },
    setEcoOptions: (options) => dispatch({ type: 'SET_ECO_OPTIONS', options }),
    optimizeInk,
    ensureEcoPreview,
    retryEcoPreview,
    handleFileSelected,
    handleTabChange,
    handleHistorySelect: (entry) => dispatch({ type: 'TOGGLE_SELECTED_HISTORY', entry }),
    handleHistoryDelete: (entry) => {
      dispatch({ type: 'SET_HISTORY', history: deleteHistoryEntry(entry.fileHash) });
      if (state.selectedHistoryEntry?.fileHash === entry.fileHash) {
        dispatch({ type: 'SET_SELECTED_HISTORY', entry: null });
      }
    },
    handleHistoryClose: () => dispatch({ type: 'SET_SELECTED_HISTORY', entry: null }),
    reanalyze,
    reset,
    download,
    clearUploadError: () => dispatch({ type: 'SET_UPLOAD_ERROR', error: null }),
  };
}
