import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';

export default function ResultsProfileTab() {
  const { profileResult, tabs } = useAnalysisSessionContext();
  const tabError = tabs.profile.error;

  if (tabError) {
    return (
      <p className="text-body-md text-error" role="alert">
        {tabError}
      </p>
    );
  }

  if (!profileResult) {
    return (
      <p className="text-body-md text-text-secondary">
        No color profile data yet. Switch to this tab to run analysis.
      </p>
    );
  }

  const {
    verdict,
    documentColorSpaces,
    stats,
    icc,
    spotColors,
    perPage,
  } = profileResult;

  const chipClass = (space: string) => {
    if (space === 'CMYK') return 'bg-secondary text-on-secondary';
    if (space === 'RGB') return 'bg-primary text-on-primary';
    if (space === 'SPOT COLOR') return 'bg-tertiary-container text-on-tertiary-container';
    if (space === 'LAB') return 'bg-primary-container text-on-primary-container';
    return 'border border-border-subtle text-text-secondary';
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border-subtle bg-surface p-8">
        <h2 className="mb-4 text-headline-md font-semibold text-text-primary">{verdict}</h2>
        <p className="mb-6 max-w-2xl text-body-md text-text-secondary">
          See how this PDF is set up for print — RGB, CMYK, spot colors, and output intent.
        </p>
        <div className="mb-8 flex flex-wrap gap-2">
          {documentColorSpaces.map((space) => (
            <span
              key={space}
              className={`rounded px-3 py-1 text-label-sm font-semibold ${chipClass(space)}`}
            >
              {space}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-8 border-t border-border-subtle pt-6 md:grid-cols-3">
          <div className="text-center">
            <p className="text-display font-bold text-text-primary">{stats.totalPages}</p>
            <p className="text-label-sm uppercase tracking-widest text-text-secondary">Pages</p>
          </div>
          <div className="text-center">
            <p className="text-display font-bold text-text-primary">{stats.colorSpaceCount}</p>
            <p className="text-label-sm uppercase tracking-widest text-text-secondary">
              Color spaces
            </p>
          </div>
          <div className="text-center">
            <p className="text-display font-bold text-tertiary">{stats.spotColorCount}</p>
            <p className="text-label-sm uppercase tracking-widest text-text-secondary">
              Spot colors
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
        <section className="rounded-xl border border-border-subtle bg-surface p-6">
          <span className="text-label-sm uppercase tracking-widest text-primary">
            ICC output intent
          </span>
          {icc ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-4">
                <span
                  className="material-symbols-outlined text-4xl text-primary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  dataset
                </span>
                <div>
                  <h3 className="text-headline-md font-semibold text-text-primary">{icc.name}</h3>
                  {icc.outputIntent && (
                    <p className="text-label-md text-text-secondary">{icc.outputIntent}</p>
                  )}
                </div>
              </div>
              <div className="space-y-3 border-t border-border-subtle pt-4">
                <div className="flex justify-between border-b border-border-subtle py-2">
                  <span className="text-text-secondary">Color space</span>
                  <span className="font-mono text-text-primary">{icc.colorSpace}</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle py-2">
                  <span className="text-text-secondary">Device class</span>
                  <span className="font-mono text-text-primary">{icc.deviceClass}</span>
                </div>
                {icc.outputIntent && (
                  <div className="flex justify-between py-2">
                    <span className="text-text-secondary">OutputIntent</span>
                    <span className="font-mono text-text-primary">{icc.outputIntent}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-body-md text-text-secondary">
              No ICC output intent found in this PDF.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border-subtle bg-surface p-6">
          <span className="text-label-sm uppercase tracking-widest text-primary">Spot colors</span>
          {spotColors.length > 0 ? (
            <ul className="mt-6 space-y-4">
              {spotColors.map((spot) => (
                <li key={spot.name} className="flex items-center gap-4">
                  <div
                    className="h-12 w-12 shrink-0 rounded-full border-2 border-border-subtle bg-surface-container-high"
                    aria-hidden
                  />
                  <div>
                    <p className="font-mono text-text-primary">{spot.name}</p>
                    <p className="text-label-sm text-text-secondary">
                      Used on {spot.pageCount} page{spot.pageCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-body-md text-text-secondary">No spot colors detected.</p>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <div className="border-b border-border-subtle p-6">
          <h3 className="text-headline-md font-semibold text-text-primary">Per-page breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-lowest text-label-sm uppercase tracking-wider text-text-secondary">
                <th className="px-6 py-4 font-semibold">Page</th>
                <th className="px-6 py-4 font-semibold">Color spaces</th>
                <th className="px-6 py-4 font-semibold">Spot colors</th>
                <th className="px-6 py-4 font-semibold">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {perPage.map((row) => (
                <tr
                  key={row.pageNumber}
                  className={
                    row.flag === 'RGB' ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container-high'
                  }
                >
                  <td className="px-6 py-4 font-mono text-text-primary">
                    {String(row.pageNumber).padStart(2, '0')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {row.colorSpaces.length ? (
                        row.colorSpaces.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-text-primary"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {row.spotColors.length ? (
                      <div className="flex flex-wrap gap-1">
                        {row.spotColors.map((s) => (
                          <span
                            key={s}
                            className="h-3 w-3 rounded-full bg-tertiary-container"
                            title={s}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-label-sm ${
                        row.flag === 'RGB'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-secondary/10 text-secondary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {row.flag === 'RGB' ? 'warning' : 'check_circle'}
                      </span>
                      {row.flag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
