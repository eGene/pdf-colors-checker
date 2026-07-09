import loadGhostscript from '@okathira/ghostpdl-wasm';
import type { GhostscriptModule } from '@okathira/ghostpdl-wasm';
import gsWasmUrl from '@okathira/ghostpdl-wasm/gs.wasm?url';

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

function inkcovArgs(includeAnnotations: boolean): string[] {
  return [
    '-sDEVICE=inkcov',
    `-dShowAnnots=${includeAnnotations ? 'true' : 'false'}`,
    '-q',
    '-o',
    '-',
    'input.pdf',
  ];
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
      locateFile: (path) => (path.endsWith('.wasm') ? gsWasmUrl : path),
    });
  }
  return gsModulePromise!;
}

function gsExitStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === 'number') return status;
  }
  const msg = String((error as Error)?.message || error);
  const exitMatch = msg.match(/exit(?: code)?[:= ]+(\d+)/i) || msg.match(/ExitStatus[^0-9]*(\d+)/);
  if (exitMatch) return Number(exitMatch[1]);
  return null;
}

function gsRunSucceeded(error: unknown): boolean {
  if (!error) return true;
  const status = gsExitStatus(error);
  if (status != null) return status === 0;
  const msg = String((error as Error)?.message || error);
  return msg.includes('Program terminated') && !/exit code 1|exit\(1\)/i.test(msg);
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
    mod.callMain(inkcovArgs(job.includeAnnotations));
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
