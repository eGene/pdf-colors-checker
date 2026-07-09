import type { AnalysisKind } from '../types/analysis';
import type { ColorProfileResult } from '../types/profile';
import type { ColorPick } from '../types/pdf';
import type { InkCoverageRow } from '../types/analysis';

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

export function exportRgb(params: {
  threshold: number;
  bwPages: number[];
  colorPages: number[];
  totalPages: number;
}): ExportResult {
  const { threshold, bwPages, colorPages, totalPages } = params;
  const content = `mode: RGB\nthreshold: ${~~(threshold * 100)}%\n${bwPages.length} bw: ${bwPages.map((idx) => idx + 1).join(',')}\n${colorPages.length} color: ${colorPages.map((idx) => idx + 1).join(',')}\ntotal: ${totalPages}`;
  return { content, filename: 'rgb-analysis.txt', mimeType: 'text/plain' };
}

export function exportCmyk(params: {
  inkCoverage: { page: number; c: number; m: number; y: number; k: number }[];
  cmykInkThreshold: number;
  verdictFor: (c: number, m: number, y: number) => string;
}): ExportResult | null {
  const { inkCoverage, cmykInkThreshold, verdictFor } = params;
  if (!inkCoverage.length) return null;
  const header = 'page,cyan,magenta,yellow,key,verdict';
  const meta = `# cmyk_color_ink_threshold_percent: ${cmykInkThreshold}`;
  const rows = inkCoverage.map(
    (r) => `${r.page},${r.c},${r.m},${r.y},${r.k},${verdictFor(r.c, r.m, r.y)}`,
  );
  return {
    content: [meta, header, ...rows].join('\n'),
    filename: 'cmyk-coverage.csv',
    mimeType: 'text/csv',
  };
}

export function exportProfile(params: {
  profileResult: ColorProfileResult;
}): ExportResult | null {
  const { profileResult } = params;
  let content = `verdict: ${profileResult.verdict}\n`;
  content += `color spaces: ${profileResult.documentColorSpaces.join(', ')}\n`;
  if (profileResult.icc) {
    content += `icc: ${profileResult.icc.name} (${profileResult.icc.colorSpace})\n`;
  }
  content += `spot colors: ${profileResult.spotColors.map((s) => s.name).join(', ') || 'none'}\n`;
  content += profileResult.perPage
    .map(
      (p) =>
        `page ${p.pageNumber}: ${p.colorSpaces.join('+') || '—'} | spots: ${p.spotColors.join(', ') || '—'} | ${p.flag}`,
    )
    .join('\n');
  return { content, filename: 'color-profile.txt', mimeType: 'text/plain' };
}

export function exportPicks(params: {
  colorPicks: {
    hex: string;
    r: number;
    g: number;
    b: number;
    c: number;
    m: number;
    y: number;
    k: number;
    pageNumber: number;
    pixelX: number;
    pixelY: number;
  }[];
}): ExportResult | null {
  const { colorPicks } = params;
  if (!colorPicks.length) return null;
  const header = 'hex,r,g,b,c,m,y,k,page,pixel_x,pixel_y';
  const rows = colorPicks.map(
    (p) =>
      `${p.hex},${p.r},${p.g},${p.b},${p.c},${p.m},${p.y},${p.k},${p.pageNumber},${p.pixelX},${p.pixelY}`,
  );
  return {
    content: [header, ...rows].join('\n'),
    filename: 'color-picks.csv',
    mimeType: 'text/csv',
  };
}

export function downloadExport(result: ExportResult): void {
  const link = document.createElement('a');
  const blob = new Blob([result.content], { type: result.mimeType });
  link.href = URL.createObjectURL(blob);
  link.download = result.filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export interface ActiveTabExportParams {
  activeTab: AnalysisKind;
  pages: string[] | null;
  thresholds: { rgb: number; cmykInk: number };
  bwPages: number[];
  colorPages: number[];
  inkCoverage: InkCoverageRow[];
  profileResult: ColorProfileResult | null;
  colorPicks: ColorPick[];
  verdictFor: (c: number, m: number, y: number) => string;
}

export function exportActiveTab(params: ActiveTabExportParams): ExportResult | null {
  const {
    activeTab,
    pages,
    thresholds,
    bwPages,
    colorPages,
    inkCoverage,
    profileResult,
    colorPicks,
    verdictFor,
  } = params;

  if (!pages?.length) return null;

  switch (activeTab) {
    case 'rgb':
      return exportRgb({
        threshold: thresholds.rgb,
        bwPages,
        colorPages,
        totalPages: pages.length,
      });
    case 'cmyk':
      return exportCmyk({
        inkCoverage,
        cmykInkThreshold: thresholds.cmykInk,
        verdictFor,
      });
    case 'profile':
      return profileResult ? exportProfile({ profileResult }) : null;
    case 'picker':
      return exportPicks({ colorPicks });
    default:
      return null;
  }
}
