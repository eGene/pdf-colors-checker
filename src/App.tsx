import { lazy, Suspense, useEffect } from 'react';
import { sendAppAnalyticsBeacon } from '@/lib/analyticsBeacon';
import AppHeader from '@/features/layout/AppHeader';
import AppFooter from '@/features/layout/AppFooter';
import UploadDashboard from '@/features/upload/UploadDashboard';
import ProcessingView from '@/features/results/ProcessingView';
import ResultsShell from '@/features/results/ResultsShell';
import ResultsRgbTab from '@/features/results/ResultsRgbTab';
import ResultsProfileTab from '@/features/results/ResultsProfileTab';
import AnalysisErrorBoundary from '@/features/results/AnalysisErrorBoundary';
import { ANALYSIS_KINDS } from '@/lib/constants';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';

const ResultsCmykTab = lazy(() => import('@/features/results/ResultsCmykTab'));
const ResultsColorPickerTab = lazy(() => import('@/features/results/ResultsColorPickerTab'));
const ResultsEcoTab = lazy(() => import('@/features/results/ResultsEcoTab'));

function ResultsTabContent() {
  const { activeTab } = useAnalysisSessionContext();

  if (activeTab === ANALYSIS_KINDS.RGB) {
    return <ResultsRgbTab />;
  }
  if (activeTab === ANALYSIS_KINDS.CMYK) {
    return (
      <Suspense
        fallback={
          <ProcessingView label="CMYK coverage" processedCount={0} totalCount={null} />
        }
      >
        <ResultsCmykTab />
      </Suspense>
    );
  }
  if (activeTab === ANALYSIS_KINDS.PROFILE) {
    return <ResultsProfileTab />;
  }
  if (activeTab === ANALYSIS_KINDS.PICKER) {
    return (
      <Suspense fallback={<ProcessingView label={null} processedCount={0} totalCount={null} />}>
        <ResultsColorPickerTab />
      </Suspense>
    );
  }
  if (activeTab === ANALYSIS_KINDS.ECO) {
    return (
      <Suspense fallback={<ProcessingView label="Save Ink" processedCount={0} totalCount={null} />}>
        <ResultsEcoTab />
      </Suspense>
    );
  }
  return null;
}

function AppContent() {
  const session = useAnalysisSessionContext();
  const showResults = !session.isProcessing && session.pages;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-grow">
        {session.isProcessing && (
          <ProcessingView
            label={session.processingLabel}
            processedCount={session.processedCount}
            totalCount={session.pages?.length ?? null}
          />
        )}
        {!session.isProcessing && !session.pages && <UploadDashboard />}
        {showResults && (
          <AnalysisErrorBoundary>
            <ResultsShell>
              <ResultsTabContent />
            </ResultsShell>
          </AnalysisErrorBoundary>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    sendAppAnalyticsBeacon();
  }, []);

  return <AppContent />;
}
