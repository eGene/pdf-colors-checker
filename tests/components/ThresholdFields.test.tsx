import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CmykThresholdField, RgbThresholdField } from '@/features/results/ThresholdFields';

describe('ThresholdFields', () => {
  describe('RgbThresholdField', () => {
    it('updates threshold when slider changes', () => {
      const setRgbThreshold = vi.fn();
      render(<RgbThresholdField rgbThreshold={0.01} setRgbThreshold={setRgbThreshold} idPrefix="t-" />);
      fireEvent.change(screen.getByLabelText(/Color sensitivity/i), { target: { value: '25' } });
      expect(setRgbThreshold).toHaveBeenCalledWith(0.25);
    });

    it('shows threshold percent label', () => {
      render(<RgbThresholdField rgbThreshold={0.25} setRgbThreshold={() => {}} />);
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  describe('CmykThresholdField', () => {
    it('updates threshold from slider', () => {
      const setCmykInkThreshold = vi.fn();
      render(
        <CmykThresholdField cmykInkThreshold={0.5} setCmykInkThreshold={setCmykInkThreshold} />,
      );
      fireEvent.change(screen.getByLabelText(/^Color ink threshold$/i), {
        target: { value: '100' },
      });
      expect(setCmykInkThreshold).toHaveBeenCalledWith(1);
    });

    it('clamps typed threshold on blur', () => {
      const setCmykInkThreshold = vi.fn();
      render(
        <CmykThresholdField cmykInkThreshold={0.5} setCmykInkThreshold={setCmykInkThreshold} />,
      );
      const input = screen.getByLabelText(/Color ink threshold percent/i);
      fireEvent.change(input, { target: { value: '99' } });
      fireEvent.blur(input);
      expect(setCmykInkThreshold).toHaveBeenCalledWith(10);
    });
  });
});
