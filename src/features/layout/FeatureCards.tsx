const FEATURES = [
  {
    icon: 'palette',
    iconClass: 'text-secondary',
    title: 'Color vs B&W pages',
    body: 'Find which pages look color and which look black-and-white by scanning rendered pixels. Fast — ideal for estimating print cost.',
  },
  {
    icon: 'opacity',
    iconClass: 'text-primary',
    title: 'CMYK ink coverage',
    body: 'Measure cyan, magenta, yellow, and black ink per page using Ghostscript. Runs locally in your browser.',
  },
  {
    icon: 'dataset',
    iconClass: 'text-tertiary',
    title: 'Color profile & print readiness',
    body: 'Detect RGB, CMYK, and grayscale in PDF Resources. List spot-color names and ICC output intent when the document declares one.',
  },
  {
    icon: 'colorize',
    iconClass: 'text-primary',
    title: 'Color picker',
    body: 'Click anywhere on a rendered page to sample HEX, RGB, and approximate CMYK from pixels — an eyedropper for PDF artwork in your browser.',
  },
] as const;

const SAVE_INK = {
  icon: 'water_drop',
  iconClass: 'text-secondary',
  title: 'Save Ink',
  body: 'Optimize a copy for less ink or toner — grayscale, lighter images, economy text, or flatten — entirely on your device. Your file never leaves your browser.',
} as const;

export default function FeatureCards() {
  return (
    <section className="mx-auto max-w-container-max px-margin-edge pb-16">
      <p className="mb-6 text-label-sm uppercase tracking-widest text-text-secondary">
        Spot colors, ICC output intent, per-page ink coverage, and Save Ink
      </p>
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-4">
        {FEATURES.map(({ icon, iconClass, title, body }) => (
          <article
            key={title}
            className="rounded-xl border border-border-subtle bg-surface p-8 transition-colors hover:bg-surface-container-low"
          >
            <span className={`material-symbols-outlined mb-6 text-4xl ${iconClass}`}>{icon}</span>
            <h2 className="mb-3 text-headline-md font-semibold text-text-primary">{title}</h2>
            <p className="text-body-md text-text-secondary">{body}</p>
          </article>
        ))}
      </div>
      <article className="mt-gutter rounded-xl border border-border-subtle bg-surface p-8 transition-colors hover:bg-surface-container-low md:flex md:items-start md:gap-8">
        <span className={`material-symbols-outlined mb-6 shrink-0 text-4xl md:mb-0 ${SAVE_INK.iconClass}`}>
          {SAVE_INK.icon}
        </span>
        <div>
          <h2 className="mb-3 text-headline-md font-semibold text-text-primary">{SAVE_INK.title}</h2>
          <p className="max-w-3xl text-body-md text-text-secondary">{SAVE_INK.body}</p>
        </div>
      </article>
    </section>
  );
}
