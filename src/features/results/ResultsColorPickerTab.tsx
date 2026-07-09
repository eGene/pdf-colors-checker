import { createPortal } from 'react-dom';
import { LOUPE_CANVAS_PX, LOUPE_DISPLAY_PX } from '@/lib/colorConvert';
import { CopyValueRow } from '@/features/results/color-picker/CopyValueRow';
import {
  loupeTop,
  loupeTransform,
  useColorPickerLoupe,
} from '@/features/results/color-picker/useColorPickerLoupe';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';
import type { ColorPick } from '@/types/pdf';

const SCROLL_VIEWER_MAX_H = 'min(75vh, 900px)';

function ColorPickerTabInner({
  pages,
  pageIndex,
  setPageIndex,
  picks,
  setPicks,
  currentPick,
  setCurrentPick,
}: {
  pages: string[];
  pageIndex: number;
  setPageIndex: (index: number) => void;
  picks: ColorPick[];
  setPicks: React.Dispatch<React.SetStateAction<ColorPick[]>>;
  currentPick: ColorPick | null;
  setCurrentPick: React.Dispatch<React.SetStateAction<ColorPick | null>>;
}) {
  const {
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
  } = useColorPickerLoupe({
    pages,
    pageIndex,
    setPageIndex,
    setPicks,
    setCurrentPick,
  });

  const totalPages = pages.length;
  const displayPick = currentPick ?? picks[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-border-subtle bg-surface p-4 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-label-sm uppercase tracking-widest text-text-secondary">
                PDF page viewer
              </span>
              <div className="flex items-center gap-2 text-label-sm text-text-secondary">
                <span className="material-symbols-outlined text-[18px] text-primary">info</span>
                Scroll and click any page to pick a color. On touch devices, press and drag — the loupe appears below your finger.
              </div>
            </div>
            <div
              ref={scrollRef}
              className={`overflow-y-auto rounded-lg bg-surface-container-lowest px-3 py-4 md:px-4 ${
                loupe && !loupe.isTouch ? 'cursor-none' : 'cursor-crosshair'
              }`}
              style={{ maxHeight: SCROLL_VIEWER_MAX_H }}
              onMouseLeave={onScrollAreaLeave}
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-8">
                {pages.map((src, idx) => (
                  <div
                    key={idx}
                    id={`picker-page-${idx}`}
                    className={`scroll-mt-4 rounded-lg border bg-background p-2 transition-colors ${
                      pageIndex === idx ? 'border-primary/60' : 'border-border-subtle'
                    }`}
                  >
                    <p className="mb-2 px-1 font-mono text-label-sm text-text-secondary">
                      Page {idx + 1}
                    </p>
                    <div
                      role="presentation"
                      className="touch-none"
                      onMouseMove={(e) => handlePointer(e, idx, { isTouch: false })}
                      onMouseLeave={() => {
                        if (!touchPickActiveRef.current) setLoupe(null);
                      }}
                      onClick={(e) => {
                        if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === 'touch') return;
                        handlePointer(e, idx, { commitPick: true, isTouch: false });
                      }}
                      onPointerDown={(e) => {
                        if (e.pointerType !== 'touch') return;
                        e.preventDefault();
                        touchPickActiveRef.current = true;
                        handlePointer(e, idx, { isTouch: true });
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (e.pointerType !== 'touch' || !touchPickActiveRef.current) return;
                        e.preventDefault();
                        handlePointer(e, idx, { isTouch: true });
                      }}
                      onPointerUp={(e) => {
                        if (e.pointerType !== 'touch') return;
                        handlePointer(e, idx, { commitPick: true, isTouch: true });
                        touchPickActiveRef.current = false;
                        try {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        } catch {
                          // ignore
                        }
                      }}
                      onPointerCancel={(e) => {
                        if (e.pointerType !== 'touch') return;
                        onTouchPickEnd();
                      }}
                    >
                      <img
                        ref={(el) => {
                          imgRefs.current[idx] = el;
                        }}
                        src={src}
                        alt={`Page ${idx + 1}`}
                        className="block w-full select-none"
                        draggable={false}
                        onLoad={() => cacheSampler(idx)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-gutter lg:col-span-4">
          <div className="rounded-xl border border-border-subtle bg-surface p-6">
            <span className="mb-6 block text-label-sm uppercase tracking-widest text-text-secondary">
              Picked color
            </span>

            {displayPick ? (
              <>
                <div
                  className="mb-6 flex aspect-square w-full items-end justify-end rounded-xl p-4"
                  style={{ backgroundColor: displayPick.hex }}
                >
                  <div className="rounded-lg bg-black/25 px-2 py-1 font-mono text-label-sm text-white backdrop-blur-sm">
                    Page {displayPick.pageNumber} · ({displayPick.pixelX}, {displayPick.pixelY})
                  </div>
                </div>
                <div className="space-y-3">
                  <CopyValueRow label="HEX" value={displayPick.hex} />
                  <CopyValueRow label="RGB" value={`${displayPick.r}, ${displayPick.g}, ${displayPick.b}`} />
                  <CopyValueRow
                    label="CMYK"
                    value={`${displayPick.c}, ${displayPick.m}, ${displayPick.y}, ${displayPick.k}`}
                  />
                </div>
              </>
            ) : (
              <p className="text-body-md text-text-secondary">
                Click a page to sample a color. Values appear here with copy buttons.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-6">
              <div className="flex flex-wrap items-center gap-2 text-body-md text-text-secondary">
                <div className="relative">
                  <select
                    value={pageIndex}
                    onChange={(e) => onPageSelect(e.target.value)}
                    aria-label="Jump to page"
                    className="cursor-pointer appearance-none rounded border border-border-subtle bg-surface-container-lowest py-2 pl-3 pr-9 font-mono text-text-primary outline-none transition-colors focus:border-primary"
                  >
                    {pages.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Page {idx + 1}
                      </option>
                    ))}
                  </select>
                  <span
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-text-secondary"
                    aria-hidden
                  >
                    expand_more
                  </span>
                </div>
                <span>of {totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={pageIndex === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle transition-colors hover:bg-surface-container-high disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={pageIndex >= totalPages - 1}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle transition-colors hover:bg-surface-container-high disabled:opacity-30"
                  aria-label="Next page"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle border-l-4 border-l-primary bg-surface p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary">analytics</span>
              <div>
                <p className="text-body-md font-semibold text-text-primary">Browser-level sampling</p>
                <p className="mt-1 text-label-sm text-text-secondary">
                  Colors are extracted from rendered pixels in your browser. CMYK values are an
                  approximation — for device-independent ink data, use the Ink coverage tab.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {picks.length > 0 && (
        <section>
          <h3 className="mb-4 text-label-sm uppercase tracking-widest text-primary">
            Recent picks
          </h3>
          <div className="flex flex-wrap gap-6">
            {picks.map((pick) => (
              <button
                key={`${pick.hex}-${pick.pageNumber}-${pick.pixelX}-${pick.pixelY}`}
                type="button"
                onClick={() => {
                  setCurrentPick(pick);
                  setPageIndex(pick.pageIndex);
                  scrollToPage(pick.pageIndex);
                }}
                className="group flex flex-col items-center gap-2"
              >
                <div
                  className="h-12 w-12 rounded-full border border-border-subtle shadow-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: pick.hex }}
                />
                <span className="font-mono text-label-sm text-text-secondary">{pick.hex}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {loupe &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[10000] overflow-hidden rounded-full"
            style={{
              left: loupe.clientX,
              top: loupeTop(loupe.clientY, loupe.isTouch),
              transform: loupeTransform(loupe.isTouch),
              width: LOUPE_DISPLAY_PX,
              height: LOUPE_DISPLAY_PX,
            }}
            aria-hidden
          >
            <canvas
              ref={loupeCanvasRef}
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

export default function ResultsColorPickerTab() {
  const {
    pages,
    pickerPageIndex,
    setPickerPageIndex,
    colorPicks,
    setColorPicks,
    setCurrentColorPick,
    currentColorPick,
  } = useAnalysisSessionContext();

  if (!pages) return null;

  return (
    <ColorPickerTabInner
      pages={pages}
      pageIndex={pickerPageIndex}
      setPageIndex={setPickerPageIndex}
      picks={colorPicks}
      setPicks={setColorPicks}
      setCurrentPick={setCurrentColorPick}
      currentPick={currentColorPick}
    />
  );
}
