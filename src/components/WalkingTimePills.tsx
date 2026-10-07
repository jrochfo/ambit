import { RING_MINUTES, type RingMinutes } from '../../shared/isochrones';

export function WalkingTimePills({
  visible,
  onToggle,
}: {
  visible: ReadonlySet<RingMinutes>;
  onToggle: (minutes: RingMinutes) => void;
}) {
  return (
    <div className="field" role="group" aria-labelledby="walking-time-label">
      <div className="field-label" id="walking-time-label">
        Walking time
      </div>
      <div className="pills">
        {RING_MINUTES.map((m) => (
          <button key={m} type="button" className="pill" aria-pressed={visible.has(m)} onClick={() => onToggle(m)}>
            {m} min
          </button>
        ))}
      </div>
    </div>
  );
}
