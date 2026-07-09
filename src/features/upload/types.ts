import type { AnalysisKind } from '@/types/analysis';

export interface AnalysisParamsProps {
  initialTab: AnalysisKind;
  setInitialTab: (tab: AnalysisKind) => void;
  rgbThreshold: number;
  setRgbThreshold: (value: number) => void;
  cmykInkThreshold?: number;
  setCmykInkThreshold?: (value: number) => void;
  cmykIncludeAnnotations?: boolean;
  setCmykIncludeAnnotations?: (value: boolean) => void;
  idPrefix?: string;
}

export interface RecentAnalysisCardProps {
  entry: import('@/types/history').HistoryEntry;
  selected?: boolean;
  onSelect: (entry: import('@/types/history').HistoryEntry) => void;
  onDelete: (entry: import('@/types/history').HistoryEntry) => void;
}

export interface HistoryDetailPanelProps {
  entry: import('@/types/history').HistoryEntry;
  onClose: () => void;
}
