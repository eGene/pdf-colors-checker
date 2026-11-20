import { PICINEZ_URL } from '@/lib/constants';

export default function PartnerAd() {
  return (
    <a
      href={PICINEZ_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="partner-ad-border group mb-6 block no-underline transition-opacity hover:opacity-95 active:opacity-90"
      aria-label="Working with images, not PDFs? Try Picinez — batch watermarks, effects, resize, crop for social and more"
    >
      <div className="partner-ad-frame flex min-h-[6.25rem] w-full flex-col bg-[#0d1117] px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-[#4ade80]">
          Partner
        </span>

        <div className="mt-2.5 flex w-full flex-1 items-center gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#30363d] bg-[#161b22]"
            aria-hidden
          >
            <span className="material-symbols-outlined text-[20px] text-[#9ca3af]">
              photo_library
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-tight text-white">
              Working with images, not PDFs?
            </p>
            <p className="mt-1.5 truncate text-[14px] leading-snug text-[#c9d1d9]">
              Batch watermarks, effects, resize, crop for social &amp; more ·{' '}
              <span className="text-[#4ade80]">Picinez</span>
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-[#3b82f6] px-5 py-1.5 text-[13px] font-bold tracking-tight text-white transition-all group-hover:bg-[#2563eb] group-active:scale-95">
            Try it
          </span>
        </div>

        <span className="mt-1 hidden self-end text-[14px] italic text-[#9ca3af] sm:inline">
          Free in your browser
        </span>
      </div>
    </a>
  );
}
