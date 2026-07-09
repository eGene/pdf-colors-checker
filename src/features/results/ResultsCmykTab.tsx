import { cmykPageHasColorInk, cmykPageVerdict, formatCmykInkThreshold } from '@/lib/constants';
import { formatInkPercent, inkBarWidthPercent } from '@/lib/cmykInkDisplay';
import { CmykIncludeAnnotationsField, CmykThresholdField } from '@/features/results/ThresholdFields';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';
import type { InkBarProps } from '@/features/results/types';

function InkBar({ value, colorClass }: InkBarProps) {
  const barWidth = inkBarWidthPercent(value);
  return (
    <div className="flex min-w-[10rem] flex-1 items-center gap-3">
      <div className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-surface-container-highest">
        <div className={`h-full ${colorClass}`} style={{ width: `${barWidth}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-label-sm text-text-secondary">
        {formatInkPercent(value)}
      </span>
    </div>
  );
}

export default function ResultsCmykTab() {
  const {
    inkCoverage,
    pages,
    thresholds,
    setCmykInkThreshold,
    cmykIncludeAnnotations,
    setCmykIncludeAnnotations,
    cmykAnnotationNote,
    file,
    tabs,
  } = useAnalysisSessionContext();

  const tabError = tabs.cmyk.error;
  const cmykInkThreshold = thresholds.cmykInk;
  const fileName = file?.name;
  const totalPages = pages?.length ?? 0;

  if (tabError) {
    return (
      <p className="text-body-md text-error" role="alert">
        {tabError}
      </p>
    );
  }

  if (!inkCoverage?.length) {
    return (
      <p className="text-body-md text-text-secondary">
        No CMYK coverage data yet. Switch to this tab to run analysis.
      </p>
    );
  }

  const colorInkCount = inkCoverage.filter(
    (r) => cmykPageVerdict(r.c, r.m, r.y, cmykInkThreshold) === 'COLOR',
  ).length;
  const bwInkCount = inkCoverage.length - colorInkCount;
  const thresholdText = formatCmykInkThreshold(cmykInkThreshold);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border-subtle bg-surface p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-label-sm uppercase tracking-widest text-primary">
              Color ink threshold
            </h3>
            <CmykThresholdField
              cmykInkThreshold={cmykInkThreshold}
              setCmykInkThreshold={setCmykInkThreshold}
              idPrefix="results-cmyk-"
            />
            <div className="mt-6">
              <CmykIncludeAnnotationsField
                includeAnnotations={cmykIncludeAnnotations}
                setIncludeAnnotations={setCmykIncludeAnnotations}
                idPrefix="results-cmyk-"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-label-sm text-text-secondary">File</label>
            <div
              className="truncate rounded border border-border-subtle bg-background px-3 py-2 font-mono text-text-primary"
              title={fileName}
            >
              {fileName || 'document.pdf'}
            </div>
          </div>
        </div>
      </div>

      {cmykAnnotationNote && (
        <p className="rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 text-body-md text-text-secondary" role="status">
          {cmykAnnotationNote}
        </p>
      )}

      <p className="text-body-md text-text-secondary">
        A page counts as color when cyan, magenta, or yellow ink is at least{' '}
        <span className="font-mono text-text-primary">{thresholdText}</span> of the page area (black
        ink alone stays B/W). RGB analysis can flag more pages because it looks at screen pixels,
        not separations.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col items-center rounded-xl border border-border-subtle bg-surface p-6 text-center">
          <span className="mb-2 text-label-sm uppercase tracking-widest text-text-secondary">
            Total pages
          </span>
          <span className="text-headline-lg font-semibold text-primary">
            {totalPages ?? inkCoverage.length}
          </span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-l-4 border-l-secondary border-border-subtle bg-surface p-6 text-center">
          <span className="mb-2 text-label-sm uppercase tracking-widest text-text-secondary">
            Color ink
          </span>
          <span className="text-headline-lg font-semibold text-secondary">{colorInkCount}</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border-subtle bg-surface p-6 text-center">
          <span className="mb-2 text-label-sm uppercase tracking-widest text-text-secondary">
            B/W ink only
          </span>
          <span className="text-headline-lg font-semibold text-text-primary">{bwInkCount}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-container-low">
                <th className="w-16 px-4 py-4 font-mono text-label-sm uppercase text-text-secondary">
                  Page
                </th>
                <th className="min-w-[11rem] px-4 py-4 font-mono text-label-sm uppercase text-text-secondary">
                  Cyan
                </th>
                <th className="min-w-[11rem] px-4 py-4 font-mono text-label-sm uppercase text-text-secondary">
                  Magenta
                </th>
                <th className="min-w-[11rem] px-4 py-4 font-mono text-label-sm uppercase text-text-secondary">
                  Yellow
                </th>
                <th className="min-w-[11rem] px-4 py-4 font-mono text-label-sm uppercase text-text-secondary">
                  Key
                </th>
                <th className="w-24 px-4 py-4 font-mono text-label-sm uppercase text-text-secondary">
                  Verdict
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {inkCoverage.map((row) => {
                const verdict = cmykPageVerdict(row.c, row.m, row.y, cmykInkThreshold);
                const bwOnly = !cmykPageHasColorInk(row.c, row.m, row.y, cmykInkThreshold);
                return (
                  <tr key={row.page} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-4 py-4 font-mono text-text-primary">{row.page}</td>
                    <td className="px-4 py-4">
                      {bwOnly && row.c === 0 ? (
                        <span className="text-text-secondary">—</span>
                      ) : (
                        <InkBar value={row.c} colorClass="bg-cyan-400" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {bwOnly && row.m === 0 ? (
                        <span className="text-text-secondary">—</span>
                      ) : (
                        <InkBar value={row.m} colorClass="bg-fuchsia-400" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {bwOnly && row.y === 0 ? (
                        <span className="text-text-secondary">—</span>
                      ) : (
                        <InkBar value={row.y} colorClass="bg-yellow-400" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <InkBar value={row.k} colorClass="bg-neutral-300" />
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded px-2 py-1 font-mono text-label-sm ${
                          verdict === 'COLOR'
                            ? 'bg-secondary-container/30 text-secondary'
                            : 'border border-border-subtle text-text-secondary'
                        }`}
                      >
                        {verdict}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
