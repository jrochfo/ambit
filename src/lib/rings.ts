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

/** Map styling for ring `rank` (0 = smallest) of `count`. Fills stack, so inner rings read darker. */
export function ringStyle(rank: number, count: number) {
  const t = count <= 1 ? 0 : rank / (count - 1); // 0 inner → 1 outer
  return {
    fill: 0.3 - 0.2 * t,
    stroke: 0.9 - 0.35 * t,
    z: count - rank,
  };
}
