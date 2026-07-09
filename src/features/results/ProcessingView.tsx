import type { ProcessingViewProps } from '@/features/results/types';

export default function ProcessingView({ label, processedCount, totalCount }: ProcessingViewProps) {
  const isRgbProgress = label === 'RGB analysis' && totalCount != null;
  const progressText = isRgbProgress
    ? `Processing page ${processedCount} of ${totalCount}…`
    : label === 'CMYK coverage'
      ? 'Loading Ghostscript and measuring ink coverage…'
      : label === 'Color profile'
        ? 'Inspecting color spaces and ICC profile…'
        : 'Analyzing your PDF…';

  return (
    <section className="mx-auto max-w-container-max px-margin-edge py-24">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="material-symbols-outlined animate-spin text-5xl text-primary">
          progress_activity
        </span>
        <h2 className="text-headline-md font-semibold text-text-primary">Analyzing your PDF</h2>
        <p className="text-body-md text-text-secondary">{progressText}</p>
        {label === 'CMYK coverage' && (
          <p className="max-w-md text-label-md text-text-secondary/80">
            Loading Ghostscript in your browser. This may take a moment on first use.
          </p>
        )}
      </div>
    </section>
  );
}
