// Display smoothing for walking rings. Google's isochrones are built from grid cells, so their
// edges step like a staircase. These treatments only change how a ring is drawn; sorting spots
// into rings (nearby.ts) always uses the precise shape.

type LatLng = google.maps.LatLngLiteral;

export const RING_SHAPES = [
  ['raw', 'Current', 'Exactly as Google returns it: grid steps and zig-zags.'],
  ['simplified', 'Diagonals', 'Stairs become straight diagonal edges. Crisp and geometric; within half a grid step of the real edge.'],
  ['soft', 'Softened', 'Rounds every corner of the raw shape. Keeps the wobble, loses the hard steps.'],
  ['smooth', 'Smooth', 'Diagonals, then rounded. Organic outline that still follows the shape closely.'],
  ['rounder', 'Rounder', 'More simplifying and rounding. Blob-like; drifts up to ~60 m from the real edge.'],
] as const;

export type RingShape = (typeof RING_SHAPES)[number][0];

// Google's grid steps are ~60 m. `mid` first connects each edge's midpoint, which turns a
// staircase into a straight diagonal; `tolerance` (m) then drops points that barely bend the line;
// `rounds` of corner cutting round what's left.
const RECIPES: Record<RingShape, { mid: boolean; tolerance: number; rounds: number }> = {
  raw: { mid: false, tolerance: 0, rounds: 0 },
  simplified: { mid: true, tolerance: 12, rounds: 0 },
  soft: { mid: false, tolerance: 0, rounds: 3 },
  smooth: { mid: true, tolerance: 15, rounds: 3 },
  rounder: { mid: true, tolerance: 45, rounds: 4 },
};

/** The treatment the app draws with. */
export const DEFAULT_RING_SHAPE: RingShape = 'smooth';

/** Applies a treatment to polygons (each an outer ring followed by holes). */
export function shapePolygons(polygons: LatLng[][][], shape: RingShape): LatLng[][][] {
  const recipe = RECIPES[shape];
  if (!recipe.mid && !recipe.tolerance && !recipe.rounds) return polygons;
  return polygons.map((rings) => rings.map((ring) => shapeRing(ring, recipe)));
}

function shapeRing(ring: LatLng[], { mid, tolerance, rounds }: (typeof RECIPES)[RingShape]): LatLng[] {
  if (ring.length < 4) return ring;
  // Work in local meters so tolerances mean the same thing at any latitude.
  const lat0 = ring[0].lat;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  let pts: [number, number][] = ring.map((p) => [p.lng * kx, p.lat * ky]);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) pts = pts.slice(0, -1);
  if (mid) pts = pts.map(([x, y], i) => [(x + pts[(i + 1) % pts.length][0]) / 2, (y + pts[(i + 1) % pts.length][1]) / 2]);
  if (tolerance) {
    const simple = simplifyClosed(pts, tolerance);
    if (simple.length >= 3) pts = simple;
  }
  for (let i = 0; i < rounds; i++) pts = chaikin(pts);
  const out = pts.map(([x, y]) => ({ lat: y / ky, lng: x / kx }));
  out.push(out[0]);
  return out;
}

/** Ramer–Douglas–Peucker on a closed ring, split at the two points farthest apart. */
function simplifyClosed(pts: [number, number][], tol: number): [number, number][] {
  let far = 0;
  let best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > best) [best, far] = [d, i];
  }
  const a = rdp(pts.slice(0, far + 1), tol);
  const b = rdp([...pts.slice(far), pts[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function rdp(pts: [number, number][], tol: number): [number, number][] {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  let idx = 0;
  let max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
    if (d > max) [max, idx] = [d, i];
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), tol).slice(0, -1), ...rdp(pts.slice(idx), tol)];
}

/** One round of Chaikin corner cutting on a closed ring. */
function chaikin(pts: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    out.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
  }
  return out;
}

// Dev preview: the style guide saves a choice; the app on localhost draws with it.
const KEY = 'ambit.ringShapePreview';

export function readRingShape(): RingShape {
  if (!import.meta.env.DEV) return DEFAULT_RING_SHAPE;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown;
    return RING_SHAPES.some(([id]) => id === v) ? (v as RingShape) : DEFAULT_RING_SHAPE;
  } catch {
    return DEFAULT_RING_SHAPE;
  }
}

export function writeRingShape(shape: RingShape): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(shape));
  } catch {
    // Preview just won't carry over.
  }
}

export const RING_SHAPE_KEY = KEY;
