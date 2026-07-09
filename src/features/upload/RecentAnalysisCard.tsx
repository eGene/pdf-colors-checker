import { ANALYSIS_KINDS, formatCmykInkThreshold, getAnalysisKindShortLabel } from '@/lib/constants';
import { formatDate } from '@/lib/formatDate';
import type { RecentAnalysisCardProps } from '@/features/upload/types';

export default function RecentAnalysisCard({
  entry,
  onSelect,
  onDelete,
  selected = false,
}: RecentAnalysisCardProps) {
  const modeLabel = getAnalysisKindShortLabel(entry.mode);
  return (
    <div
      className={`relative rounded-lg border bg-surface transition-all hover:border-primary/30 ${
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border-subtle'
      }`}
    >
      <button
        type="button"
        onClick={() => onDelete(entry)}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-container-high hover:text-text-primary"
        aria-label={`Remove ${entry.fileName} from recent analysis`}
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect(entry)}
        aria-pressed={selected}
        className="w-full p-6 pr-12 text-left"
      >
        <div className="mb-4">
          <span className="block truncate font-mono text-label-sm text-text-secondary">
            {entry.fileName}
          </span>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2 border-y border-border-subtle py-4">
          <div className="text-center">
            <div className="text-headline-md text-text-primary">{entry.totalPages}</div>
            <div className="text-label-sm uppercase text-text-secondary">Total</div>
          </div>
          <div className="text-center">
            <div className="text-headline-md text-primary">{entry.colorPages.length}</div>
            <div className="text-label-sm uppercase text-text-secondary">Color</div>
          </div>
          <div className="text-center">
            <div className="text-headline-md text-text-primary">{entry.bwPages.length}</div>
            <div className="text-label-sm uppercase text-text-secondary">B&amp;W</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-text-secondary">
          <span className="text-label-sm">
            {modeLabel}
            {entry.mode === ANALYSIS_KINDS.RGB ? ` · ${Math.round(entry.threshold * 100)}%` : ''}
            {entry.mode === ANALYSIS_KINDS.CMYK && typeof entry.cmykInkThreshold === 'number'
              ? ` · ${formatCmykInkThreshold(entry.cmykInkThreshold).replace(' (any C/M/Y)', '')} ink`
              : ''}
          </span>
          <span className="text-label-sm">{formatDate(entry.analyzedAt)}</span>
        </div>
      </button>
    </div>
  );
}
