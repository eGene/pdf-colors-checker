import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';
import EcoCompareView from '@/features/results/eco/EcoCompareView';
import type { EcoMode, FlattenStyle, ImagesHandling } from '@/types/ecoOptimize';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ResultsEcoTab() {
  const {
    eco,
    setEcoOptions,
    optimizeInk,
    pages,
  } = useAnalysisSessionContext();

  const { options, safety, progress, result, beforeInk, afterInk, error, phase } = eco;
  const optimizing = phase === 'optimize';
  const checking = phase === 'safety';
  const pageCount = pages?.length ?? 0;

  if (safety?.encrypted || safety?.error) {
    return (
      <p className="text-body-md text-error" role="alert">
        {safety.error ?? error}
      </p>
    );
  }

  // Flatten confirmation only gates flatten mode — vector optimize may keep forms (runner allows it).
  const flattenBlocked =
    options.mode === 'flatten' &&
    Boolean(safety?.hasAcroForm) &&
    !options.flattenAcroFormConfirmed;
  const optimizeDisabled = optimizing || checking || !safety || flattenBlocked;

  return (
    <div className="space-y-8">
      {safety && (safety.hasAcroForm || safety.hasSignature) && (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-body-md text-text-primary"
          role="status"
        >
          {safety.hasSignature && (
            <p className="mb-2">
              This PDF is digitally signed — any optimization will invalidate the signature.
            </p>
          )}
          {safety.hasAcroForm && (
            <p>
              This PDF has fillable form fields — optimizing may remove them.
              {options.mode === 'flatten' && (
                <label className="mt-3 flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={options.flattenAcroFormConfirmed}
                    onChange={(e) =>
                      setEcoOptions({ flattenAcroFormConfirmed: e.target.checked })
                    }
                    className="mt-1 cursor-pointer"
                  />
                  <span>I understand flatten will destroy form fields — allow flatten mode.</span>
                </label>
              )}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border-subtle bg-surface p-8 space-y-6">
        <div>
          <h3 className="mb-3 text-label-sm uppercase tracking-widest text-primary">Mode</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            {(
              [
                ['vector', 'Keep text (recommended)'],
                ['flatten', 'Flatten pages (maximum savings)'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 has-[:disabled]:cursor-not-allowed ${
                  options.mode === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border-subtle'
                }`}
              >
                <input
                  type="radio"
                  name="eco-mode"
                  checked={options.mode === value}
                  onChange={() => setEcoOptions({ mode: value as EcoMode })}
                  disabled={optimizing}
                  className="cursor-pointer disabled:cursor-not-allowed"
                />
                <span>
                  <span className="block font-semibold text-text-primary">{label}</span>
                  <span className="mt-1 block text-label-sm text-text-secondary">
                    {value === 'vector'
                      ? 'pdfwrite re-emits the document — PDF/A conformance and tagging are not preserved.'
                      : 'Loses selectable text, links, annotations, bookmarks, forms, tags, XMP, and transparency.'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {options.mode === 'vector' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 text-body-md">
              <input
                type="checkbox"
                checked={options.grayscale}
                onChange={(e) => setEcoOptions({ grayscale: e.target.checked })}
                disabled={optimizing}
                className="cursor-pointer disabled:cursor-not-allowed"
              />
              Grayscale
            </label>
            <label className="flex flex-col gap-1 text-body-md">
              <span>Images</span>
              <select
                value={options.images}
                onChange={(e) =>
                  setEcoOptions({ images: e.target.value as ImagesHandling })
                }
                disabled={optimizing}
                className="cursor-pointer rounded border border-border-subtle bg-surface-container-lowest px-3 py-2 disabled:cursor-not-allowed"
              >
                <option value="keep">Keep</option>
                <option value="downsample">Downsample &amp; recompress</option>
                <option value="remove">Remove</option>
              </select>
            </label>
            {options.images === 'downsample' && (
              <label className="flex flex-col gap-1 text-body-md">
                <span>Image DPI</span>
                <input
                  type="number"
                  min={36}
                  max={200}
                  value={options.imageDpi}
                  onChange={(e) => setEcoOptions({ imageDpi: Number(e.target.value) || 100 })}
                  disabled={optimizing}
                  className="rounded border border-border-subtle bg-surface-container-lowest px-3 py-2 disabled:cursor-not-allowed"
                />
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-body-md sm:col-span-2 has-[:disabled]:cursor-not-allowed">
              <input
                type="checkbox"
                checked={options.ecoFonts}
                onChange={(e) => setEcoOptions({ ecoFonts: e.target.checked })}
                disabled={optimizing}
                className="cursor-pointer disabled:cursor-not-allowed"
              />
              Economy text (fine glyph holes — when fonts are embedded)
            </label>
            {options.ecoFonts && (
              <label className="flex flex-col gap-1 text-body-md">
                <span>Economy text intensity ({Math.round(options.ecoFontIntensity * 100)}%)</span>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={Math.round(options.ecoFontIntensity * 100)}
                  onChange={(e) =>
                    setEcoOptions({ ecoFontIntensity: Number(e.target.value) / 100 })
                  }
                  disabled={optimizing}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary disabled:cursor-not-allowed"
                />
              </label>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-body-md">Style</legend>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ['soft', 'Soft'],
                    ['threshold', 'Threshold'],
                    ['outline', 'Outline'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 text-body-md has-[:disabled]:cursor-not-allowed"
                  >
                    <input
                      type="radio"
                      name="flatten-style"
                      checked={options.flattenStyle === value}
                      onChange={() => setEcoOptions({ flattenStyle: value as FlattenStyle })}
                      disabled={optimizing || flattenBlocked}
                      className="cursor-pointer disabled:cursor-not-allowed"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex cursor-pointer items-center gap-2 text-body-md sm:col-span-2 has-[:disabled]:cursor-not-allowed">
              <input
                type="checkbox"
                checked={options.flattenGrayscale}
                onChange={(e) => setEcoOptions({ flattenGrayscale: e.target.checked })}
                disabled={optimizing || flattenBlocked}
                className="cursor-pointer disabled:cursor-not-allowed"
              />
              Remove color (recommended)
            </label>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-body-md">
                <span>DPI</span>
                <input
                  type="number"
                  min={72}
                  max={300}
                  value={options.flattenDpi}
                  onChange={(e) => setEcoOptions({ flattenDpi: Number(e.target.value) || 150 })}
                  disabled={optimizing || flattenBlocked}
                  className="h-10 rounded border border-border-subtle bg-surface-container-lowest px-3 disabled:cursor-not-allowed"
                />
              </label>
              {options.flattenStyle === 'soft' && (
                <label className="flex flex-col gap-1 text-body-md">
                  <span>Lighten strength ({Math.round(options.flattenSoftStrength * 100)}%)</span>
                  <div className="flex h-10 items-center">
                    <input
                      type="range"
                      min={5}
                      max={80}
                      value={Math.round(options.flattenSoftStrength * 100)}
                      onChange={(e) =>
                        setEcoOptions({ flattenSoftStrength: Number(e.target.value) / 100 })
                      }
                      disabled={optimizing || flattenBlocked}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary disabled:cursor-not-allowed"
                    />
                  </div>
                </label>
              )}
              {options.flattenStyle === 'threshold' && (
                <label className="flex flex-col gap-1 text-body-md">
                  <span>Threshold ({Math.round(options.flattenThreshold * 100)}%)</span>
                  <div className="flex h-10 items-center">
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={Math.round(options.flattenThreshold * 100)}
                      onChange={(e) =>
                        setEcoOptions({ flattenThreshold: Number(e.target.value) / 100 })
                      }
                      disabled={optimizing || flattenBlocked}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary disabled:cursor-not-allowed"
                    />
                  </div>
                </label>
              )}
              {options.flattenStyle === 'soft' && !options.flattenGrayscale && (
                <label className="flex flex-col gap-1 text-body-md sm:col-start-2">
                  <span>JPEG quality ({Math.round(options.flattenJpegQuality * 100)}%)</span>
                  <div className="flex h-10 items-center">
                    <input
                      type="range"
                      min={40}
                      max={95}
                      value={Math.round(options.flattenJpegQuality * 100)}
                      onChange={(e) =>
                        setEcoOptions({ flattenJpegQuality: Number(e.target.value) / 100 })
                      }
                      disabled={optimizing || flattenBlocked}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary disabled:cursor-not-allowed"
                    />
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void optimizeInk()}
          disabled={optimizeDisabled}
          className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {optimizing ? 'Optimizing…' : checking ? 'Checking document…' : 'Optimize'}
        </button>

        {checking && !progress && (
          <p className="font-mono text-label-md text-text-secondary">Checking document…</p>
        )}

        {progress && (
          <p className="font-mono text-label-md text-text-secondary">
            {progress.phase}
            {progress.total > 1 ? ` (${progress.current}/${progress.total})` : ''}
          </p>
        )}

        {error && (
          <p className="text-body-md text-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {(beforeInk || afterInk) && (
        <div className="rounded-xl border border-border-subtle bg-surface p-8">
          <h3 className="mb-4 text-label-sm uppercase tracking-widest text-primary">
            Ink comparison (300 dpi)
          </h3>
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="text-label-sm text-text-secondary">
                <th className="py-2 pr-4">Plate</th>
                <th className="py-2 pr-4">Before</th>
                <th className="py-2">After</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 pr-4">Colour (C+M+Y)</td>
                <td className="py-2 pr-4 font-mono">{beforeInk?.color.toFixed(2) ?? '—'}%</td>
                <td className="py-2 font-mono">{afterInk?.color.toFixed(2) ?? '—'}%</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Black (K)</td>
                <td className="py-2 pr-4 font-mono">{beforeInk?.black.toFixed(2) ?? '—'}%</td>
                <td className="py-2 font-mono">{afterInk?.black.toFixed(2) ?? '—'}%</td>
              </tr>
            </tbody>
          </table>
          {result && (
            <p className="mt-4 text-label-md text-text-secondary">
              Output size: {formatBytes(result.outputSize)}
            </p>
          )}
          <p className="mt-3 text-label-sm text-text-secondary/80">
            Real savings are device-dependent. Black can rise after grayscale. Economy-text holes keep
            text selectable with a smaller, harder-to-measure reduction.
          </p>
        </div>
      )}

      {result?.notes?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-label-md text-text-secondary">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      {result ? (
        <EcoCompareView pageCount={pageCount} />
      ) : (
        <p className="text-body-md text-text-secondary">
          Run Optimize to see a before/after comparison.
        </p>
      )}
    </div>
  );
}
