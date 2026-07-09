import { ANALYSIS_KINDS, getAnalysisKindLabel } from '@/lib/constants';
import { formatDate } from '@/lib/formatDate';
import type { HistoryDetailPanelProps } from '@/features/upload/types';

export default function HistoryDetailPanel({ entry, onClose }: HistoryDetailPanelProps) {
  const modeLabel = getAnalysisKindLabel(entry.mode);
  return (
    <div
      className="rounded-xl border border-primary/40 bg-surface-container-low p-6 shadow-lg ring-1 ring-primary/20"
      role="region"
      aria-label="Saved analysis details"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-headline-md font-semibold text-text-primary">Saved result</h3>
          <p className="mt-1 truncate font-mono text-label-md text-text-secondary" title={entry.fileName}>
            {entry.fileName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-container-high hover:text-text-primary"
          aria-label="Close saved result"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg border border-border-subtle bg-surface p-4">
        <div className="text-center">
          <div className="text-headline-md text-text-primary">{entry.totalPages}</div>
          <div className="text-label-sm uppercase text-text-secondary">Total</div>
        </div>
        <div className="text-center">
          <div className="text-headline-md text-secondary">{entry.colorPages.length}</div>
          <div className="text-label-sm uppercase text-text-secondary">Color</div>
        </div>
        <div className="text-center">
          <div className="text-headline-md text-text-primary">{entry.bwPages.length}</div>
          <div className="text-label-sm uppercase text-text-secondary">B&amp;W</div>
        </div>
      </div>

      <dl className="mb-4 grid gap-2 text-label-md sm:grid-cols-2">
        <div>
          <dt className="text-text-secondary">Mode</dt>
          <dd className="text-text-primary">{modeLabel}</dd>
        </div>
        {entry.mode === ANALYSIS_KINDS.RGB && (
          <div>
            <dt className="text-text-secondary">Threshold</dt>
            <dd className="font-mono text-text-primary">{Math.round(entry.threshold * 100)}%</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-text-secondary">Analyzed</dt>
          <dd className="text-text-primary">{formatDate(entry.analyzedAt)}</dd>
        </div>
      </dl>

      <p className="text-body-md text-text-secondary">
        Upload the same PDF again to view page thumbnails. Mode and threshold above have been restored
        from this run — adjust them before uploading if you want different settings.
      </p>
    </div>
  );
}
