// Map visuals shared by the real Google map (MapPanel) and the design sandbox's fake map,
// so styling them in one place styles both.
import { formatMinutes, ringStyle } from '../lib/rings';
import { Logomark } from './Logomark';

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

/** Shown over the map before an address is entered: introduces Ambit and how to start. */
export function EmptyMapPrompt() {
  return (
    <div className="map-empty">
      <div className="map-intro">
        <div className="map-intro-brand">
          <Logomark size={36} />
          <p className="map-intro-name">Ambit</p>
        </div>
        <p className="map-intro-tagline">What’s within a walk of here?</p>
        <p className="map-intro-text">
          See how far you can walk from any address, and which groceries, coffee shops, transit stops, and other spots fall within 5, 10,
          or 15 minutes. Save a few addresses to compare them side by side.
        </p>
        <p className="map-intro-start">Enter an address to get started.</p>
      </div>
    </div>
  );
}

/** Ring swatches under the map; `minutes` ascending. */
export function MapLegend({ minutes }: { minutes: number[] }) {
  return (
    <div className="legend">
      {minutes.map((m, rank) => (
        <span key={m} className="legend-item">
          <span
            className="legend-swatch"
            style={{ background: `color-mix(in srgb, var(${ringStyle(rank, minutes.length).fillVar}) calc(var(--map-ring-fill) * 100%), var(--map-land))` }}
          />
          {formatMinutes(m)}
          {rank === 0 && ' walk'}
        </span>
      ))}
      <span className="legend-note">Walking reach along real streets</span>
    </div>
  );
}
