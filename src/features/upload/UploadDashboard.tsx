import { useCallback, useEffect, useRef, type MouseEvent } from 'react';
import AnalysisParams from '@/features/upload/AnalysisParams';
import FeatureCards from '@/features/layout/FeatureCards';
import HistoryDetailPanel from '@/features/upload/HistoryDetailPanel';
import RecentAnalysisCard from '@/features/upload/RecentAnalysisCard';
import { useAnalysisSessionContext } from '@/features/session/AnalysisSessionContext';

export default function UploadDashboard() {
  const {
    initialTab,
    setInitialTab,
    thresholds,
    setRgbThreshold,
    setCmykInkThreshold,
    cmykIncludeAnnotations,
    setCmykIncludeAnnotations,
    handleFileSelected,
    uploadError,
    clearUploadError,
    history,
    handleHistorySelect,
    handleHistoryDelete,
    selectedHistoryEntry,
    handleHistoryClose,
  } = useAnalysisSessionContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const historyDetailRef = useRef<HTMLDivElement>(null);
  const heroBacklitRef = useRef<HTMLDivElement>(null);

  const onHeroMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = heroBacklitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const strength = 12;
    const perspective = 600;
    const scale = 1.03;
    el.style.transform = `perspective(${perspective}px) rotateY(${x * strength}deg) rotateX(${y * -strength}deg) scale(${scale})`;
  }, []);

  const onHeroMouseLeave = useCallback(() => {
    if (heroBacklitRef.current) {
      heroBacklitRef.current.style.transform = '';
    }
  }, []);

  useEffect(() => {
    if (selectedHistoryEntry && historyDetailRef.current) {
      historyDetailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedHistoryEntry]);

  const onDragActive = useCallback((active: boolean) => {
    const el = dropZoneRef.current;
    if (!el) return;
    if (active) el.classList.add('drag-zone-active');
    else el.classList.remove('drag-zone-active');
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file && file.type === 'application/pdf') {
        clearUploadError();
        handleFileSelected(file);
      }
    },
    [clearUploadError, handleFileSelected],
  );

  return (
    <>
      <section className="mx-auto max-w-container-max px-margin-edge pb-12 pt-16">
        <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
          <div className="md:col-span-7">
            <h1 className="mb-4 text-display font-bold text-text-primary">PDF Colors Checker</h1>
            <p className="max-w-2xl text-body-lg text-text-secondary">
              Analyze any PDF for print readiness — color vs black-and-white pages, CMYK ink
              coverage, and color profile inspection. All processing runs in your browser; your
              file never leaves your device.
            </p>
          </div>
          <div className="hidden md:col-span-5 md:block">
            <div
              ref={heroBacklitRef}
              className="hero-backlit"
              onMouseMove={onHeroMouseMove}
              onMouseLeave={onHeroMouseLeave}
            >
              <div className="hero-backlit-border">
                <div className="hero-backlit-frame aspect-video w-full">
                  <img
                    src={`${import.meta.env.BASE_URL}hero-dashboard.png`}
                    alt=""
                    className="relative z-10 h-full w-full object-cover opacity-60"
                  />
                  <div
                    className="absolute inset-0 z-20 bg-gradient-to-tr from-background/80 to-transparent"
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-edge pb-16">
        <div className="rounded-xl border border-border-subtle bg-surface p-8 shadow-sm">
          <div className="flex flex-col gap-12 md:flex-row">
            <div className="flex flex-col gap-8 md:w-1/3">
              <div>
                <h3 className="mb-4 text-label-sm uppercase tracking-widest text-primary">
                  Analysis parameters
                </h3>
                <AnalysisParams
                  initialTab={initialTab}
                  setInitialTab={setInitialTab}
                  rgbThreshold={thresholds.rgb}
                  setRgbThreshold={setRgbThreshold}
                  cmykInkThreshold={thresholds.cmykInk}
                  setCmykInkThreshold={setCmykInkThreshold}
                  cmykIncludeAnnotations={cmykIncludeAnnotations}
                  setCmykIncludeAnnotations={setCmykIncludeAnnotations}
                  idPrefix="upload-"
                />
              </div>
            </div>

            <div className="md:w-2/3">
              {uploadError && (
                <div
                  className="mb-4 rounded-lg border border-error/40 bg-error-container/20 px-4 py-3 text-body-md text-error"
                  role="alert"
                >
                  {uploadError}
                </div>
              )}
              <div
                ref={dropZoneRef}
                className="group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle transition-all duration-300 hover:border-primary/50 hover:bg-surface-container-low"
                onDragEnter={(e) => {
                  e.preventDefault();
                  onDragActive(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  e.preventDefault();
                  onDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDragActive(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="pointer-events-none p-8 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-highest transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-[32px] text-primary">upload_file</span>
                  </div>
                  <h2 className="mb-2 text-headline-md font-semibold text-text-primary">Drop your PDF here</h2>
                  <p className="mb-8 text-body-md text-text-secondary">or click to browse</p>
                  <span className="inline-block rounded-lg bg-primary px-8 py-3 text-label-md font-bold text-on-primary shadow-lg">
                    Select PDF file
                  </span>
                  <p className="mt-8 text-label-sm uppercase tracking-widest text-text-secondary/40">
                    Single PDF · processed in your browser
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-headline-md font-semibold text-text-primary">Recent analysis</h2>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
              {history.map((entry) => (
                <RecentAnalysisCard
                  key={entry.fileHash}
                  entry={entry}
                  selected={selectedHistoryEntry?.fileHash === entry.fileHash}
                  onSelect={handleHistorySelect}
                  onDelete={handleHistoryDelete}
                />
              ))}
            </div>

            {selectedHistoryEntry && (
              <div ref={historyDetailRef} className="mt-8">
                <HistoryDetailPanel entry={selectedHistoryEntry} onClose={handleHistoryClose} />
              </div>
            )}
          </div>
        )}
      </section>

      <FeatureCards />
    </>
  );
}
