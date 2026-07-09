import { HISTORY_MAX_ENTRIES, HISTORY_STORAGE_KEY, normalizeAnalysisKind } from './constants';
import type { HistoryEntry } from '../types/history';

/** Sort newest first and cap length. */
function trimHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries]
    .sort((a, b) => b.analyzedAt - a.analyzedAt)
    .slice(0, HISTORY_MAX_ENTRIES);
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  const mode = normalizeAnalysisKind(entry.mode);
  if (!mode) return false;
  if (typeof entry.fileHash !== 'string' || !entry.fileHash) return false;
  if (typeof entry.fileName !== 'string') return false;
  if (typeof entry.threshold !== 'number' || !Number.isFinite(entry.threshold)) return false;
  if (typeof entry.totalPages !== 'number' || entry.totalPages < 0) return false;
  if (!Array.isArray(entry.bwPages) || !Array.isArray(entry.colorPages)) return false;
  if (typeof entry.analyzedAt !== 'number' || !Number.isFinite(entry.analyzedAt)) return false;
  if (
    entry.cmykInkThreshold !== undefined &&
    (typeof entry.cmykInkThreshold !== 'number' || !Number.isFinite(entry.cmykInkThreshold))
  ) {
    return false;
  }
  return entry.bwPages.every((n) => typeof n === 'number') &&
    entry.colorPages.every((n) => typeof n === 'number');
}

function normalizeEntry(raw: Record<string, unknown>): HistoryEntry | null {
  if (!isHistoryEntry(raw)) return null;
  const mode = normalizeAnalysisKind(raw.mode)!;
  return {
    fileHash: raw.fileHash,
    fileName: raw.fileName,
    mode,
    threshold: raw.threshold,
    cmykInkThreshold: raw.cmykInkThreshold,
    totalPages: raw.totalPages,
    bwPages: raw.bwPages,
    colorPages: raw.colorPages,
    analyzedAt: raw.analyzedAt,
  };
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const trimmed = trimHistory(
      parsed
        .map((item) => normalizeEntry(item as Record<string, unknown>))
        .filter((entry): entry is HistoryEntry => entry != null),
    );
    if (trimmed.length !== parsed.length) {
      persistHistory(trimmed);
    }
    return trimmed;
  } catch {
    return [];
  }
}

function persistHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

export function saveHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const existing = loadHistory().filter((e) => e.fileHash !== entry.fileHash);
  const next = trimHistory([entry, ...existing]);
  persistHistory(next);
  return next;
}

export function deleteHistoryEntry(fileHash: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.fileHash !== fileHash);
  persistHistory(next);
  return next;
}
