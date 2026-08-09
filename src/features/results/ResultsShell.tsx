import { ANALYSIS_KINDS, ANALYSIS_TAB_ORDER, ANALYSIS_KIND_HEADINGS } from '@/lib/constants';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';
import PartnerAd from '@/features/results/PartnerAd';
import type { ResultsShellProps } from '@/features/results/types';

export default function ResultsShell({ children }: ResultsShellProps) {
  const {
    activeTab,
    handleTabChange,
    file,
    canDownload,
    download,
    reanalyze,
    reset,
  } = useAnalysisSessionContext();

  const heading = ANALYSIS_KIND_HEADINGS[activeTab] ?? 'Results';
  const isPickerTab = activeTab === ANALYSIS_KINDS.PICKER;
  const isEcoTab = activeTab === ANALYSIS_KINDS.ECO;
  const fileName = file?.name;

  return (
    <div className="mx-auto w-full max-w-container-max px-margin-edge py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-text-secondary">
            <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
            <span className="truncate font-mono text-label-md" title={fileName}>
              {fileName || 'document.pdf'}
            </span>
          </div>
          <h1 className="text-headline-md font-semibold text-text-primary">{heading}</h1>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 text-label-md text-primary transition-colors hover:underline"
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          Analyze another
        </button>
      </div>

      <div
        className="-mx-1 mb-6 flex overflow-x-auto border-b border-border-subtle"
        role="tablist"
        aria-label="Analysis type"
      >
        {ANALYSIS_TAB_ORDER.map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleTabChange(id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-6 py-3 text-label-md transition-colors ${
                active
                  ? 'border-b-2 border-primary font-semibold text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
              {active && (
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={download}
          disabled={!canDownload}
          className="flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-label-md text-text-primary transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          Download
        </button>
        <button
          type="button"
          onClick={reanalyze}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isPickerTab ? 'mop' : 'play_arrow'}
          </span>
          {isPickerTab ? 'Clear picks' : isEcoTab ? 'Optimize again' : 'Re-analyze'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-label-md text-text-primary transition-colors hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back
        </button>
      </div>

      <PartnerAd />

      <div role="tabpanel">{children}</div>
    </div>
  );
}
