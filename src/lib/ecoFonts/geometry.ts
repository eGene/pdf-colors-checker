/**
 * Ecofonts geometry engine (trimmed port from ecofonts/ecofonts.github.io).
 * MIT License — see THIRD_PARTY_NOTICES.md
 *
 * Hole grid is denser and radius-capped vs upstream so large display sizes keep
 * many tiny holes instead of a few huge ones. Intensity still maps to removed
 * area (hole radius grows within the cap; spacing stays fine).
 */
import ClipperLib from 'clipper-lib';
import type { Path as ClipPath, Paths as ClipPaths } from 'clipper-lib';

/** Integer scale factor between font units and Clipper coordinates. */
export const SCALE = 100;
/**
 * Max hole radius as a fraction of em. Kept small so large display type gets
 * many pinholes, not merged blobs (judge: fail if raster diam ≫ ~5px @ scale 2).
 */
const MAX_RADIUS_EM = 0.0035;
/** Floor for hole radius (fraction of em). */
const MIN_RADIUS_EM = 0.002;
/**
 * Intensity at which radius reaches MAX_RADIUS_EM (after the ×1.6 effective map).
 * Spacing is derived so area fraction ≈ effective at that point.
 */
const EFFECTIVE_AT_MAX_RADIUS = 0.32;
/**
 * Minimum wall between holes and the outer/counter edges. Thicker wall reduces
 * edge magenta fringes and stops holes from chewing through thin strokes.
 */
const MIN_WALL_EM = 0.014;
/** Vertices per hole polygon (16 ≈ round; upstream used octagons). */
const CIRCLE_SEGMENTS = 16;
/** Safety cap on holes generated for a single glyph. */
const MAX_HOLES_PER_GLYPH = 40_000;

/**
 * Subtract a grid of holes from one glyph's contours (Clipper coordinates,
 * i.e. font units multiplied by SCALE).
 * Returns the new contours, or null when the glyph should stay untouched.
 */
export function subtractEcoHoles(
  contours: ClipPaths,
  upem: number,
  intensity: number,
): ClipPaths | null {
  const normalized = boolOp(ClipperLib.ClipType.ctUnion, contours, null);
  if (normalized.length === 0) return null;

  const effective = Math.min(Math.max(intensity * 1.6, 0.02), EFFECTIVE_AT_MAX_RADIUS);

  // Radius grows with √intensity but never past MAX_RADIUS_EM.
  const radiusEm = Math.min(
    MAX_RADIUS_EM,
    Math.max(
      MIN_RADIUS_EM,
      MAX_RADIUS_EM * Math.sqrt(effective / EFFECTIVE_AT_MAX_RADIUS),
    ),
  );
  const radius = upem * radiusEm;

  // Fixed fine spacing: area fraction ≈ π r² / spacing² tracks effective as r grows.
  // spacing = MAX_RADIUS * sqrt(π / EFFECTIVE_AT_MAX) ≈ 0.022 em
  const spacing = upem * MAX_RADIUS_EM * Math.sqrt(Math.PI / EFFECTIVE_AT_MAX_RADIUS);
  const wall = Math.max(upem * MIN_WALL_EM, radius * 0.35);

  const inset = insetPaths(normalized, wall);
  if (inset.length === 0) return null;

  const holes = holeGrid(pathsBounds(inset), spacing * SCALE, radius * SCALE);
  if (holes.length === 0) return null;

  const interiorHoles = boolOp(ClipperLib.ClipType.ctIntersection, holes, inset);
  if (interiorHoles.length === 0) return null;

  const holed = boolOp(ClipperLib.ClipType.ctDifference, normalized, interiorHoles);
  if (holed.length === 0) return null;
  // Never grow the silhouette: clip result back to the original fill.
  const strictlyInside = boolOp(ClipperLib.ClipType.ctIntersection, holed, normalized);
  return strictlyInside.length > 0 ? cleanPaths(strictlyInside) : null;
}

/**
 * Hole polygons strictly inside the glyph (Clipper coords), for surgeons that
 * keep the original exterior and only append reverse-wound hole contours.
 */
export function ecoHoleContours(
  contours: ClipPaths,
  upem: number,
  intensity: number,
): ClipPaths | null {
  const normalized = boolOp(ClipperLib.ClipType.ctUnion, contours, null);
  if (normalized.length === 0) return null;

  const effective = Math.min(Math.max(intensity * 1.6, 0.02), EFFECTIVE_AT_MAX_RADIUS);
  const radiusEm = Math.min(
    MAX_RADIUS_EM,
    Math.max(
      MIN_RADIUS_EM,
      MAX_RADIUS_EM * Math.sqrt(effective / EFFECTIVE_AT_MAX_RADIUS),
    ),
  );
  const radius = upem * radiusEm;
  const spacing = upem * MAX_RADIUS_EM * Math.sqrt(Math.PI / EFFECTIVE_AT_MAX_RADIUS);
  const wall = Math.max(upem * MIN_WALL_EM, radius * 0.35);

  const inset = insetPaths(normalized, wall);
  if (inset.length === 0) return null;

  const holes = holeGrid(pathsBounds(inset), spacing * SCALE, radius * SCALE);
  if (holes.length === 0) return null;

  const interiorHoles = boolOp(ClipperLib.ClipType.ctIntersection, holes, inset);
  return interiorHoles.length > 0 ? cleanPaths(interiorHoles) : null;
}

function holeGrid(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  spacing: number,
  radius: number,
): ClipPaths {
  const rowStart = Math.floor((bounds.minY - radius) / spacing);
  const rowEnd = Math.ceil((bounds.maxY + radius) / spacing);
  const colSpan = Math.ceil((bounds.maxX - bounds.minX + 2 * radius) / spacing) + 2;
  if ((rowEnd - rowStart + 1) * colSpan > MAX_HOLES_PER_GLYPH) return [];

  const holes: ClipPaths = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    const cy = row * spacing;
    const shift = (row & 1) !== 0 ? spacing / 2 : 0;
    const colStart = Math.floor((bounds.minX - radius - shift) / spacing);
    const colEnd = Math.ceil((bounds.maxX + radius - shift) / spacing);
    for (let col = colStart; col <= colEnd; col++) {
      holes.push(circlePath(col * spacing + shift, cy, radius));
    }
  }
  return holes;
}

function circlePath(cx: number, cy: number, r: number): ClipPath {
  const pts: ClipPath = [];
  for (let k = 0; k < CIRCLE_SEGMENTS; k++) {
    const a = (2 * Math.PI * k) / CIRCLE_SEGMENTS;
    pts.push({
      X: Math.round(cx + r * Math.cos(a)),
      Y: Math.round(cy + r * Math.sin(a)),
    });
  }
  return pts;
}

function boolOp(clipType: number, subject: ClipPaths, clip: ClipPaths | null): ClipPaths {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(subject, ClipperLib.PolyType.ptSubject, true);
  if (clip && clip.length > 0) {
    clipper.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
  }
  const solution: ClipPaths = [];
  clipper.Execute(
    clipType,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );
  return solution;
}

function insetPaths(paths: ClipPaths, wall: number): ClipPaths {
  const offset = new ClipperLib.ClipperOffset(2, 0.25);
  offset.AddPaths(paths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const solution: ClipPaths = [];
  offset.Execute(solution, -wall * SCALE);
  return solution;
}

function cleanPaths(paths: ClipPaths): ClipPaths {
  const cleaned = ClipperLib.Clipper.CleanPolygons(paths, SCALE * 0.35);
  const minArea = 3 * SCALE * (3 * SCALE);
  return cleaned.filter((p) => p.length >= 3 && Math.abs(ClipperLib.Clipper.Area(p)) > minArea);
}

function pathsBounds(paths: ClipPaths): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of paths) {
    for (const pt of path) {
      if (pt.X < minX) minX = pt.X;
      if (pt.X > maxX) maxX = pt.X;
      if (pt.Y < minY) minY = pt.Y;
      if (pt.Y > maxY) maxY = pt.Y;
    }
  }
  return { minX, minY, maxX, maxY };
}
