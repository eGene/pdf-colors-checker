import type { ReactNode } from 'react';
import type { InkCoverageRow } from '@/types/analysis';

export interface RgbThresholdFieldProps {
  rgbThreshold: number;
  setRgbThreshold: (value: number) => void;
  idPrefix?: string;
}

export interface CmykThresholdFieldProps {
  cmykInkThreshold: number;
  setCmykInkThreshold: (value: number) => void;
  idPrefix?: string;
}

export interface CmykIncludeAnnotationsFieldProps {
  includeAnnotations: boolean;
  setIncludeAnnotations: (value: boolean) => void;
  idPrefix?: string;
}

export interface ProcessingViewProps {
  label: string | null;
  processedCount: number;
  totalCount: number | null;
}

export interface PageThumbnailProps {
  src: string;
  pageNumber: number;
  variant?: 'bw' | 'color';
}

export interface ResultsShellProps {
  children: ReactNode;
}

export interface InkBarProps {
  value: number;
  colorClass: string;
}

export interface ColorSwatchRowProps {
  label: string;
  value: string;
}

export interface CurrentPickState {
  clientX: number;
  clientY: number;
  pageIndex: number;
  pixelX: number;
  pixelY: number;
  hex: string;
  isTouch: boolean;
}

export type { InkCoverageRow };
