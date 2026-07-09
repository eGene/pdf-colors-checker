import type { PageThumbnailProps } from '@/features/results/types';

/** Max rendered size; image keeps its natural aspect ratio within these bounds. */
const MAX_WIDTH_PX = 220;
const MAX_HEIGHT_PX = 320;

export default function PageThumbnail({ src, pageNumber, variant = 'bw' }: PageThumbnailProps) {
  const isColor = variant === 'color';
  return (
    <div
      className={`group relative inline-flex max-w-full flex-col overflow-hidden rounded-lg border bg-surface transition-all hover:shadow-lg ${
        isColor
          ? 'border-secondary/40 shadow-secondary/5 hover:border-secondary'
          : 'border-border-subtle hover:border-primary/50 hover:shadow-primary/5'
      }`}
      style={{ maxWidth: MAX_WIDTH_PX }}
    >
      <img
        src={src}
        alt={`Page ${pageNumber}`}
        className="block h-auto w-auto max-w-full object-contain"
        style={{ maxWidth: MAX_WIDTH_PX, maxHeight: MAX_HEIGHT_PX }}
      />
      <div
        className={`absolute right-2 top-2 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-sm font-bold shadow-lg ${
          isColor
            ? 'bg-secondary text-on-secondary'
            : 'border border-border-subtle bg-surface-container-high text-text-primary'
        }`}
      >
        {pageNumber}
      </div>
    </div>
  );
}
