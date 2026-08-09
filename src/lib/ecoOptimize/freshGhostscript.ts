/**
 * Fresh Ghostscript module instance per pass.
 * Caches only the compiled WebAssembly.Module — never a runtime instance.
 */
import loadGhostscript from '@okathira/ghostpdl-wasm';
import type { GhostscriptModule } from '@okathira/ghostpdl-wasm';
import gsWasmUrl from '@okathira/ghostpdl-wasm/gs.wasm?url';
import { gsRunSucceeded } from '@/lib/ghostscript/gsErrors';

let compiledModule: WebAssembly.Module | null = null;
let compiledModulePromise: Promise<WebAssembly.Module> | null = null;

async function getCompiledModule(): Promise<WebAssembly.Module> {
  if (compiledModule) return compiledModule;
  if (!compiledModulePromise) {
    compiledModulePromise = (async () => {
      const response = await fetch(gsWasmUrl);
      if (!response.ok) throw new Error(`Failed to fetch Ghostscript WASM (${response.status})`);
      const bytes = await response.arrayBuffer();
      compiledModule = await WebAssembly.compile(bytes);
      return compiledModule;
    })();
  }
  return compiledModulePromise;
}

export interface FreshGsJobResult {
  ok: boolean;
  stdout: string[];
  outputPdf: Uint8Array | null;
}

export async function runFreshGhostscriptJob(
  args: string[],
  inputPdf: Uint8Array,
  opts?: { readOutputFile?: string },
): Promise<FreshGsJobResult> {
  const stdout: string[] = [];
  const wasmModule = await getCompiledModule();
  const mod: GhostscriptModule = await loadGhostscript({
    print: (text: string) => {
      stdout.push(String(text));
    },
    printErr: (text: string) => {
      stdout.push(`Error: ${text}`);
      console.error(text);
    },
    locateFile: (path: string) => (path.endsWith('.wasm') ? gsWasmUrl : path),
    instantiateWasm: (
      imports: WebAssembly.Imports,
      successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
    ) => {
      void WebAssembly.instantiate(wasmModule, imports).then((instance) => {
        successCallback(instance, wasmModule);
      });
      return {};
    },
  } as Parameters<typeof loadGhostscript>[0]);

  try {
    mod.FS.writeFile('input.pdf', inputPdf);
    let ok = false;
    try {
      mod.callMain(args);
      ok = true;
    } catch (e) {
      ok = gsRunSucceeded(e);
      if (!ok) console.error('Ghostscript job error', e);
    }

    let outputPdf: Uint8Array | null = null;
    const wantsOutput =
      opts?.readOutputFile !== undefined || args.some((a) => a.includes('OutputFile=output.pdf'));
    if (ok && wantsOutput) {
      const outName = opts?.readOutputFile ?? 'output.pdf';
      try {
        const data = mod.FS.readFile(outName, { encoding: 'binary' }) as Uint8Array;
        outputPdf = new Uint8Array(data);
      } catch {
        ok = false;
      }
    }

    try {
      mod.FS.unlink('input.pdf');
    } catch {
      /* ignore */
    }
    try {
      mod.FS.unlink('output.pdf');
    } catch {
      /* ignore */
    }

    return { ok, stdout, outputPdf };
  } finally {
    // Release instance promptly — do not pool.
  }
}
