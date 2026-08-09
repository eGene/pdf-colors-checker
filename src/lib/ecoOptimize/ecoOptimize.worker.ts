import type { EcoWorkerRequest, EcoWorkerResponse } from '@/lib/ecoOptimize/ecoProtocol';
import { checkDocumentSafety } from '@/lib/analysis/ecoSafetyCheck';
import { runEcoOptimize } from '@/lib/analysis/ecoRunner';
import { openPdfDocument, renderSinglePage } from '@/lib/ecoFlatten/renderPages';
import type { DocumentSafety, EcoProgress } from '@/types/ecoOptimize';

type PdfDoc = Awaited<ReturnType<typeof openPdfDocument>>;

let originalBytes: Uint8Array | null = null;
let afterBytes: Uint8Array | null = null;
let cachedSafety: DocumentSafety | null = null;
let beforeDoc: PdfDoc | null = null;
let afterDoc: PdfDoc | null = null;
let runEpoch = 0;
let previewDpi = 120;

function post(msg: EcoWorkerResponse) {
  self.postMessage(msg);
}

async function destroyDoc(doc: PdfDoc | null) {
  if (!doc) return;
  try {
    await doc.destroy();
  } catch {
    /* ignore */
  }
}

async function ensureBeforeDoc() {
  if (beforeDoc || !originalBytes) return;
  beforeDoc = await openPdfDocument(originalBytes);
}

async function ensureAfterDoc() {
  if (afterDoc || !afterBytes) return;
  afterDoc = await openPdfDocument(afterBytes);
}

/** Single-flight queue — prevent CACHE/OPTIMIZE/PREVIEW races on shared docs. */
const queue: EcoWorkerRequest[] = [];
let draining = false;

self.onmessage = (ev: MessageEvent<EcoWorkerRequest>) => {
  const msg = ev.data;
  // Cancel/reset must bump epoch immediately so in-flight OPTIMIZE sees isCancelled()
  // even while the single-flight queue is blocked on callMain / font work.
  if (msg.type === 'CANCEL') {
    runEpoch = Math.max(runEpoch, msg.epoch);
  } else if (msg.type === 'RESET') {
    runEpoch += 1;
  }
  queue.push(msg);
  void drain();
};

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const msg = queue.shift()!;
      await handle(msg);
    }
  } finally {
    draining = false;
    if (queue.length) void drain();
  }
}

async function handle(msg: EcoWorkerRequest) {
  try {
    switch (msg.type) {
      case 'CACHE_FILE': {
        originalBytes = new Uint8Array(msg.bytes.slice(0));
        cachedSafety = null;
        afterBytes = null;
        await destroyDoc(beforeDoc);
        await destroyDoc(afterDoc);
        beforeDoc = null;
        afterDoc = null;
        post({ id: msg.id, type: 'CACHE_FILE_DONE' });
        break;
      }
      case 'SAFETY_CHECK': {
        if (!originalBytes) throw new Error('No PDF cached');
        cachedSafety = await checkDocumentSafety(originalBytes);
        post({ id: msg.id, type: 'SAFETY_CHECKED', safety: cachedSafety });
        break;
      }
      case 'CANCEL': {
        // Epoch already bumped in onmessage for cooperative cancel.
        post({ id: msg.id, type: 'CANCELLED', epoch: msg.epoch });
        break;
      }
      case 'OPTIMIZE': {
        if (!originalBytes) throw new Error('No PDF cached');
        if (!cachedSafety || cachedSafety.error || cachedSafety.encrypted) {
          throw new Error(
            cachedSafety?.error ?? 'Document safety check required before optimize',
          );
        }
        const epoch = msg.epoch;
        // Don't clobber a newer cancel/reset that arrived while this job was queued.
        if (runEpoch > epoch) {
          post({ id: msg.id, type: 'OPTIMIZE_CANCELLED', epoch });
          break;
        }
        runEpoch = epoch;
        const result = await runEcoOptimize(originalBytes, msg.options, cachedSafety, {
          onProgress: (progress: EcoProgress) => {
            if (runEpoch !== epoch) return;
            post({ id: msg.id, type: 'OPTIMIZE_PROGRESS', progress, epoch });
          },
          isCancelled: () => runEpoch !== epoch,
        });
        if (runEpoch !== epoch) {
          post({ id: msg.id, type: 'OPTIMIZE_CANCELLED', epoch });
          break;
        }
        afterBytes = result.output.slice();
        await destroyDoc(afterDoc);
        afterDoc = null;
        const copy = afterBytes.slice();
        const blob = new Blob([copy], { type: 'application/pdf' });
        post({
          id: msg.id,
          type: 'OPTIMIZE_DONE',
          epoch,
          outputSize: result.outputSize,
          beforeInk: result.beforeInk,
          afterInk: result.afterInk,
          notes: result.notes,
          blob,
        });
        break;
      }
      case 'PREVIEW_PAGE': {
        const dpi = msg.dpi ?? previewDpi;
        previewDpi = dpi;
        if (msg.side === 'before') {
          if (!originalBytes) {
            // CACHE_FILE still in flight ahead of us was reordered — fail soft for client retry.
            throw new Error('Before document unavailable');
          }
          await ensureBeforeDoc();
          if (!beforeDoc) throw new Error('Before document unavailable');
          const blob = await renderSinglePage(beforeDoc, msg.page, dpi);
          post({ id: msg.id, type: 'PREVIEW_PAGE_READY', side: 'before', page: msg.page, blob });
        } else {
          if (!afterBytes) {
            throw new Error('After document unavailable');
          }
          await ensureAfterDoc();
          if (!afterDoc) throw new Error('After document unavailable');
          const blob = await renderSinglePage(afterDoc, msg.page, dpi);
          post({ id: msg.id, type: 'PREVIEW_PAGE_READY', side: 'after', page: msg.page, blob });
        }
        break;
      }
      case 'RESET': {
        await destroyDoc(beforeDoc);
        await destroyDoc(afterDoc);
        beforeDoc = null;
        afterDoc = null;
        originalBytes = null;
        afterBytes = null;
        cachedSafety = null;
        // Epoch already bumped in onmessage for cooperative cancel.
        post({ id: msg.id, type: 'RESET_DONE', scope: 'file' });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'cancelled' || (err instanceof Error && err.name === 'EcoCancelled')) {
      post({ id: msg.id, type: 'OPTIMIZE_CANCELLED', epoch: 'epoch' in msg ? msg.epoch : 0 });
      return;
    }
    if (msg.type === 'PREVIEW_PAGE') {
      post({
        id: msg.id,
        type: 'PREVIEW_PAGE_FAILED',
        side: msg.side,
        page: msg.page,
        message,
      });
      return;
    }
    if (msg.type === 'OPTIMIZE') {
      post({ id: msg.id, type: 'OPTIMIZE_FAILED', message, epoch: msg.epoch });
      return;
    }
    post({ id: msg.id, type: 'ERROR', message });
  }
}
