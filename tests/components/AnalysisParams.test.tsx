import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisParams from '@/features/upload/AnalysisParams';
import { ANALYSIS_KINDS } from '@/lib/constants';

describe('AnalysisParams', () => {
  const baseProps = {
    initialTab: ANALYSIS_KINDS.RGB,
    setInitialTab: vi.fn(),
    rgbThreshold: 0.01,
    setRgbThreshold: vi.fn(),
    cmykInkThreshold: 0.5,
    setCmykInkThreshold: vi.fn(),
  };

  it('shows RGB threshold field when initial tab is RGB', () => {
    render(<AnalysisParams {...baseProps} initialTab={ANALYSIS_KINDS.RGB} />);
    expect(screen.getByLabelText(/Color sensitivity/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Color ink threshold percent/i)).not.toBeInTheDocument();
  });

  it('shows CMYK threshold and annotation checkbox when initial tab is CMYK', () => {
    render(<AnalysisParams {...baseProps} initialTab={ANALYSIS_KINDS.CMYK} cmykIncludeAnnotations={false} setCmykIncludeAnnotations={vi.fn()} />);
    expect(screen.getByLabelText(/Color ink threshold percent/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Include annotation ink/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Color sensitivity/i)).not.toBeInTheDocument();
  });

  it('calls setInitialTab when start-with select changes', () => {
    const setInitialTab = vi.fn();
    render(<AnalysisParams {...baseProps} setInitialTab={setInitialTab} />);
    fireEvent.change(screen.getByLabelText(/^Start with$/i), {
      target: { value: ANALYSIS_KINDS.CMYK },
    });
    expect(setInitialTab).toHaveBeenCalledWith(ANALYSIS_KINDS.CMYK);
  });
});
