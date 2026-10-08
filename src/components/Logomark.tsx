/**
 * Ambit's mark: two rings around a point. The rings take the surrounding color (the action
 * color); the point is the walk's color (--mark-dot), so two-tone palettes show both.
 */
export function Logomark({ size = 28 }: { size?: number }) {
  return (
    <svg className="logomark" width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="2" strokeOpacity="0.35" />
      <circle cx="18" cy="18" r="10.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.65" />
      <circle cx="18" cy="18" r="5" style={{ fill: 'var(--mark-dot, currentColor)' }} />
    </svg>
  );
}
