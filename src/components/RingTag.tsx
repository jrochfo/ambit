import { formatMinutes, pillColors } from '../lib/rings';

export type RingTagValue = { kind: 'ring'; minutes: number } | { kind: 'none'; label: string } | { kind: 'loading' } | { kind: 'error'; label: string; message: string };

/**
 * The walking-time tag ("5 min"), one style everywhere: sidebar rows, the comparison grid and the
 * style guide. Colored by the ring's rank among the active rings; outlined when there's no ring.
 */
export function RingTag({ value, rings }: { value: RingTagValue; rings: number[] }) {
  if (value.kind === 'ring') {
    const { bg, fg } = pillColors(rings.indexOf(value.minutes));
    return (
      <span className="tag" style={{ background: bg, color: fg, borderColor: bg }}>
        {formatMinutes(value.minutes)}
      </span>
    );
  }
  if (value.kind === 'loading') return <span className="tag tag-none">…</span>;
  return (
    <span className="tag tag-none" title={value.kind === 'error' ? value.message : undefined}>
      {value.label}
    </span>
  );
}
