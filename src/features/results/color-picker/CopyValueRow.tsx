import { useCallback, useState } from 'react';
import type { ColorSwatchRowProps } from '@/features/results/types';

export function CopyValueRow({ label, value, mono = true }: ColorSwatchRowProps & { mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  }, [value]);

  return (
    <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-background px-3 py-3">
      <span className="text-label-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-body-md text-primary ${mono ? 'font-mono' : ''}`}>{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-text-secondary transition-colors hover:text-secondary"
          aria-label={`Copy ${label}`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>
    </div>
  );
}
