/**
 * Ambit's mark: two rings around a point, all in the walk color: rings use --mark-ring and the
 * point --mark-dot (both --ring-1). --mark-ring-inner / --mark-ring-outer can color each ring
 * separately (the style guide's Logo color options).
 */
export function Logomark({ size = 28 }: { size?: number }) {
  return (
    <svg className="logomark" width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle className="mark-ring-outer" cx="18" cy="18" r="16" style={{ stroke: 'var(--mark-ring-outer, var(--mark-ring, currentColor))' }} strokeWidth="2" strokeOpacity="0.35" />
      <circle className="mark-ring-inner" cx="18" cy="18" r="10.5" style={{ stroke: 'var(--mark-ring-inner, var(--mark-ring, currentColor))' }} strokeWidth="2" strokeOpacity="0.65" />
      <circle className="mark-dot" cx="18" cy="18" r="5" style={{ fill: 'var(--mark-dot, currentColor)' }} />
    </svg>
  );
}
