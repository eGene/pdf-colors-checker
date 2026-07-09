import type { AnalysisKind } from '@/types/analysis';
import type { ColorProfileResult } from '@/types/profile';
import { TAB_STATUS } from '@/lib/constants';

export type TabNeed = 'pages' | 'fileBytes';

export const TAB_PIPELINE: Record<AnalysisKind, { needs: TabNeed[] }> = {
  rgb: { needs: ['pages'] },
  cmyk: { needs: ['pages', 'fileBytes'] },
  profile: { needs: ['fileBytes'] },
  picker: { needs: ['pages'] },
};

export function tabNeedsMet(
  tab: AnalysisKind,
  ctx: { pages: string[] | null; fileBytes: ArrayBuffer | null },
): boolean {
  const { needs } = TAB_PIPELINE[tab];
  if (needs.includes('pages') && !ctx.pages?.length) return false;
  if (needs.includes('fileBytes') && !ctx.fileBytes) return false;
  return true;
}

export interface TabResultSnapshot {
  inkCoverage: { length: number };
  profileResult: ColorProfileResult | null;
  pages: string[] | null;
  bwPages: number[];
  colorPages: number[];
}

/** True when a tab is marked done and has displayable results for the current file. */
export function tabHasResults(tab: AnalysisKind, snapshot: TabResultSnapshot): boolean {
  switch (tab) {
    case 'rgb':
      return (
        (snapshot.pages?.length ?? 0) > 0 &&
        snapshot.bwPages.length + snapshot.colorPages.length >= (snapshot.pages?.length ?? 0)
      );
    case 'cmyk':
      return snapshot.inkCoverage.length > 0;
    case 'profile':
      return snapshot.profileResult != null;
    case 'picker':
      return true;
    default:
      return false;
  }
}

export function tabAnalysisSettled(
  tab: AnalysisKind,
  status: string,
  snapshot: TabResultSnapshot,
): boolean {
  if (status === TAB_STATUS.RUNNING) return true;
  if (status === TAB_STATUS.DONE && tabHasResults(tab, snapshot)) return true;
  return false;
}
