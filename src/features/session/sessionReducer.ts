import {
  ANALYSIS_KINDS,
  DEFAULT_CMYK_COLOR_INK_THRESHOLD,
  TAB_STATUS,
  createInitialTabStates,
} from '@/lib/constants';
import { loadHistory } from '@/lib/analysisHistory';
import type { AnalysisKind, InkCoverageRow, TabState } from '@/types/analysis';
import type { ColorProfileResult } from '@/types/profile';
import type { ColorPick } from '@/types/pdf';
import type { HistoryEntry } from '@/types/history';

export const UPLOAD_ERROR_MESSAGE = 'Could not process this PDF. Please try another file.';

export interface SessionState {
  file: File | null;
  fileBytes: ArrayBuffer | null;
  pages: string[] | null;
  initialTab: AnalysisKind;
  activeTab: AnalysisKind;
  tabs: Record<AnalysisKind, TabState>;
  thresholds: { rgb: number; cmykInk: number };
  cmykIncludeAnnotations: boolean;
  cmykAnnotationNote: string | null;
  bwPages: number[];
  colorPages: number[];
  inkCoverage: InkCoverageRow[];
  profileResult: ColorProfileResult | null;
  pickerPageIndex: number;
  colorPicks: ColorPick[];
  currentColorPick: ColorPick | null;
  isProcessing: boolean;
  processingLabel: string | null;
  uploadError: string | null;
  history: HistoryEntry[];
  selectedHistoryEntry: HistoryEntry | null;
}

export type SessionAction =
  | { type: 'SET_INITIAL_TAB'; tab: AnalysisKind }
  | { type: 'SET_ACTIVE_TAB'; tab: AnalysisKind }
  | { type: 'SET_RGB_THRESHOLD'; value: number }
  | { type: 'SET_CMYK_THRESHOLD'; value: number }
  | { type: 'SET_CMYK_INCLUDE_ANNOTATIONS'; value: boolean }
  | { type: 'SET_CMYK_ANNOTATION_NOTE'; note: string | null }
  | { type: 'SET_UPLOAD_ERROR'; error: string | null }
  | { type: 'START_FILE_PROCESSING'; initialTab: AnalysisKind }
  | { type: 'FILE_LOADED'; file: File; fileBytes: ArrayBuffer; pages: string[] }
  | { type: 'FILE_PROCESS_FAILED' }
  | { type: 'SET_TAB'; tab: AnalysisKind; patch: Partial<TabState> }
  | { type: 'SET_PROCESSING'; isProcessing: boolean; label?: string | null }
  | { type: 'RGB_PROGRESS'; bwPages: number[]; colorPages: number[]; progress: number }
  | { type: 'RGB_DONE'; bwPages: number[]; colorPages: number[] }
  | { type: 'CMYK_ROW'; row: InkCoverageRow }
  | { type: 'CMYK_RESET' }
  | { type: 'CMYK_DONE'; rows: InkCoverageRow[] }
  | { type: 'CMYK_FAILED'; error: string }
  | { type: 'PROFILE_DONE'; result: ColorProfileResult }
  | { type: 'PROFILE_FAILED'; error: string }
  | { type: 'SET_PICKER_PAGE'; index: number }
  | { type: 'SET_COLOR_PICKS'; picks: ColorPick[] }
  | { type: 'SET_CURRENT_PICK'; pick: ColorPick | null }
  | { type: 'CLEAR_PICKER' }
  | { type: 'SET_HISTORY'; history: HistoryEntry[] }
  | { type: 'SET_SELECTED_HISTORY'; entry: HistoryEntry | null }
  | { type: 'TOGGLE_SELECTED_HISTORY'; entry: HistoryEntry }
  | { type: 'RESET' };

export function createInitialState(): SessionState {
  return {
    file: null,
    fileBytes: null,
    pages: null,
    initialTab: ANALYSIS_KINDS.RGB,
    activeTab: ANALYSIS_KINDS.RGB,
    tabs: createInitialTabStates(),
    thresholds: { rgb: 0.01, cmykInk: DEFAULT_CMYK_COLOR_INK_THRESHOLD },
    cmykIncludeAnnotations: false,
    cmykAnnotationNote: null,
    bwPages: [],
    colorPages: [],
    inkCoverage: [],
    profileResult: null,
    pickerPageIndex: 0,
    colorPicks: [],
    currentColorPick: null,
    isProcessing: false,
    processingLabel: null,
    uploadError: null,
    history: loadHistory(),
    selectedHistoryEntry: null,
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_INITIAL_TAB':
      return { ...state, initialTab: action.tab };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_RGB_THRESHOLD':
      return { ...state, thresholds: { ...state.thresholds, rgb: action.value } };
    case 'SET_CMYK_THRESHOLD':
      return { ...state, thresholds: { ...state.thresholds, cmykInk: action.value } };
    case 'SET_CMYK_INCLUDE_ANNOTATIONS':
      return { ...state, cmykIncludeAnnotations: action.value };
    case 'SET_CMYK_ANNOTATION_NOTE':
      return { ...state, cmykAnnotationNote: action.note };
    case 'SET_UPLOAD_ERROR':
      return { ...state, uploadError: action.error };
    case 'START_FILE_PROCESSING':
      return {
        ...createInitialState(),
        history: state.history,
        initialTab: action.initialTab,
        activeTab: action.initialTab,
        thresholds: state.thresholds,
        cmykIncludeAnnotations: state.cmykIncludeAnnotations,
        isProcessing: true,
        uploadError: null,
      };
    case 'FILE_LOADED':
      return {
        ...state,
        file: action.file,
        fileBytes: action.fileBytes,
        pages: action.pages,
      };
    case 'FILE_PROCESS_FAILED':
      return {
        ...state,
        isProcessing: false,
        processingLabel: null,
        uploadError: UPLOAD_ERROR_MESSAGE,
        pages: null,
      };
    case 'SET_TAB':
      return {
        ...state,
        tabs: {
          ...state.tabs,
          [action.tab]: { ...state.tabs[action.tab], ...action.patch },
        },
      };
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.isProcessing,
        processingLabel: action.label !== undefined ? action.label : state.processingLabel,
      };
    case 'RGB_PROGRESS':
      return {
        ...state,
        bwPages: action.bwPages,
        colorPages: action.colorPages,
        tabs: {
          ...state.tabs,
          rgb: { ...state.tabs.rgb, progress: action.progress },
        },
      };
    case 'RGB_DONE':
      return {
        ...state,
        bwPages: action.bwPages,
        colorPages: action.colorPages,
        isProcessing: false,
        processingLabel: null,
        tabs: {
          ...state.tabs,
          rgb: {
            status: TAB_STATUS.DONE,
            progress: action.bwPages.length + action.colorPages.length,
            error: null,
          },
        },
      };
    case 'CMYK_RESET':
      return { ...state, inkCoverage: [], cmykAnnotationNote: null };
    case 'CMYK_ROW':
      return {
        ...state,
        inkCoverage: [...state.inkCoverage, action.row],
        tabs: {
          ...state.tabs,
          cmyk: { ...state.tabs.cmyk, progress: state.inkCoverage.length + 1 },
        },
      };
    case 'CMYK_DONE':
      return {
        ...state,
        inkCoverage: action.rows,
        isProcessing: false,
        processingLabel: null,
        tabs: {
          ...state.tabs,
          cmyk: { status: TAB_STATUS.DONE, progress: action.rows.length, error: null },
        },
      };
    case 'CMYK_FAILED':
      return {
        ...state,
        isProcessing: false,
        processingLabel: null,
        tabs: {
          ...state.tabs,
          cmyk: { status: TAB_STATUS.ERROR, progress: 0, error: action.error },
        },
      };
    case 'PROFILE_DONE':
      return {
        ...state,
        profileResult: action.result,
        isProcessing: false,
        processingLabel: null,
        tabs: {
          ...state.tabs,
          profile: { status: TAB_STATUS.DONE, progress: 0, error: null },
        },
      };
    case 'PROFILE_FAILED':
      return {
        ...state,
        isProcessing: false,
        processingLabel: null,
        tabs: {
          ...state.tabs,
          profile: { status: TAB_STATUS.ERROR, progress: 0, error: action.error },
        },
      };
    case 'SET_PICKER_PAGE':
      return { ...state, pickerPageIndex: action.index };
    case 'SET_COLOR_PICKS':
      return { ...state, colorPicks: action.picks };
    case 'SET_CURRENT_PICK':
      return { ...state, currentColorPick: action.pick };
    case 'CLEAR_PICKER':
      return { ...state, colorPicks: [], currentColorPick: null };
    case 'SET_HISTORY':
      return { ...state, history: action.history };
    case 'SET_SELECTED_HISTORY':
      return { ...state, selectedHistoryEntry: action.entry };
    case 'TOGGLE_SELECTED_HISTORY':
      return {
        ...state,
        selectedHistoryEntry:
          state.selectedHistoryEntry?.fileHash === action.entry.fileHash ? null : action.entry,
      };
    case 'RESET':
      return {
        ...createInitialState(),
        history: state.history,
        thresholds: state.thresholds,
        initialTab: state.initialTab,
        cmykIncludeAnnotations: state.cmykIncludeAnnotations,
      };
    default:
      return state;
  }
}
