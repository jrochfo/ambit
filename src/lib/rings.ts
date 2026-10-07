export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} hr ${rest} min` : `${h} hr`;
}

// Teal ramp, darkest for the smallest ring. Index by the ring's rank among active rings.
const PILL_RAMP = [
  { bg: '#0E7C74', fg: '#FFFFFF' },
  { bg: '#3E9A92', fg: '#FFFFFF' },
  { bg: '#6FB8B1', fg: '#0B2B28' },
  { bg: '#9FD0CB', fg: '#0B2B28' },
  { bg: '#CFE8E5', fg: '#0B2B28' },
  { bg: '#E4F2F0', fg: '#0B2B28' },
];

export function pillColors(rank: number) {
  return PILL_RAMP[Math.min(rank, PILL_RAMP.length - 1)]!;
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
