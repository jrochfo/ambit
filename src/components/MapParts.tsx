// Map visuals shared by the real Google map (MapPanel) and the design sandbox's fake map,
// so styling them in one place styles both.
import { formatMinutes, ringStyle } from '../lib/rings';

export function OriginMarker({ label }: { label: string }) {
  return (
    <div className="origin">
      <div className="origin-dot" />
      <div className="origin-label">{label}</div>
    </div>
  );
}

export function RingLabel({ minutes }: { minutes: number }) {
  return (
    <div className="map-label" style={{ marginTop: -4 }}>
      {formatMinutes(minutes)}
    </div>
  );
}

export function EmptyMapPrompt() {
  return (
    <div className="map-empty">
      <p className="map-empty-text">Enter an address to see how far you can walk.</p>
    </div>
  );
}

/** Ring swatches under the map; `minutes` ascending. */
export function MapLegend({ minutes }: { minutes: number[] }) {
  return (
    <div className="legend">
      {minutes.map((m, rank) => (
        <span key={m} className="legend-item">
          <span className="legend-swatch" style={{ opacity: Math.min(1, ringStyle(rank, minutes.length).fill * 2.6) }} />
          {formatMinutes(m)}
          {rank === 0 && ' walk'}
        </span>
      ))}
      <span className="legend-note">Walking reach along real streets</span>
    </div>
  );
}
