/** Ghostscript argument builders — shared by CMYK tab and Save Ink. */

export function grayscalePdfArgs(): string[] {
  return [
    '-dBATCH',
    '-dNOPAUSE',
    '-sDEVICE=pdfwrite',
    '-sColorConversionStrategy=Gray',
    '-dProcessColorModel=/DeviceGray',
    '-sOutputFile=output.pdf',
    'input.pdf',
  ];
}

export function downsampleImagesArgs(dpi: number): string[] {
  const res = Math.max(36, Math.min(300, Math.round(dpi)));
  return [
    '-dBATCH',
    '-dNOPAUSE',
    '-sDEVICE=pdfwrite',
    '-dDownsampleColorImages=true',
    `-dColorImageResolution=${res}`,
    '-dColorImageDownsampleType=/Bicubic',
    '-dDownsampleGrayImages=true',
    `-dGrayImageResolution=${res}`,
    '-sOutputFile=output.pdf',
    'input.pdf',
  ];
}

export function removeImagesArgs(): string[] {
  return [
    '-dBATCH',
    '-dNOPAUSE',
    '-sDEVICE=pdfwrite',
    '-dFILTERIMAGE',
    '-sOutputFile=output.pdf',
    'input.pdf',
  ];
}

export function inkcovArgs(opts: {
  resolution?: number;
  showAnnots?: boolean;
} = {}): string[] {
  const resolution = opts.resolution ?? 72;
  const showAnnots = opts.showAnnots === true;
  const args = [
    '-dBATCH',
    '-dNOPAUSE',
    '-sDEVICE=inkcov',
    `-dShowAnnots=${showAnnots ? 'true' : 'false'}`,
    '-q',
    '-o',
    '-',
    'input.pdf',
  ];
  if (resolution !== 72) {
    args.splice(4, 0, `-r${resolution}`);
  }
  return args;
}
