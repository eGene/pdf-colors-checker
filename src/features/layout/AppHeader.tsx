import { DONATE_URL, FEEDBACK_URL } from '@/lib/constants';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-border-subtle bg-background">
      <div className="mx-auto flex h-full max-w-container-max items-center justify-between px-margin-edge">
        <span className="text-headline-md font-semibold text-primary">PDF Colors Checker</span>
        <nav className="flex items-center gap-4">
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-4 py-2 text-label-md font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Feedback
          </a>
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary-container px-6 py-2 text-label-md font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          >
            Donate
          </a>
        </nav>
      </div>
    </header>
  );
}
