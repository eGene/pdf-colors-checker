import PageThumbnail from '@/features/results/PageThumbnail';
import { RgbThresholdField } from '@/features/results/ThresholdFields';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';

export default function ResultsRgbTab() {
  const {
    pages,
    bwPages,
    colorPages,
    thresholds,
    setRgbThreshold,
    file,
  } = useAnalysisSessionContext();

  if (!pages) return null;

  const fileName = file?.name;
  const hasBw = bwPages.length > 0;
  const hasColor = colorPages.length > 0;
  const splitLayout = hasBw && hasColor;

  const thumbGallery = (indices: number[], variant: 'bw' | 'color') => (
    <div className="flex flex-wrap items-start gap-4">
      {indices.map((idx) => (
        <PageThumbnail
          key={`${variant}-${idx}`}
          src={pages[idx]}
          pageNumber={idx + 1}
          variant={variant}
        />
      ))}
    </div>
  );

  return (
    <>
      <section className="mb-12 grid grid-cols-1 gap-gutter md:grid-cols-12">
        <div className="rounded-xl border border-border-subtle bg-surface p-6 md:col-span-8">
          <div>
            <h2 className="mb-2 text-headline-md font-semibold text-text-primary">
              Processed {pages.length} page{pages.length === 1 ? '' : 's'}
            </h2>
            <p className="text-label-md uppercase tracking-wider text-text-secondary">
              Analysis complete
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-8 border-t border-border-subtle pt-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-label-sm uppercase tracking-widest text-primary">
                Color sensitivity
              </h3>
              <RgbThresholdField
                rgbThreshold={thresholds.rgb}
                setRgbThreshold={setRgbThreshold}
                idPrefix="results-rgb-"
              />
              <p className="mt-4 text-label-sm text-text-secondary">
                Changing the sensitivity re-scans pixels — click Re-analyze in the header to update
                this list.
              </p>
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

        <div className="grid grid-rows-2 gap-4 md:col-span-4">
          <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-6">
            <div>
              <p className="mb-1 text-label-sm text-text-secondary">Color pages</p>
              <p className="text-headline-lg font-semibold text-secondary">
                {String(colorPages.length).padStart(2, '0')}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container">
              <span
                className="material-symbols-outlined text-on-secondary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                palette
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-6">
            <div>
              <p className="mb-1 text-label-sm text-text-secondary">B/W pages</p>
              <p className="text-headline-lg font-semibold text-text-primary">
                {String(bwPages.length).padStart(2, '0')}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high">
              <span
                className="material-symbols-outlined text-text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                contrast
              </span>
            </div>
          </div>
        </div>
      </section>

      <div
        className={
          splitLayout
            ? 'grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-gutter'
            : 'flex flex-col gap-10'
        }
      >
        <section className="min-w-0" aria-labelledby="results-bw-heading">
          <div className="mb-6 flex items-center gap-4">
            <h2
              id="results-bw-heading"
              className="text-headline-md font-semibold text-text-primary"
            >
              B/W pages
            </h2>
            <span className="rounded bg-surface-container-high px-2 py-0.5 text-label-sm text-text-secondary">
              {bwPages.length} items
            </span>
          </div>
          {!hasBw ? (
            <p className="text-body-md text-text-secondary">
              No black-and-white pages detected.
            </p>
          ) : (
            thumbGallery(bwPages, 'bw')
          )}
        </section>

        <section className="min-w-0" aria-labelledby="results-color-heading">
          <div className="mb-6 flex items-center gap-4">
            <h2
              id="results-color-heading"
              className="text-headline-md font-semibold text-secondary"
            >
              Color pages
            </h2>
            <span className="rounded border border-secondary/20 bg-secondary-container/20 px-2 py-0.5 text-label-sm text-secondary">
              {colorPages.length} items
            </span>
          </div>
          {!hasColor ? (
            <p className="text-body-md text-text-secondary">No color pages detected.</p>
          ) : (
            thumbGallery(colorPages, 'color')
          )}
        </section>
      </div>
    </>
  );
}
