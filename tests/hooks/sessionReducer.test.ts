import { describe, expect, it } from 'vitest';
import {
  UPLOAD_ERROR_MESSAGE,
  createInitialState,
  sessionReducer,
  type SessionState,
} from '@/features/session/sessionReducer';
import { ANALYSIS_KINDS, TAB_STATUS } from '@/lib/constants';
import type { HistoryEntry } from '@/types/history';

function makeHistoryEntry(): HistoryEntry {
  return {
    fileHash: 'abc',
    fileName: 'test.pdf',
    mode: ANALYSIS_KINDS.RGB,
    threshold: 0.01,
    totalPages: 1,
    bwPages: [0],
    colorPages: [],
    analyzedAt: 1,
  };
}

function loadedState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    ...createInitialState(),
    file: new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
    fileBytes: new ArrayBuffer(8),
    pages: ['data:image/png;base64,abc'],
    bwPages: [0],
    tabs: {
      ...createInitialState().tabs,
      rgb: { status: TAB_STATUS.DONE, progress: 1, error: null },
    },
    ...overrides,
  };
}

describe('sessionReducer', () => {
  it('RESET preserves thresholds, history, and initialTab; clears pages', () => {
    const history = [makeHistoryEntry()];
    let state = loadedState({
      history,
      initialTab: ANALYSIS_KINDS.CMYK,
      thresholds: { rgb: 0.05, cmykInk: 1.2 },
    });

    state = sessionReducer(state, { type: 'RESET' });

    expect(state.pages).toBeNull();
    expect(state.file).toBeNull();
    expect(state.bwPages).toEqual([]);
    expect(state.thresholds).toEqual({ rgb: 0.05, cmykInk: 1.2 });
    expect(state.cmykIncludeAnnotations).toBe(false);
    expect(state.history).toEqual(history);
    expect(state.initialTab).toBe(ANALYSIS_KINDS.CMYK);
  });

  it('FILE_PROCESS_FAILED sets uploadError and clears processing', () => {
    let state = createInitialState();
    state = sessionReducer(state, { type: 'START_FILE_PROCESSING', initialTab: ANALYSIS_KINDS.RGB });
    state = sessionReducer(state, {
      type: 'FILE_LOADED',
      file: new File(['x'], 'bad.pdf', { type: 'application/pdf' }),
      fileBytes: new ArrayBuffer(4),
      pages: ['data:'],
    });
    state = sessionReducer(state, { type: 'FILE_PROCESS_FAILED' });

    expect(state.uploadError).toBe(UPLOAD_ERROR_MESSAGE);
    expect(state.isProcessing).toBe(false);
    expect(state.pages).toBeNull();
  });
});
