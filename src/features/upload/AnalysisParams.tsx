import { ANALYSIS_KINDS, getAnalysisKindLabel } from '@/lib/constants';
import { CmykIncludeAnnotationsField, CmykThresholdField, RgbThresholdField } from '@/features/results/ThresholdFields';
import type { AnalysisParamsProps } from '@/features/upload/types';
import { ecoPresetBalanced, ecoPresetLight } from '@/types/ecoOptimize';

export default function AnalysisParams({
  initialTab,
  setInitialTab,
  rgbThreshold,
  setRgbThreshold,
  cmykInkThreshold,
  setCmykInkThreshold,
  cmykIncludeAnnotations,
  setCmykIncludeAnnotations,
  ecoOptions,
  setEcoOptions,
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
            <option value={ANALYSIS_KINDS.ECO}>{getAnalysisKindLabel(ANALYSIS_KINDS.ECO)}</option>
          </select>
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-text-secondary"
            aria-hidden
          >
            expand_more
          </span>
        </div>
        <p className="mt-2 text-label-sm text-text-secondary/60">
          Which analysis opens first. All five are available as tabs after upload.
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
      {initialTab === ANALYSIS_KINDS.ECO && setEcoOptions != null && (
        <div className="space-y-3">
          <p className="text-label-sm text-text-secondary">
            Vector presets only. Flatten (image-only) is available on the Save Ink tab after upload,
            with a clear warning. Your file never leaves your device.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEcoOptions(ecoPresetLight())}
              className={`rounded-lg border px-4 py-2 text-label-md ${
                ecoOptions?.grayscale && ecoOptions?.images === 'keep' && !ecoOptions?.ecoFonts
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-subtle'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setEcoOptions(ecoPresetBalanced())}
              className={`rounded-lg border px-4 py-2 text-label-md ${
                ecoOptions?.grayscale &&
                ecoOptions?.images === 'downsample' &&
                ecoOptions?.ecoFonts
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-subtle'
              }`}
            >
              Balanced
            </button>
          </div>
          <p className="text-label-sm text-text-secondary/70">
            Light: grayscale for a smaller, simpler file that avoids color-cartridge use (may
            increase black toner on printers already rendering text in K only). Balanced: grayscale
            + downsample images + economy text when fonts are embedded.
          </p>
        </div>
      )}
    </div>
  );
}
