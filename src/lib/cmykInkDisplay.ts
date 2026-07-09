/** Ink coverage 0–100 */
export function formatInkPercent(value: number): string {
  const v = Math.max(0, value);
  if (v === 0) return '0%';
  if (v < 0.01) return '<0.01%';
  if (v < 1) return `${v.toFixed(2)}%`;
  if (v < 10) return `${v.toFixed(1)}%`;
  return `${v.toFixed(0)}%`;
}

/** Bar fill width 0–100; tiny non-zero values stay visible. */
export function inkBarWidthPercent(value: number): number {
  const v = Math.max(0, Math.min(100, value));
  if (v === 0) return 0;
  if (v < 100) return Math.max(v, 2);
  return 100;
}
