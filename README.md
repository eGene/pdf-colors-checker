# PDF Colors Checker

Browser-based PDF color analysis tool: color vs black-and-white pages, CMYK ink coverage (Ghostscript), color profile inspection, and a page color picker.

**Live:** [https://gosignpdf.com/colors-checker/](https://gosignpdf.com/colors-checker/)

Your PDF stays on your device — analysis runs entirely in the browser (no file upload to our servers).

## Features

- **Color vs B&W (RGB)** — rasterize pages and classify by pixel chroma
- **Ink coverage (CMYK)** — Ghostscript `inkcov` in WebAssembly
- **Color profile** — structural scan for RGB/CMYK/gray, spot colors, ICC (via pdf-lib)
- **Color picker** — sample HEX / RGB / approximate CMYK from rendered pages

## License

This project is licensed under the **[GNU Affero General Public License v3.0](LICENSE)** (AGPL-3.0).

### Ghostscript

CMYK analysis uses **Ghostscript 10.06** WebAssembly from [`@okathira/ghostpdl-wasm`](https://www.npmjs.com/package/@okathira/ghostpdl-wasm) (loaded at runtime from `node_modules`).

Ghostscript is copyright © Artifex Software, Inc. and is available under the AGPL (or a commercial license from Artifex). See [Artifex licensing](https://artifex.com/licensing/) and [Ghostscript](https://www.ghostscript.com/).

Correspondingly, this application is released under AGPL-3.0. If you distribute a modified version that users interact with over a network, AGPL requires that you offer them the corresponding source.

## Requirements

- Node.js 18+ (or current LTS)
- [Yarn](https://classic.yarnpkg.com/)

## Development

```bash
yarn install
yarn dev
```

Open the URL Vite prints (typically `http://localhost:5173/colors-checker/` — `base` is `/colors-checker/` to match production paths).

```bash
yarn build      # production bundle → dist/
yarn preview    # serve dist/ locally
yarn lint
```

### Test fixtures (optional)

```bash
yarn fixtures:download
```

Sample PDFs are downloaded locally (gitignored). See `test-fixtures/README.md`.

## Testing

```bash
yarn fixtures:download   # download sample PDFs (gitignored; required for fixture tests)
yarn test                # run Vitest once
yarn test:watch          # watch mode
yarn typecheck           # TypeScript strict check
```

Unit tests cover `src/lib/` helpers. Fixture tests under `tests/fixtures/` compare profile and pdf2png output against `test-fixtures/fixtures.json`. If PDFs are missing, those tests skip with a message — run `yarn fixtures:download` first.

## Production build

```bash
yarn build
```

Output is under `dist/`.

## Privacy

- PDF bytes are processed in-memory / via browser APIs in your session. Nothing is uploaded to GoSignPDF servers for analysis.
- See GoSignPDF [Privacy Policy](https://gosignpdf.com/legal/privacy-policy/) for the product site.
