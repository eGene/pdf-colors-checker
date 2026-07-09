import { FOOTER_LINKS } from '@/lib/constants';
import SocialShareIcons from '@/features/layout/SocialShareIcons';

export default function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto w-full border-t border-border-subtle bg-surface-dim py-8">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-4 px-margin-edge md:flex-row">
        <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
          <span className="font-semibold text-text-primary">PDF Colors Checker</span>
          <nav className="flex flex-wrap justify-center gap-6">
            <a
              href={FOOTER_LINKS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="text-label-md text-text-secondary transition-colors hover:text-text-primary hover:underline"
            >
              Privacy Policy
            </a>
            <a
              href={FOOTER_LINKS.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="text-label-md text-text-secondary transition-colors hover:text-text-primary hover:underline"
            >
              Terms of Service
            </a>
            <a
              href={FOOTER_LINKS.support}
              target="_blank"
              rel="noopener noreferrer"
              className="text-label-md text-text-secondary transition-colors hover:text-text-primary hover:underline"
            >
              Support
            </a>
            <a
              href={FOOTER_LINKS.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-label-md text-text-secondary transition-colors hover:text-text-primary hover:underline"
            >
              Source
            </a>
          </nav>
        </div>
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <SocialShareIcons />
          <p className="text-center text-label-md text-text-secondary md:text-right">
            © {year} GoSignPDF
          </p>
        </div>
      </div>
    </footer>
  );
}
