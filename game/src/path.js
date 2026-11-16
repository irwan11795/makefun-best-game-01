// The road the wisps walk, and the lantern plots where towers stand.
// The path winds in an S from the left edge to the lighthouse on the right;
// plots sit off the road, never on it.

export const PATH_POINTS = [
  { x: -40, y: 150 },
  { x: 880, y: 150 },
  { x: 880, y: 330 },
  { x: 280, y: 330 },
  { x: 280, y: 510 },
  { x: 1120, y: 510 },
  { x: 1240, y: 510 },
];

export const LIGHTHOUSE = { x: 1195, y: 510 };

export const PLOTS = [
  { x: 150, y: 238 },
  { x: 400, y: 238 },
  { x: 650, y: 238 },
  { x: 790, y: 242 },
  { x: 700, y: 422 },
  { x: 450, y: 422 },
  { x: 180, y: 422 },
  { x: 180, y: 602 },
  { x: 480, y: 602 },
  { x: 760, y: 602 },
  { x: 1020, y: 602 },
];

export const PLOT_RADIUS = 26;

const SEGMENTS = [];
for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
  const a = PATH_POINTS[i];
  const b = PATH_POINTS[i + 1];
  SEGMENTS.push({ a, b, len: Math.hypot(b.x - a.x, b.y - a.y) });
}
export const PATH_LENGTH = SEGMENTS.reduce((sum, s) => sum + s.len, 0);

/** Point `distance` px along the path from its start. */
export function pointAt(distance) {
  let d = Math.max(0, Math.min(PATH_LENGTH, distance));
  for (const s of SEGMENTS) {
    if (d <= s.len) {
      const t = s.len === 0 ? 0 : d / s.len;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
    }
    d -= s.len;
  }
  const last = PATH_POINTS[PATH_POINTS.length - 1];
  return { x: last.x, y: last.y };
}

/** The plot whose circle holds (x, y), or -1. */
export function plotAt(x, y) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    const p = PLOTS[i];
    if (Math.hypot(x - p.x, y - p.y) <= PLOT_RADIUS + 6) return i;
  }
  return -1;
}
