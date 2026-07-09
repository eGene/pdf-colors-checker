import { getShareUrls } from '@/lib/constants';

const iconClass = 'h-5 w-5';

function IconX() {
  return (
    <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zm1.777 13.019H3.56V9h3.554v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454c.98 0 1.775-.773 1.775-1.729V1.729C24 .774 23.205 0 22.225 0z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const SHARE_ITEMS = [
  { key: 'x' as const, label: 'Share on X', Icon: IconX },
  { key: 'linkedin' as const, label: 'Share on LinkedIn', Icon: IconLinkedIn },
  { key: 'facebook' as const, label: 'Share on Facebook', Icon: IconFacebook },
];

function openShare(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=520');
}

export default function SocialShareIcons() {
  const urls = getShareUrls();
  return (
    <div className="flex items-center gap-4 text-text-secondary">
      {SHARE_ITEMS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => openShare(urls[key])}
          className="cursor-pointer border-0 bg-transparent p-0 transition-colors duration-200 hover:text-text-primary"
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
