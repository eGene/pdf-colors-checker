# Test fixtures

Public PDF samples for manual and scripted regression of the three analysis modes.

## Setup

```bash
cd test-fixtures
bash download-fixtures.sh
```

Requires `curl`. Ghostscript (`gs`) is optional but needed to generate `color-or-grayscale-test.pdf` and for CMYK ink coverage checks.

From the project root:

```bash
yarn fixtures:download
```

## Expected results

Use these tables for **manual** checks in the app (RGB / CMYK / profile tabs). Automated fixture tests under `tests/fixtures/` use the same expectations from `fixtures.json` (`yarn fixtures:download`, then `yarn test`).

| Fixture | Pages | RGB color pages | CMYK color @ 0% | CMYK color @ 0.5% | Profile spaces |
| --- | ---: | --- | --- | --- | --- |
| `grayscale-image.pdf` | 1 | — | — | — | GRAYSCALE |
| `cmyk-image.pdf` | 1 | 1 | 1 | 1 | CMYK |
| `pdflatex-image.pdf` | 1 | 1 | 1 | 1 | RGB |
| `crazyones-pdfa.pdf` | 1 | — | — | — | (ICC output intent only) |
| `pdflatex-4-pages.pdf` | 4 | — | — | — | (none) |
| `pdfkit.pdf` | 1 | — | 1 | — | GRAYSCALE, RGB |
| `spot-and-annotation.pdf` | 1 | 1 | 1 | 1 | CMYK, SPOT COLOR |
| `ocrmypdf-cmyk.pdf` | 1 | 1 | 1 | 1 | CMYK (+ ICC) |
| `color-or-grayscale-test.pdf` | 4 | 3 | 2, 3 | 2, 3 | (optional, needs `gs`) |

“—” = no color pages expected. Page numbers are **1-based**.

Notes:

- **Profile vs pixels**: `grayscale-image.pdf` and `cmyk-image.pdf` from py-pdf store their image as an `Indexed` (palette) color space. The profile scanner resolves the indexed *base* space, so they report **GRAYSCALE** and **CMYK** respectively — even though the RGB tab still rasterizes `cmyk-image` to color pixels. (RGB and CMYK tabs can disagree with the profile tab; see below.)
- **`crazyones-pdfa.pdf`**: PDF/A with embedded ICC via OutputIntent; text is black-only in inkcov (K plate only, no C/M/Y).
- **`pdfkit.pdf`**: declares an uncolored Pattern color space `[/Pattern /DeviceRGB]` and a `DeviceGray` space — exercises Pattern base-space resolution. It renders as rich gray (equal C=M=Y=K), so it is color at the 0% ink threshold but B/W at 0.5%.
- **`spot-and-annotation.pdf`** (generated, no deps): a `Separation` spot color (`GoSignTestSpot`) lives in the page resources, while a `DeviceCMYK` space is reachable **only** through an annotation `/AP /N` appearance stream. This is the regression guard for spot-color detection and annotation-appearance scanning — if annotation traversal breaks, the profile drops `CMYK`. Built by `generate-spot-annot.py` (byte-exact, MIT-style/your own license).

### `color-or-grayscale-test.pdf` (Ghostscript reference)

Four landscape strips (595×210 pt each), from [Ghostscript inkcov docs](https://ghostscript.readthedocs.io/en/latest/Devices.html#ink-coverage-devices):

| Page | Content | RGB tab | CMYK tab |
| ---: | --- | --- | --- |
| 1 | 100% black (K only) | B/W | B/W (K only) |
| 2 | 50% rich RGB gray | B/W (equal R=G=B) | COLOR (C/M/Y/K all used) |
| 3 | 50% rich CMYK gray | COLOR (unequal RGB after render) | COLOR |
| 4 | 50% DeviceGray | B/W | B/W (K only) |

Page 2 vs 3 is the key RGB-vs-CMYK split: equal RGB gray looks B/W to the pixel scan but still counts as color ink in inkcov.

Generated only when `gs` is installed (`bash download-fixtures.sh`).

## What each tab measures

| Tab | Method | Use fixture to test |
| --- | --- | --- |
| **Color vs B&W (RGB)** | Rendered pixels | `grayscale-image`, `pdflatex-image`, GS page 1 vs 2 |
| **Ink coverage (CMYK)** | Ghostscript `inkcov` | `cmyk-image`, `color-or-grayscale-test` |
| **Color profile** | PDF `/ColorSpace` resources (ColorSpace, XObject, Form, Shading, Pattern, and annotation `/AP` appearances) | `ocrmypdf-cmyk` (CMYK), `crazyones-pdfa` (ICC), `pdfkit` (Pattern), `spot-and-annotation` (spot + annotation) |

RGB and CMYK can disagree on the same file (e.g. RGB images that rasterize as color but carry little CMY ink after conversion). That is expected.

## Licenses

- **py-pdf/sample-files**: [CC-BY-SA-4.0](https://github.com/py-pdf/sample-files)
- **OCRmyPDF `cmyk.pdf`**: see [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF)
- **`color-or-grayscale-test.pdf`**: generated locally; not redistributed in git (see `.gitignore`)

## Manual regression (local only)

For marketing PDFs with mixed RGB images and low CMY ink (e.g. Vestd share-schemes guide), keep a copy outside the repo and compare RGB vs CMYK tabs after changes. Do not commit copyrighted files.

Machine-readable expectations live in `fixtures.json`.
