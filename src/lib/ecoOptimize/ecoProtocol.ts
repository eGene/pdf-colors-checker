import type {
  DocumentSafety,
  EcoOptions,
  EcoPreviewSide,
  EcoProgress,
  InkPlateTotals,
} from '@/types/ecoOptimize';

export type EcoWorkerRequest =
  | { id: number; type: 'CACHE_FILE'; bytes: ArrayBuffer }
  | { id: number; type: 'SAFETY_CHECK' }
  | { id: number; type: 'OPTIMIZE'; options: EcoOptions; epoch: number }
  | { id: number; type: 'CANCEL'; epoch: number }
  | {
      id: number;
      type: 'PREVIEW_PAGE';
      side: EcoPreviewSide;
      page: number;
      dpi?: number;
    }
  | { id: number; type: 'RESET'; scope: 'file' };

export type EcoWorkerResponse =
  | { id: number; type: 'CACHE_FILE_DONE' }
  | { id: number; type: 'SAFETY_CHECKED'; safety: DocumentSafety }
  | { id: number; type: 'OPTIMIZE_PROGRESS'; progress: EcoProgress; epoch: number }
  | {
      id: number;
      type: 'OPTIMIZE_DONE';
      epoch: number;
      outputSize: number;
      beforeInk: InkPlateTotals;
      afterInk: InkPlateTotals;
      notes: string[];
      blob: Blob;
    }
  | { id: number; type: 'OPTIMIZE_FAILED'; message: string; epoch: number }
  | { id: number; type: 'OPTIMIZE_CANCELLED'; epoch: number }
  | { id: number; type: 'CANCELLED'; epoch: number }
  | {
      id: number;
      type: 'PREVIEW_PAGE_READY';
      side: EcoPreviewSide;
      page: number;
      blob: Blob;
    }
  | {
      id: number;
      type: 'PREVIEW_PAGE_FAILED';
      side: EcoPreviewSide;
      page: number;
      message: string;
    }
  | { id: number; type: 'RESET_DONE'; scope: 'file' }
  | { id: number; type: 'ERROR'; message: string };

export function isEcoWorkerResponse(msg: unknown): msg is EcoWorkerResponse {
  return Boolean(msg && typeof msg === 'object' && 'type' in msg && 'id' in msg);
}
