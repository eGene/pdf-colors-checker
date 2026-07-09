#!/usr/bin/env bash
# Download public-domain / CC-licensed PDF fixtures for colors-checker testing.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PY_PDF_BASE="https://raw.githubusercontent.com/py-pdf/sample-files/main"

download() {
  local url="$1"
  local out="$2"
  if [[ -f "$out" ]]; then
    echo "skip (exists): $out"
    return 0
  fi
  echo "download: $out"
  curl -fsSL "$url" -o "$out"
}

echo "=== py-pdf/sample-files (CC-BY-SA-4.0) ==="
download "$PY_PDF_BASE/019-grayscale-image/grayscale-image.pdf" grayscale-image.pdf
download "$PY_PDF_BASE/023-cmyk-image/cmyk-image.pdf" cmyk-image.pdf
download "$PY_PDF_BASE/003-pdflatex-image/pdflatex-image.pdf" pdflatex-image.pdf
download "$PY_PDF_BASE/021-pdfa/crazyones-pdfa.pdf" crazyones-pdfa.pdf
download "$PY_PDF_BASE/004-pdflatex-4-pages/pdflatex-4-pages.pdf" pdflatex-4-pages.pdf
download "$PY_PDF_BASE/022-pdfkit/pdfkit.pdf" pdfkit.pdf

echo "=== OCRmyPDF test resources ==="
download "https://raw.githubusercontent.com/ocrmypdf/OCRmyPDF/main/tests/resources/cmyk.pdf" ocrmypdf-cmyk.pdf

echo "=== Locally generated: Separation spot color + annotation appearance (no deps) ==="
if [[ ! -f spot-and-annotation.pdf ]]; then
  python3 generate-spot-annot.py spot-and-annotation.pdf
else
  echo "skip (exists): spot-and-annotation.pdf"
fi

echo "=== Ghostscript inkcov reference (4 pages, known CMYK outcomes) ==="
if command -v gs >/dev/null 2>&1; then
  if [[ ! -f color-or-grayscale-test.pdf ]]; then
    gs -o color-or-grayscale-test.pdf -sDEVICE=pdfwrite -g5950x2105 \
      -c "/F1 {10 80 moveto /Helvetica findfont 64 scalefont setfont} def" \
      -c "F1                         (100% pure black)    show showpage" \
      -c "F1 .5 .5 .5   setrgbcolor  (50% rich rgbgray)  show showpage" \
      -c "F1 .5 .5 .5 0 setcmykcolor (50% rich cmykgray) show showpage" \
      -c "F1 .5         setgray      (50% pure gray)     show showpage"
    echo "generated: color-or-grayscale-test.pdf"
  else
    echo "skip (exists): color-or-grayscale-test.pdf"
  fi
else
  echo "warn: gs not found — skipping color-or-grayscale-test.pdf (install Ghostscript to generate)"
fi

echo "done. Run: yarn test (from project root, after yarn fixtures:download)"
