import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createImageSampler,
  drawMagnifierLens,
  imagePixelFromPointer,
  rgbToCmyk,
  rgbToHex,
  type ImageSampler,
} from '@/lib/colorConvert';
import type { CurrentPickState } from '@/features/results/types';
import type { ColorPick, RgbSample } from '@/types/pdf';

const MAX_RECENT_PICKS = 6;
export const TOUCH_LOUPE_GAP = 30;

export function loupeTransform(isTouch: boolean) {
  return isTouch ? 'translate(-50%, 0)' : 'translate(-50%, -50%)';
}

export function loupeTop(clientY: number, isTouch: boolean) {
  return isTouch ? clientY + TOUCH_LOUPE_GAP : clientY;
}

interface UseColorPickerLoupeParams {
  pages: string[];
  pageIndex: number;
  setPageIndex: (index: number) => void;
  setPicks: React.Dispatch<React.SetStateAction<ColorPick[]>>;
  setCurrentPick: React.Dispatch<React.SetStateAction<ColorPick | null>>;
}

export function useColorPickerLoupe({
  pages,
  pageIndex,
  setPageIndex,
  setPicks,
  setCurrentPick,
}: UseColorPickerLoupeParams) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const samplersRef = useRef<Map<number, ImageSampler>>(new Map());
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const touchPickActiveRef = useRef(false);
  const [loupe, setLoupe] = useState<CurrentPickState | null>(null);

  useEffect(() => {
    samplersRef.current.clear();
  }, [pages]);

  const cacheSampler = useCallback((pageIdx: number) => {
    const img = imgRefs.current[pageIdx];
    if (!img?.naturalWidth) return null;
    let sampler = samplersRef.current.get(pageIdx);
    if (!sampler) {
      sampler = createImageSampler(img) ?? undefined;
      if (sampler) samplersRef.current.set(pageIdx, sampler);
    }
    return sampler ?? null;
  }, []);

  const scrollToPage = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    document.getElementById(`picker-page-${idx}`)?.scrollIntoView({ behavior, block: 'start' });
  }, []);

  const buildPick = useCallback((rgb: RgbSample, pageIdx: number, pixelX: number, pixelY: number): ColorPick => {
    const { r, g, b } = rgb;
    const cmyk = rgbToCmyk(r, g, b);
    return {
      r,
      g,
      b,
      hex: rgbToHex(r, g, b),
      c: cmyk.c,
      m: cmyk.m,
      y: cmyk.y,
      k: cmyk.k,
      pageIndex: pageIdx,
      pageNumber: pageIdx + 1,
      pixelX,
      pixelY,
    };
  }, []);

  const handlePointer = useCallback(
    (
      e: { clientX: number; clientY: number },
      pageIdx: number,
      { commitPick = false, isTouch = false }: { commitPick?: boolean; isTouch?: boolean } = {},
    ) => {
      const img = imgRefs.current[pageIdx];
      if (!img) return false;

      const mapped = imagePixelFromPointer(img, e.clientX, e.clientY);
      if (!mapped) {
        if (!commitPick) setLoupe(null);
        return false;
      }

      const rgb = cacheSampler(pageIdx)?.sample(mapped.pixelX, mapped.pixelY);
      if (!rgb || rgb.a === 0) {
        if (!commitPick) setLoupe(null);
        return false;
      }

      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      const loupeState = {
        clientX: e.clientX,
        clientY: e.clientY,
        pageIndex: pageIdx,
        pixelX: mapped.pixelX,
        pixelY: mapped.pixelY,
        hex,
        isTouch,
      };

      if (commitPick) {
        const pick = buildPick(rgb, pageIdx, mapped.pixelX, mapped.pixelY);
        setPageIndex(pageIdx);
        setCurrentPick(pick);
        setPicks((prev) => {
          const next = [pick, ...prev.filter((p) => p.hex !== pick.hex || p.pageIndex !== pageIdx)];
          return next.slice(0, MAX_RECENT_PICKS);
        });
        setLoupe(isTouch ? null : loupeState);
        return true;
      }

      setLoupe(loupeState);
      return true;
    },
    [buildPick, cacheSampler, setCurrentPick, setPageIndex, setPicks],
  );

  useEffect(() => {
    if (!loupe) return;
    const img = imgRefs.current[loupe.pageIndex];
    const canvas = loupeCanvasRef.current;
    if (img?.complete && canvas) {
      drawMagnifierLens(canvas, img, loupe.pixelX, loupe.pixelY, loupe.hex);
    }
  }, [loupe]);

  useEffect(() => {
    if (!loupe || loupe.isTouch) return undefined;
    const previous = document.body.style.cursor;
    document.body.style.cursor = 'none';
    return () => {
      document.body.style.cursor = previous;
    };
  }, [loupe]);

  const onTouchPickEnd = useCallback(() => {
    touchPickActiveRef.current = false;
    setLoupe(null);
  }, []);

  const onScrollAreaLeave = () => {
    if (!touchPickActiveRef.current) {
      setLoupe(null);
    }
  };

  const goPrev = () => {
    const next = Math.max(0, pageIndex - 1);
    setPageIndex(next);
    scrollToPage(next);
    setLoupe(null);
  };

  const goNext = () => {
    const next = Math.min(pages.length - 1, pageIndex + 1);
    setPageIndex(next);
    scrollToPage(next);
    setLoupe(null);
  };

  const onPageSelect = (value: string) => {
    const idx = Number(value);
    setPageIndex(idx);
    scrollToPage(idx);
    setLoupe(null);
  };

  return {
    scrollRef,
    imgRefs,
    loupeCanvasRef,
    touchPickActiveRef,
    loupe,
    setLoupe,
    cacheSampler,
    handlePointer,
    onTouchPickEnd,
    onScrollAreaLeave,
    goPrev,
    goNext,
    onPageSelect,
    scrollToPage,
  };
}
