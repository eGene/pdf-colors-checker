import { useCallback, useEffect, useRef, useState } from 'react';
import { drawMagnifierLens, imagePixelFromPointer } from '@/lib/colorConvert';

const LONG_PRESS_MS = 500;

export type EcoLoupeState = {
  clientX: number;
  clientY: number;
  pixelX: number;
  pixelY: number;
  isTouch: boolean;
};

export function useEcoCompareLoupe() {
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const [loupe, setLoupe] = useState<EcoLoupeState | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);

  // Paint after the portal canvas mounts / loupe updates (same pattern as color picker).
  useEffect(() => {
    if (!loupe) return;
    const canvas = loupeCanvasRef.current;
    const source = sourceRef.current;
    if (!canvas || !source?.naturalWidth) return;
    drawMagnifierLens(canvas, source, loupe.pixelX, loupe.pixelY, '#3b82f6');
  }, [loupe]);

  const resolveHit = useCallback(
    (source: HTMLImageElement | null, clientX: number, clientY: number) => {
      if (!source?.naturalWidth) return null;
      return imagePixelFromPointer(source, clientX, clientY);
    },
    [],
  );

  const showLoupe = useCallback(
    (
      source: HTMLImageElement | null,
      clientX: number,
      clientY: number,
      isTouch: boolean,
    ): boolean => {
      const hit = resolveHit(source, clientX, clientY);
      if (!hit) {
        sourceRef.current = null;
        setLoupe(null);
        return false;
      }
      sourceRef.current = source;
      setLoupe({
        clientX,
        clientY,
        pixelX: hit.pixelX,
        pixelY: hit.pixelY,
        isTouch,
      });
      return true;
    },
    [resolveHit],
  );

  const hideLoupe = useCallback(() => {
    sourceRef.current = null;
    setLoupe(null);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent, source: HTMLImageElement | null) => {
      if (e.pointerType === 'touch') {
        if (pressOrigin.current) {
          const dx = e.clientX - pressOrigin.current.x;
          const dy = e.clientY - pressOrigin.current.y;
          if (Math.hypot(dx, dy) > 10) {
            if (pressTimer.current) window.clearTimeout(pressTimer.current);
            pressTimer.current = null;
            hideLoupe();
          }
        }
        if (loupe) {
          showLoupe(source, e.clientX, e.clientY, true);
        }
        return;
      }
      showLoupe(source, e.clientX, e.clientY, false);
    },
    [loupe, showLoupe, hideLoupe],
  );

  const onPointerLeave = useCallback(() => {
    hideLoupe();
  }, [hideLoupe]);

  const onTouchStart = useCallback(
    (e: React.PointerEvent, source: HTMLImageElement | null) => {
      if (e.pointerType !== 'touch') return;
      pressOrigin.current = { x: e.clientX, y: e.clientY };
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => {
        showLoupe(source, e.clientX, e.clientY, true);
      }, LONG_PRESS_MS);
    },
    [showLoupe],
  );

  const onTouchEnd = useCallback(() => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressOrigin.current = null;
    hideLoupe();
  }, [hideLoupe]);

  return {
    loupe,
    loupeCanvasRef,
    onPointerMove,
    onPointerLeave,
    onTouchStart,
    onTouchEnd,
  };
}
