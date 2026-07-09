import type { ReactNode } from 'react';
import { AnalysisSessionContext } from '@/features/session/AnalysisSessionContext';
import { useAnalysisSession } from '@/features/session/useAnalysisSession';

export function AnalysisSessionProvider({ children }: { children: ReactNode }) {
  const session = useAnalysisSession();
  return (
    <AnalysisSessionContext.Provider value={session}>{children}</AnalysisSessionContext.Provider>
  );
}
