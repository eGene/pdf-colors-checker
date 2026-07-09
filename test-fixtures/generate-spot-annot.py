#!/usr/bin/env python3
"""Generate a deterministic fixture: a Separation (spot) color on the page plus a
DeviceCMYK color space reachable *only* through an annotation appearance stream.

This targets two color-profile code paths that public samples don't cover:
  - Separation spot color detection in page /Resources /ColorSpace
  - color spaces inside annotation /AP /N Form XObjects

Expected profile result: spaces {CMYK, SPOT COLOR}, spot "GoSignTestSpot".
The CMYK space exists ONLY inside the annotation appearance, so a correct
scanner must descend into /Annots -> /AP -> /N to report it.

Pure standard library; no external dependencies. Byte-exact, reproducible output.
"""
from __future__ import annotations

import sys
from pathlib import Path


def build_pdf() -> bytes:
    # Object bodies (1-indexed; index 0 is the free head).
    objects: list[bytes] = [
        b"",  # placeholder for object 0
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] "
            b"/Resources << /ColorSpace << /SpotCS [/Separation /GoSignTestSpot /DeviceCMYK 5 0 R] >> >> "
            b"/Contents 4 0 R /Annots [6 0 R] >>"
        ),
        None,  # object 4: page content stream (filled below)
        # Tint transform for the Separation: maps tint 0..1 to a CMYK ramp.
        b"<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 1 1 0] /N 1 >>",
        (
            b"<< /Type /Annot /Subtype /Square /Rect [10 10 100 100] "
            b"/AP << /N 7 0 R >> >>"
        ),
        None,  # object 7: appearance Form XObject (filled below)
    ]

    page_stream = b"/SpotCS cs 0.6 scn 20 20 160 160 re f\n"
    objects[4] = (
        b"<< /Length " + str(len(page_stream)).encode() + b" >>\nstream\n"
        + page_stream + b"endstream"
    )

    ap_stream = b"/Cs1 cs 0 0 0 1 scn 0 0 90 90 re f\n"
    objects[7] = (
        b"<< /Type /XObject /Subtype /Form /BBox [0 0 90 90] "
        b"/Resources << /ColorSpace << /Cs1 /DeviceCMYK >> >> "
        b"/Length " + str(len(ap_stream)).encode() + b" >>\nstream\n"
        + ap_stream + b"endstream"
    )

    out = bytearray(b"%PDF-1.5\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0] * len(objects)
    for i in range(1, len(objects)):
        offsets[i] = len(out)
        out += str(i).encode() + b" 0 obj\n" + objects[i] + b"\nendobj\n"

    xref_pos = len(out)
    n = len(objects)
    out += b"xref\n0 " + str(n).encode() + b"\n"
    out += b"0000000000 65535 f \n"
    for i in range(1, n):
        out += f"{offsets[i]:010d} 00000 n \n".encode()
    out += (
        b"trailer\n<< /Size " + str(n).encode() + b" /Root 1 0 R >>\n"
        b"startxref\n" + str(xref_pos).encode() + b"\n%%EOF\n"
    )
    return bytes(out)


def main() -> int:
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("spot-and-annotation.pdf")
    out_path.write_bytes(build_pdf())
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
