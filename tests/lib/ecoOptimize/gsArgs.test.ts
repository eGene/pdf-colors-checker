import { describe, expect, it } from 'vitest';
import {
  downsampleImagesArgs,
  grayscalePdfArgs,
  inkcovArgs,
  removeImagesArgs,
} from '@/lib/ecoOptimize/gsArgs';

describe('gsArgs', () => {
  it('builds grayscale pdfwrite args with batch/nopause', () => {
    const args = grayscalePdfArgs();
    expect(args).toContain('-dBATCH');
    expect(args).toContain('-dNOPAUSE');
    expect(args).toContain('-sDEVICE=pdfwrite');
    expect(args).toContain('-sColorConversionStrategy=Gray');
  });

  it('builds downsample args with resolution', () => {
    const args = downsampleImagesArgs(100);
    expect(args).toContain('-dColorImageResolution=100');
    expect(args).toContain('-dGrayImageResolution=100');
  });

  it('builds remove-images args', () => {
    expect(removeImagesArgs()).toContain('-dFILTERIMAGE');
  });

  it('builds inkcov at 300 dpi', () => {
    const args = inkcovArgs({ resolution: 300 });
    expect(args).toContain('-sDEVICE=inkcov');
    expect(args).toContain('-r300');
  });

  it('defaults inkcov without custom resolution', () => {
    const args = inkcovArgs({ showAnnots: true });
    expect(args).toContain('-dShowAnnots=true');
    expect(args.some((a) => a.startsWith('-r'))).toBe(false);
  });
});
