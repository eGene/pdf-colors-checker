import { ANALYSIS_KINDS, getAnalysisKindLabel } from '@/lib/constants';
import { CmykIncludeAnnotationsField, CmykThresholdField, RgbThresholdField } from '@/features/results/ThresholdFields';
import type { AnalysisParamsProps } from '@/features/upload/types';

export default function AnalysisParams({
  initialTab,
  setInitialTab,
  rgbThreshold,
  setRgbThreshold,
  cmykInkThreshold,
  setCmykInkThreshold,
  cmykIncludeAnnotations,
  setCmykIncludeAnnotations,
  idPrefix = '',
}: AnalysisParamsProps) {
  const tabId = `${idPrefix}initial-tab`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={tabId} className="mb-2 block text-label-md text-text-secondary">
          Start with
        </label>
        <div className="relative">
          <select
            id={tabId}
            value={initialTab}
            onChange={(e) => setInitialTab(e.target.value as typeof initialTab)}
            className="w-full cursor-pointer appearance-none rounded border border-border-subtle bg-surface-container-lowest py-3 pl-4 pr-12 text-text-primary outline-none transition-all focus:border-primary"
          >
            <option value={ANALYSIS_KINDS.RGB}>{getAnalysisKindLabel(ANALYSIS_KINDS.RGB)}</option>
            <option value={ANALYSIS_KINDS.CMYK}>{getAnalysisKindLabel(ANALYSIS_KINDS.CMYK)}</option>
            <option value={ANALYSIS_KINDS.PROFILE}>{getAnalysisKindLabel(ANALYSIS_KINDS.PROFILE)}</option>
            <option value={ANALYSIS_KINDS.PICKER}>{getAnalysisKindLabel(ANALYSIS_KINDS.PICKER)}</option>
          </select>
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-text-secondary"
            aria-hidden
          >
            expand_more
          </span>
        </div>
        <p className="mt-2 text-label-sm text-text-secondary/60">
          Which analysis opens first. All four are available as tabs after upload.
        </p>
      </div>
      {initialTab === ANALYSIS_KINDS.RGB && (
        <RgbThresholdField rgbThreshold={rgbThreshold} setRgbThreshold={setRgbThreshold} idPrefix={idPrefix} />
      )}
      {initialTab === ANALYSIS_KINDS.CMYK && setCmykInkThreshold != null && cmykInkThreshold != null && (
        <>
          <CmykThresholdField
            cmykInkThreshold={cmykInkThreshold}
            setCmykInkThreshold={setCmykInkThreshold}
            idPrefix={idPrefix}
          />
          {setCmykIncludeAnnotations != null && cmykIncludeAnnotations != null && (
            <CmykIncludeAnnotationsField
              includeAnnotations={cmykIncludeAnnotations}
              setIncludeAnnotations={setCmykIncludeAnnotations}
              idPrefix={idPrefix}
            />
          )}
        </>
      )}
    </div>
  );
}
