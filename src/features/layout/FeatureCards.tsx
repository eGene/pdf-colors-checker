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
];

export default function FeatureCards() {
  return (
    <section className="mx-auto max-w-container-max px-margin-edge pb-16">
      <p className="mb-6 text-label-sm uppercase tracking-widest text-text-secondary">
        Spot colors, ICC output intent, and per-page ink coverage
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
    </section>
  );
}
