import { ASKYOURPDF_AFFILIATE_URL } from '@/lib/constants';

export default function PartnerAd() {
  return (
    <a
      href={ASKYOURPDF_AFFILIATE_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="partner-ad-border group mb-6 block no-underline transition-opacity hover:opacity-95 active:opacity-90"
      aria-label="Chat with your PDF — summarize or ask questions with AskYourPDF"
    >
      <div className="partner-ad-frame flex min-h-[5.75rem] w-full flex-col bg-[#0d1117] px-4 py-2.5">
        <span className="text-[10px] font-medium uppercase tracking-widest text-[#4ade80]">
          Sponsored
        </span>

        <div className="mt-2.5 flex w-full flex-1 items-center gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#30363d] bg-[#161b22]"
            aria-hidden
          >
            <span className="material-symbols-outlined text-[20px] text-[#9ca3af]">forum</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight text-white">
              Chat with your PDF
            </p>
            <p className="mt-0.5 truncate text-[12px] leading-tight text-[#9ca3af]">
              Summarize or ask questions ·{' '}
              <span className="text-[#4ade80]">AskYourPDF</span>
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-[#3b82f6] px-5 py-1.5 text-[13px] font-bold tracking-tight text-white transition-all group-hover:bg-[#2563eb] group-active:scale-95">
            Try it
          </span>
        </div>

        <span className="mt-1.5 hidden self-end text-[9px] italic text-[#9ca3af]/60 sm:inline">
          Partner · we may earn a commission
        </span>
      </div>
    </a>
  );
}
