/**
 * Ambit's mark: two rings around a point. The rings use --mark-ring (the action color, kept close
 * in lightness to the point) and the point --mark-dot (the walk color), so two-tone palettes show both.
 */
export function Logomark({ size = 28 }: { size?: number }) {
  return (
    <svg className="logomark" width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle className="mark-ring-outer" cx="18" cy="18" r="16" style={{ stroke: 'var(--mark-ring, currentColor)' }} strokeWidth="2" strokeOpacity="0.35" />
      <circle className="mark-ring-inner" cx="18" cy="18" r="10.5" style={{ stroke: 'var(--mark-ring, currentColor)' }} strokeWidth="2" strokeOpacity="0.65" />
      <circle className="mark-dot" cx="18" cy="18" r="5" style={{ fill: 'var(--mark-dot, currentColor)' }} />
    </svg>
  );
}
