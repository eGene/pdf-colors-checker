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

  const ensureTabAnalysis = useCallback(
    (tab: AnalysisKind, ctx: { pages: string[] | null; fileBytes: ArrayBuffer | null; file: File | null }) => {
      const snapshot = {
        inkCoverage: state.inkCoverage,
        profileResult: state.profileResult,
        pages: state.pages,
        bwPages: state.bwPages,
        colorPages: state.colorPages,
      };
      if (tabAnalysisSettled(tab, state.tabs[tab].status, snapshot)) return;
      if (!tabNeedsMet(tab, ctx)) return;

      if (tab === ANALYSIS_KINDS.PICKER) {
        markPickerReady(dispatch);
        return;
      }

      runAnalysisKind(dispatch, tab, tabRunContext(ctx));
    },
    [
      state.bwPages,
      state.colorPages,
      state.inkCoverage,
      state.pages,
      state.profileResult,
      state.tabs,
      tabRunContext,
    ],
  );

  const handleFileSelected = useCallback(
    (file: File) => {
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

  const reanalyze = useCallback(() => {
    if (!state.file) return;
    const tab = state.activeTab;
    if (tab === ANALYSIS_KINDS.PICKER) {
      dispatch({ type: 'CLEAR_PICKER' });
      return;
    }
    runAnalysisKind(dispatch, tab, tabRunContext());
  }, [state.activeTab, state.file, tabRunContext]);

  const reset = useCallback(() => {
    epochRef.current.bumpEpoch();
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
    if (exportPayload) downloadExport(exportPayload);
  }, [exportPayload]);

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
        : 0;

  return {
    ...state,
    processedCount,
    canDownload: exportPayload != null,
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
