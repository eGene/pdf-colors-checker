import type { InkCoverageRow } from '@/types/analysis';
import type { InkPlateTotals } from '@/types/ecoOptimize';

/** Area-weighted document totals from per-page inkcov rows. */
export function aggregateInkPlates(
  rows: InkCoverageRow[],
  pageAreas: number[],
): InkPlateTotals {
  let colorArea = 0;
  let blackArea = 0;
  let totalArea = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const area = pageAreas[i] ?? pageAreas[pageAreas.length - 1] ?? 1;
    if (!(area > 0)) continue;
    const colorFrac = (row.c + row.m + row.y) / 100;
    const blackFrac = row.k / 100;
    colorArea += colorFrac * area;
    blackArea += blackFrac * area;
    totalArea += area;
  }

  if (totalArea <= 0) return { color: 0, black: 0 };
  return {
    color: Math.round((colorArea / totalArea) * 10000) / 100,
    black: Math.round((blackArea / totalArea) * 10000) / 100,
  };
}
