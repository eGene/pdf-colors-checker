import { useEffect, useRef, useState } from 'react';
import {
  CMYK_INK_THRESHOLD_SLIDER_MAX_HUNDREDTHS,
  clampCmykInkThreshold,
  cmykInkThresholdFromSlider,
  cmykInkThresholdToSlider,
} from '@/lib/constants';
import type {
  CmykIncludeAnnotationsFieldProps,
  CmykThresholdFieldProps,
  RgbThresholdFieldProps,
} from '@/features/results/types';

export function RgbThresholdField({ rgbThreshold, setRgbThreshold, idPrefix = '' }: RgbThresholdFieldProps) {
  const id = `${idPrefix}threshold`;
  return (
    <div>
      <div className="mb-2 flex justify-between">
        <label htmlFor={id} className="text-label-md text-text-secondary">
          Color sensitivity
        </label>
        <span className="font-mono text-label-md text-primary">
          {Math.round(rgbThreshold * 100)}%
        </span>
      </div>
      <input
        id={id}
        type="range"
        min="1"
        max="99"
        step="1"
        value={Math.round(rgbThreshold * 100)}
        onChange={(e) => setRgbThreshold(Number(e.target.value) / 100)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary"
      />
      <p className="mt-2 text-label-sm text-text-secondary/60">
        How far a pixel must stray from gray before the page counts as color. Lower = stricter
        (flags more pages).
      </p>
    </div>
  );
}

export function CmykThresholdField({
  cmykInkThreshold,
  setCmykInkThreshold,
  idPrefix = '',
}: CmykThresholdFieldProps) {
  const sliderId = `${idPrefix}cmyk-threshold-slider`;
  const inputId = `${idPrefix}cmyk-threshold-input`;
  const inputFocusedRef = useRef(false);
  const [draft, setDraft] = useState(() => String(cmykInkThreshold ?? 0));

  useEffect(() => {
    if (!inputFocusedRef.current) {
      setDraft(String(cmykInkThreshold ?? 0));
    }
  }, [cmykInkThreshold]);

  const applyDraftValue = (raw: string) => {
    setDraft(raw);
    if (raw === '' || raw === '-' || raw === '.') return;
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      setCmykInkThreshold(clampCmykInkThreshold(parsed));
    }
  };

  const commitDraft = () => {
    const parsed = parseFloat(draft);
    const clamped = clampCmykInkThreshold(Number.isFinite(parsed) ? parsed : 0);
    setCmykInkThreshold(clamped);
    setDraft(String(clamped));
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={sliderId} className="text-label-md text-text-secondary">
          Color ink threshold
        </label>
        <div className="flex items-center gap-1">
          <input
            id={inputId}
            type="number"
            min="0"
            max="10"
            step="0.01"
            inputMode="decimal"
            value={draft}
            onChange={(e) => applyDraftValue(e.target.value)}
            onFocus={() => {
              inputFocusedRef.current = true;
            }}
            onBlur={() => {
              inputFocusedRef.current = false;
              commitDraft();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            aria-label="Color ink threshold percent"
            className="w-24 rounded border border-border-subtle bg-surface-container-lowest px-2 py-1 text-right font-mono text-label-md text-text-primary outline-none transition-all focus:border-primary"
          />
          <span className="text-label-md text-text-secondary">%</span>
        </div>
      </div>
      <input
        id={sliderId}
        type="range"
        min="0"
        max={CMYK_INK_THRESHOLD_SLIDER_MAX_HUNDREDTHS}
        step="1"
        value={cmykInkThresholdToSlider(cmykInkThreshold ?? 0)}
        onChange={(e) => setCmykInkThreshold(cmykInkThresholdFromSlider(Number(e.target.value)))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary"
      />
      <p className="mt-2 text-label-sm text-text-secondary/60">
        Minimum cyan, magenta, or yellow ink coverage (Ghostscript inkcov) to count a page as
        color. Type a value (e.g. 0.09) or use the slider. 0% matches common command-line
        scripts.
      </p>
    </div>
  );
}

export function CmykIncludeAnnotationsField({
  includeAnnotations,
  setIncludeAnnotations,
  idPrefix = '',
}: CmykIncludeAnnotationsFieldProps) {
  const id = `${idPrefix}cmyk-include-annotations`;

  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={includeAnnotations}
          onChange={(e) => setIncludeAnnotations(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span className="text-label-md text-text-secondary">Include annotation ink</span>
      </label>
      <p className="mt-2 pl-7 text-label-sm text-text-secondary/60">
        Also counts ink from review marks and stamp overlays. Off by default. Re-analyze after
        changing.
      </p>
    </div>
  );
}
