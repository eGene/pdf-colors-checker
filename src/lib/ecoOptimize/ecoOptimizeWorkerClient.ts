import type {
  DocumentSafety,
  EcoOptions,
  EcoPreviewSide,
  EcoProgress,
  InkPlateTotals,
} from '@/types/ecoOptimize';
import { releaseGhostscriptModule } from '@/lib/ghostscript/ghostscriptWorker';
import {
  isEcoWorkerResponse,
  type EcoWorkerRequest,
  type EcoWorkerResponse,
} from '@/lib/ecoOptimize/ecoProtocol';

export type EcoClientHandlers = {
  onSafety?: (safety: DocumentSafety) => void;
  onProgress?: (progress: EcoProgress) => void;
  onOptimizeDone?: (payload: {
    blob: Blob;
    outputSize: number;
    beforeInk: InkPlateTotals;
    afterInk: InkPlateTotals;
    notes: string[];
  }) => void;
  onOptimizeFailed?: (message: string) => void;
  onOptimizeCancelled?: () => void;
  onPreviewReady?: (side: EcoPreviewSide, page: number, blob: Blob) => void;
  onPreviewFailed?: (side: EcoPreviewSide, page: number, message: string) => void;
};

let worker: Worker | null = null;
let nextId = 1;
let optimizeEpoch = 0;
let afterGateClosed = false;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
const inFlightPreviews = new Set<string>();
let handlers: EcoClientHandlers = {};

function handleResponse(msg: EcoWorkerResponse) {
  const id = msg.id;

  switch (msg.type) {
    case 'OPTIMIZE_PROGRESS':
      if (msg.epoch === optimizeEpoch) handlers.onProgress?.(msg.progress);
      return;
    case 'PREVIEW_PAGE_READY':
      inFlightPreviews.delete(`${msg.side}:${msg.page}`);
      handlers.onPreviewReady?.(msg.side, msg.page, msg.blob);
      pending.get(id)?.resolve(undefined);
      pending.delete(id);
      return;
    case 'PREVIEW_PAGE_FAILED':
      inFlightPreviews.delete(`${msg.side}:${msg.page}`);
      handlers.onPreviewFailed?.(msg.side, msg.page, msg.message);
      pending.get(id)?.resolve(undefined);
      pending.delete(id);
      return;
    case 'OPTIMIZE_DONE':
      afterGateClosed = false;
      if (msg.epoch !== optimizeEpoch) {
        pending.get(id)?.resolve(undefined);
        pending.delete(id);
        return;
      }
      handlers.onOptimizeDone?.({
        blob: msg.blob,
        outputSize: msg.outputSize,
        beforeInk: msg.beforeInk,
        afterInk: msg.afterInk,
        notes: msg.notes,
      });
      // Handlers are the sole completion channel — resolve, never reject.
      pending.get(id)?.resolve(undefined);
      pending.delete(id);
      return;
    case 'OPTIMIZE_FAILED':
      afterGateClosed = false;
      if (msg.epoch !== optimizeEpoch) {
        pending.get(id)?.resolve(undefined);
        pending.delete(id);
        return;
      }
      handlers.onOptimizeFailed?.(msg.message);
      pending.get(id)?.resolve(undefined);
      pending.delete(id);
      return;
    case 'OPTIMIZE_CANCELLED':
    case 'CANCELLED':
      afterGateClosed = false;
      handlers.onOptimizeCancelled?.();
      pending.get(id)?.resolve(undefined);
      pending.delete(id);
      return;
    case 'SAFETY_CHECKED':
      handlers.onSafety?.(msg.safety);
      pending.get(id)?.resolve(msg.safety);
      pending.delete(id);
      return;
    case 'ERROR':
      pending.get(id)?.reject(new Error(msg.message));
      pending.delete(id);
      return;
    default:
      pending.get(id)?.resolve(msg);
      pending.delete(id);
  }
}

function getWorker(): Worker {
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not available in this environment');
  }
  if (!worker) {
    worker = new Worker(new URL('./ecoOptimize.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent) => {
      if (!isEcoWorkerResponse(ev.data)) return;
      handleResponse(ev.data);
    };
  }
  return worker;
}

function request<T = unknown>(payload: EcoWorkerRequest): Promise<T> {
  const w = getWorker();
  return new Promise<T>((resolve, reject) => {
    pending.set(payload.id, {
      resolve: resolve as (v: unknown) => void,
      reject,
    });
    w.postMessage(payload);
  });
}

function nextRequestId(): number {
  return nextId++;
}

export function setEcoClientHandlers(next: EcoClientHandlers) {
  handlers = next;
}

export async function cacheEcoFile(fileBytes: ArrayBuffer): Promise<void> {
  await request({ id: nextRequestId(), type: 'CACHE_FILE', bytes: fileBytes.slice(0) });
}

export async function runEcoSafetyCheck(): Promise<DocumentSafety> {
  return request<DocumentSafety>({ id: nextRequestId(), type: 'SAFETY_CHECK' });
}

export async function startEcoOptimize(options: EcoOptions): Promise<void> {
  releaseGhostscriptModule();
  afterGateClosed = true;
  for (const key of [...inFlightPreviews]) {
    if (key.startsWith('after:')) inFlightPreviews.delete(key);
  }
  optimizeEpoch += 1;
  const epoch = optimizeEpoch;
  await request({ id: nextRequestId(), type: 'OPTIMIZE', options, epoch });
}

export function cancelEcoOptimize(): void {
  optimizeEpoch += 1;
  afterGateClosed = false;
  if (typeof Worker === 'undefined' || !worker) return;
  void request({ id: nextRequestId(), type: 'CANCEL', epoch: optimizeEpoch });
}

export function requestPreviewPage(side: EcoPreviewSide, page: number, dpi?: number): void {
  if (side === 'after' && afterGateClosed) return;
  const key = `${side}:${page}`;
  if (inFlightPreviews.has(key)) return;
  inFlightPreviews.add(key);
  void request({ id: nextRequestId(), type: 'PREVIEW_PAGE', side, page, dpi });
}

export function clearPreviewInFlight(side: EcoPreviewSide, page: number): void {
  inFlightPreviews.delete(`${side}:${page}`);
}

export async function resetEcoWorker(): Promise<void> {
  inFlightPreviews.clear();
  afterGateClosed = false;
  optimizeEpoch += 1;
  if (typeof Worker === 'undefined') return;
  if (!worker) return;
  await request({ id: nextRequestId(), type: 'RESET', scope: 'file' });
}
