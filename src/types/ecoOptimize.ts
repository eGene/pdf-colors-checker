export type EcoMode = 'vector' | 'flatten';
export type FlattenStyle = 'soft' | 'threshold' | 'outline';
export type ImagesHandling = 'keep' | 'downsample' | 'remove';

/** Lifecycle phase for Save Ink — busy/gate clock for UI. */
export type EcoPhase = 'idle' | 'safety' | 'optimize' | 'done' | 'error';

export interface EcoOptions {
  mode: EcoMode;
  /** Vector mode: Ghostscript ColorConversionStrategy=Gray */
  grayscale: boolean;
  images: ImagesHandling;
  imageDpi: number;
  ecoFonts: boolean;
  ecoFontIntensity: number;
  flattenStyle: FlattenStyle;
  /** Flatten mode: luminance conversion before DeviceGray swap */
  flattenGrayscale: boolean;
  flattenDpi: number;
  flattenSoftStrength: number;
  flattenThreshold: number;
  flattenJpegQuality: number;
  /** User confirmed flatten despite AcroForm */
  flattenAcroFormConfirmed: boolean;
}

export interface InkPlateTotals {
  color: number;
  black: number;
}

export interface EcoProgress {
  phase: string;
  current: number;
  total: number;
}

export interface EcoResult {
  downloadUrl: string;
  outputSize: number;
  notes: string[];
}

export interface DocumentSafety {
  hasAcroForm: boolean;
  hasSignature: boolean;
  pageAreas: number[];
  encrypted?: boolean;
  error?: string;
}

export type EcoPreviewSide = 'before' | 'after';

export const DEFAULT_ECO_OPTIONS: EcoOptions = {
  mode: 'vector',
  grayscale: true,
  images: 'downsample',
  imageDpi: 100,
  ecoFonts: true,
  ecoFontIntensity: 0.1,
  flattenStyle: 'soft',
  flattenGrayscale: true,
  flattenDpi: 150,
  flattenSoftStrength: 0.35,
  flattenThreshold: 0.55,
  flattenJpegQuality: 0.8,
  flattenAcroFormConfirmed: false,
};

/** Home-page presets (vector mode only). */
export function ecoPresetLight(): Partial<EcoOptions> {
  return {
    mode: 'vector',
    grayscale: true,
    images: 'keep',
    ecoFonts: false,
  };
}

export function ecoPresetBalanced(): Partial<EcoOptions> {
  return {
    mode: 'vector',
    grayscale: true,
    images: 'downsample',
    imageDpi: 100,
    ecoFonts: true,
    ecoFontIntensity: 0.1,
  };
}
