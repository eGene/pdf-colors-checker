import { createContext, useContext } from 'react';
import type { AnalysisSessionValue } from '@/features/session/useAnalysisSession';

export const AnalysisSessionContext = createContext<AnalysisSessionValue | null>(null);

export function useAnalysisSessionContext(): AnalysisSessionValue {
  const ctx = useContext(AnalysisSessionContext);
  if (!ctx) {
    throw new Error('useAnalysisSessionContext must be used within AnalysisSessionProvider');
  }
  return ctx;
}
