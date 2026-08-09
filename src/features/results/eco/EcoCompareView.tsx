import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';
import { LOUPE_CANVAS_PX, LOUPE_DISPLAY_PX } from '@/lib/colorConvert';
import { useEcoCompareLoupe } from './useEcoCompareLoupe';
import { loupeTop, loupeTransform } from '@/features/results/color-picker/useColorPickerLoupe';

const PREVIEW_DPI = 120;

export default function EcoCompareView({ pageCount }: { pageCount: number }) {
  const { eco, ensureEcoPreview, retryEcoPreview } = useAnalysisSessionContext();
  const [page, setPage] = useState(1);
  const [mobileTab, setMobileTab] = useState<'before' | 'after'>('before');
  const [slider, setSlider] = useState(50);
  // Mount only one layout so before/after img refs aren't stolen by md:hidden clones (0×0 rect).
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  );
  const compareRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const beforeImgRef = useRef<HTMLImageElement | null>(null);
  const afterImgRef = useRef<HTMLImageElement | null>(null);
  const loupe = useEcoCompareLoupe();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  const afterGated = eco.phase === 'optimize';
  const beforeReady = eco.safety != null && eco.phase !== 'safety';
  const afterReady = Boolean(eco.result) && !afterGated;

  useEffect(() => {
    if (!beforeReady && !afterReady) return;
    const pages = [page];
    if (page > 1) pages.push(page - 1);
    if (page < pageCount) pages.push(page + 1);
    for (const p of pages) {
      if (beforeReady && !eco.previewBefore[p] && !eco.previewErrors[`before:${p}`]) {
        ensureEcoPreview('before', p, PREVIEW_DPI);
      }
      if (afterReady && !eco.previewAfter[p] && !eco.previewErrors[`after:${p}`]) {
        ensureEcoPreview('after', p, PREVIEW_DPI);
      }
    }
  }, [
    page,
    pageCount,
    eco.previewBefore,
    eco.previewAfter,
    eco.previewErrors,
    beforeReady,
    afterReady,
    ensureEcoPreview,
  ]);

  const beforeUrl = eco.previewBefore[page];
  const afterUrl = eco.previewAfter[page];
  const beforeErr = eco.previewErrors[`before:${page}`];
  const afterErr = eco.previewErrors[`after:${page}`];
  const afterPlaceholder = !eco.result
    ? 'Run Optimize to generate the after preview'
    : afterGated
      ? 'Updating after…'
      : null;

  const retry = (side: 'before' | 'after') => {
    retryEcoPreview(side, page);
  };

  const setSliderFromClientX = (clientX: number) => {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSlider(Math.min(100, Math.max(0, pct)));
  };

  /** Left of divider = before; right = after. */
  const sourceForClientX = (clientX: number): HTMLImageElement | null => {
    const el = compareRef.current;
    if (!el) return beforeImgRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return beforeImgRef.current;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    if (pct <= slider) return beforeImgRef.current;
    return afterImgRef.current;
  };

  const beginSliderDrag = (e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    // Body cursor so col-resize sticks for click→drag anywhere (not only the thin handle).
    document.body.style.cursor = 'col-resize';
    e.currentTarget.setPointerCapture(e.pointerId);
    loupe.onPointerLeave();
    setSliderFromClientX(e.clientX);
  };

  const moveSliderDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    setSliderFromClientX(e.clientX);
  };

  const endSliderDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = '';
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onComparePointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current) {
      moveSliderDrag(e);
      return;
    }
    loupe.onPointerMove(e, sourceForClientX(e.clientX));
  };

  const onDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    beginSliderDrag(e);
  };

  const onComparePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) return;
    // Mouse/pen: jump divider under cursor and keep following while held.
    if (e.pointerType !== 'touch') {
      beginSliderDrag(e);
      return;
    }
    loupe.onTouchStart(e, sourceForClientX(e.clientX));
  };

  const onComparePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      endSliderDrag(e);
      return;
    }
    loupe.onTouchEnd();
  };

  return (
    <div className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-label-sm uppercase tracking-widest text-primary">Before / after</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-border-subtle px-3 py-1 text-label-md disabled:opacity-40"
          >
            Prev
          </button>
          <label className="flex items-center gap-1.5 font-mono text-label-md">
            <span className="sr-only">Page</span>
            <select
              value={page}
              disabled={pageCount < 1}
              onChange={(e) => setPage(Number(e.target.value))}
              className="rounded border border-border-subtle bg-surface-container-lowest px-2 py-1 font-mono text-label-md"
              aria-label="Select page"
            >
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-text-secondary">/ {pageCount || '—'}</span>
          </label>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="rounded border border-border-subtle px-3 py-1 text-label-md disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex gap-2 md:hidden">
        {(['before', 'after'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMobileTab(t)}
            className={`rounded-lg px-4 py-2 text-label-md ${
              mobileTab === t ? 'bg-primary text-on-primary' : 'border border-border-subtle'
            }`}
          >
            {t === 'before' ? 'Before' : 'After'}
          </button>
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-lg bg-surface-container-highest">
        {/*
          Desktop: after is the base (right of divider); before is clipped to the left.
          clip-path inset(0, 100-slider%, 0, 0) keeps the left portion of the top layer.
          Only one layout mounts (isDesktop) so img refs stay on visible elements.
        */}
        {isDesktop ? (
        <div
          ref={compareRef}
          className="relative select-none"
          onPointerMove={onComparePointerMove}
          onPointerLeave={loupe.onPointerLeave}
          onPointerDown={onComparePointerDown}
          onPointerUp={onComparePointerUp}
          onPointerCancel={onComparePointerUp}
        >
          {afterPlaceholder ? (
            <div className="flex min-h-[240px] items-center justify-center p-6 text-center text-label-md text-text-secondary">
              {afterPlaceholder}
            </div>
          ) : (
            <SideImage
              url={afterUrl}
              error={afterErr}
              loadingLabel="Loading after…"
              onRetry={() => retry('after')}
              imgRef={afterImgRef}
            />
          )}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
          >
            <SideImage
              url={beforeUrl}
              error={beforeErr}
              loadingLabel="Loading before…"
              onRetry={() => retry('before')}
              imgRef={beforeImgRef}
            />
          </div>
          <div
            role="slider"
            aria-label="Before/after divider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(slider)}
            tabIndex={0}
            className="absolute inset-y-0 z-10 w-5 -translate-x-1/2 cursor-col-resize touch-none"
            style={{ left: `${slider}%` }}
            onPointerDown={onDividerPointerDown}
            onPointerMove={moveSliderDrag}
            onPointerUp={endSliderDrag}
            onPointerCancel={endSliderDrag}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setSlider((v) => Math.max(0, v - 2));
              if (e.key === 'ArrowRight') setSlider((v) => Math.min(100, v + 2));
            }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" />
          </div>
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/50 px-2 py-0.5 text-label-sm text-white">
            Before
          </div>
          <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/50 px-2 py-0.5 text-label-sm text-white">
            After
          </div>
        </div>
        ) : (
        <div>
          {mobileTab === 'before' ? (
            <SideImage
              url={beforeUrl}
              error={beforeErr}
              loadingLabel="Loading before…"
              onRetry={() => retry('before')}
              imgRef={beforeImgRef}
              loupe={loupe}
            />
          ) : afterPlaceholder ? (
            <div className="flex min-h-[240px] items-center justify-center p-6 text-center text-label-md text-text-secondary">
              {afterPlaceholder}
            </div>
          ) : (
            <SideImage
              url={afterUrl}
              error={afterErr}
              loadingLabel="Loading after…"
              onRetry={() => retry('after')}
              imgRef={afterImgRef}
              loupe={loupe}
            />
          )}
        </div>
        )}

      </div>

      {loupe.loupe &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[10000] overflow-hidden rounded-full border-2 border-primary"
            style={{
              left: loupe.loupe.clientX,
              top: loupeTop(loupe.loupe.clientY, loupe.loupe.isTouch),
              transform: loupeTransform(loupe.loupe.isTouch),
              width: LOUPE_DISPLAY_PX,
              height: LOUPE_DISPLAY_PX,
              touchAction: 'none',
            }}
            aria-hidden
          >
            <canvas
              ref={loupe.loupeCanvasRef}
              width={LOUPE_CANVAS_PX}
              height={LOUPE_CANVAS_PX}
              className="block h-full w-full"
              style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.45))' }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

function SideImage({
  url,
  error,
  loadingLabel,
  onRetry,
  imgRef,
  loupe,
}: {
  url?: string;
  error?: string;
  loadingLabel: string;
  onRetry: () => void;
  imgRef: React.MutableRefObject<HTMLImageElement | null>;
  loupe?: ReturnType<typeof useEcoCompareLoupe>;
}) {
  if (error) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-body-md text-text-secondary">Couldn&apos;t render this page</p>
        <p className="max-w-sm text-label-sm text-text-secondary/80">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-border-subtle px-4 py-2 text-label-md"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-label-md text-text-secondary">
        {loadingLabel}
      </div>
    );
  }
  return (
    <img
      ref={imgRef}
      src={url}
      alt=""
      className="block w-full select-none"
      draggable={false}
      onPointerMove={loupe ? (e) => loupe.onPointerMove(e, imgRef.current) : undefined}
      onPointerLeave={loupe?.onPointerLeave}
      onPointerDown={loupe ? (e) => loupe.onTouchStart(e, imgRef.current) : undefined}
      onPointerUp={loupe?.onTouchEnd}
      onPointerCancel={loupe?.onTouchEnd}
      style={loupe ? { touchAction: 'none' } : undefined}
    />
  );
}
