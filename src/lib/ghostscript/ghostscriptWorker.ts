import loadGhostscript from '@okathira/ghostpdl-wasm';
import type { GhostscriptModule } from '@okathira/ghostpdl-wasm';
import gsWasmUrl from '@okathira/ghostpdl-wasm/gs.wasm?url';
import { gsRunSucceeded } from '@/lib/ghostscript/gsErrors';
import { inkcovArgs } from '@/lib/ecoOptimize/gsArgs';

interface GsJob {
  id: number;
  pdfBytes: ArrayBuffer;
  includeAnnotations: boolean;
  responseCallback: (ok: boolean) => void;
  progressCallback: (done: boolean, current: number, total: number) => void;
  statusUpdateCallback: (text: string) => void;
}

export interface GhostscriptInkcovInput {
  pdfBytes: ArrayBuffer;
  includeAnnotations?: boolean;
}

let gsModulePromise: Promise<GhostscriptModule> | undefined;
let activeJob: GsJob | null = null;
let jobSerial = 0;
const jobQueue: GsJob[] = [];
let processing = false;

function gsPrint(text: string): void {
  activeJob?.statusUpdateCallback(text);
}

function gsPrintErr(text: string): void {
  if (!activeJob) return;
  activeJob.statusUpdateCallback(`Error: ${text}`);
  console.error(text);
}

function getGsModule(): Promise<GhostscriptModule> {
  if (!gsModulePromise) {
    gsModulePromise = loadGhostscript({
      print: gsPrint,
      printErr: gsPrintErr,
      // Vite emits a hashed asset; okathira's default import.meta.url + "gs.wasm"
      // would request an unhashed path and get index.html back (SPA fallback).
      locateFile: (path: string) => (path.endsWith('.wasm') ? gsWasmUrl : path),
    });
  }
  return gsModulePromise!;
}

function finishJob(job: GsJob, ok: boolean): void {
  processing = false;
  job.responseCallback(ok);
  if (activeJob?.id === job.id) {
    activeJob = null;
  }
  processQueue();
}

function executeJob(mod: GhostscriptModule, job: GsJob): void {
  activeJob = job;
  job.statusUpdateCallback('CMYK coverage');

  let ok = false;
  try {
    mod.FS.writeFile('input.pdf', new Uint8Array(job.pdfBytes));
    mod.callMain(inkcovArgs({ showAnnots: job.includeAnnotations }));
    ok = true;
  } catch (e) {
    ok = gsRunSucceeded(e);
    const errMsg = String((e as Error)?.message || e);
    if (!ok && /RuntimeError|out of bounds|Aborted/i.test(errMsg)) {
      gsModulePromise = undefined;
    }
    if (!ok) {
      console.error('Ghostscript inkcov error', e);
    }
  } finally {
    try {
      mod.FS.unlink('input.pdf');
    } catch {
      // ignore missing input after failed run
    }
    finishJob(job, ok);
  }
}

function runJob(job: GsJob): void {
  void getGsModule()
    .then((mod) => executeJob(mod, job))
    .catch((e) => {
      console.error('Failed to load Ghostscript WASM', e);
      finishJob(job, false);
    });
}

function processQueue(): void {
  if (processing || jobQueue.length === 0) return;
  processing = true;
  runJob(jobQueue.shift()!);
}

export function cancelGsColorsJobs(): void {
  jobQueue.length = 0;
  processing = false;
  activeJob = null;
}

/**
 * Drop the CMYK tab's singleton module so eco's worker chain does not
 * compete with a growable GS heap on the main thread. Only safe when idle —
 * nulling mid-flight just forces the next queued job to instantiate a second
 * module alongside the live one.
 */
export function releaseGhostscriptModule(): void {
  if (processing || jobQueue.length > 0) return;
  gsModulePromise = undefined;
}

export function runGhostscriptInkcov(
  input: GhostscriptInkcovInput,
  responseCallback: (ok: boolean) => void,
  progressCallback: (done: boolean, current: number, total: number) => void,
  statusUpdateCallback: (text: string) => void,
): void {
  jobQueue.push({
    id: ++jobSerial,
    pdfBytes: input.pdfBytes.slice(0),
    includeAnnotations: input.includeAnnotations === true,
    responseCallback,
    progressCallback,
    statusUpdateCallback,
  });
  processQueue();
}
