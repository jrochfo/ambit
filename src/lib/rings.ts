export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  // Compact form so long custom times still fit a pill (three to a row).
  return rest ? `${h}h ${rest}m` : `${h} hr`;
}

/**
 * Pill colors for a ring by its rank among active rings (0 = smallest), as CSS variables so each
 * theme sets its own ramp (--ring-1 … --ring-6 in styles.css).
 */
export function pillColors(rank: number) {
  const step = Math.min(Math.max(rank, 0), 5) + 1;
  return { bg: `var(--ring-${step})`, fg: `var(--ring-${step}-ink)` };
}

/**
 * Map styling for ring `rank` (0 = smallest) of `count`. Each ring is drawn as a band (its area
 * minus the next smaller ring) filled with its pill color, --ring-N, at --map-ring-fill opacity,
 * so pills, legend, and map agree. Outlines use --data, inner ones stronger.
 */
export function ringStyle(rank: number, count: number) {
  const t = count <= 1 ? 0 : rank / (count - 1); // 0 inner → 1 outer
  const step = Math.min(Math.max(rank, 0), 5) + 1;
  return {
    fillVar: `--ring-${step}`,
    stroke: 0.9 - 0.35 * t,
    z: count - rank,
  };
}

/** SVG path for a ring band between two circles (fill-rule evenodd), for the design pages. */
export function annulusPath(cx: number, cy: number, r: number, inner: number): string {
  const circle = (rad: number) => `M${cx - rad} ${cy} a${rad} ${rad} 0 1 0 ${rad * 2} 0 a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`;
  return inner > 0 ? `${circle(r)} ${circle(inner)}` : circle(r);
}
