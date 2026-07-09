import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteHistoryEntry,
  loadHistory,
  saveHistoryEntry,
} from '../../src/lib/analysisHistory';
import { ANALYSIS_KINDS, HISTORY_MAX_ENTRIES, HISTORY_STORAGE_KEY } from '../../src/lib/constants';
import type { HistoryEntry } from '../../src/types/history';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    fileHash: 'abc123',
    fileName: 'test.pdf',
    mode: ANALYSIS_KINDS.RGB,
    threshold: 0.01,
    totalPages: 1,
    bwPages: [0],
    colorPages: [],
    analyzedAt: Date.now(),
    ...overrides,
  };
}

describe('analysisHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when storage is empty', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('returns empty array for corrupt JSON', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, 'not-json');
    expect(loadHistory()).toEqual([]);
  });

  it('filters malformed entries', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        makeEntry(),
        { fileHash: 'bad', mode: 'RGB' },
        { fileName: 'no-hash', mode: 'rgb' },
      ]),
    );
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].fileHash).toBe('abc123');
  });

  it('normalizes legacy uppercase mode on load', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([{ ...makeEntry(), mode: 'RGB' }]),
    );
    expect(loadHistory()[0].mode).toBe(ANALYSIS_KINDS.RGB);
  });

  it('saves and loads an entry', () => {
    const entry = makeEntry();
    saveHistoryEntry(entry);
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].fileName).toBe('test.pdf');
  });

  it('dedupes by fileHash keeping newest', () => {
    saveHistoryEntry(makeEntry({ fileHash: 'same', analyzedAt: 100 }));
    saveHistoryEntry(makeEntry({ fileHash: 'same', analyzedAt: 200, fileName: 'newer.pdf' }));
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].fileName).toBe('newer.pdf');
  });

  it('caps history length', () => {
    for (let i = 0; i < HISTORY_MAX_ENTRIES + 2; i++) {
      saveHistoryEntry(makeEntry({ fileHash: `hash-${i}`, analyzedAt: i }));
    }
    expect(loadHistory()).toHaveLength(HISTORY_MAX_ENTRIES);
  });

  it('deletes by fileHash', () => {
    saveHistoryEntry(makeEntry({ fileHash: 'a' }));
    saveHistoryEntry(makeEntry({ fileHash: 'b' }));
    deleteHistoryEntry('a');
    expect(loadHistory().map((e) => e.fileHash)).toEqual(['b']);
  });
});
