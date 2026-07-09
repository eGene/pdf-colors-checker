import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class AnalysisErrorBoundaryInner extends Component<
  Props & { onReset: () => void },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Analysis view error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mx-auto max-w-container-max px-margin-edge py-16">
          <div className="rounded-xl border border-error/40 bg-error-container/10 p-8 text-center">
            <h2 className="mb-2 text-headline-md font-semibold text-text-primary">
              Something went wrong
            </h2>
            <p className="mb-6 text-body-md text-text-secondary">
              An unexpected error occurred while showing results. You can go back and try another
              file.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset();
              }}
              className="rounded-lg bg-primary px-6 py-2 text-label-md font-semibold text-on-primary"
            >
              Back to upload
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

export default function AnalysisErrorBoundary({ children }: Props) {
  const { reset } = useAnalysisSessionContext();
  return <AnalysisErrorBoundaryInner onReset={reset}>{children}</AnalysisErrorBoundaryInner>;
}
