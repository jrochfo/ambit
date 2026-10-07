import { Map } from '@vis.gl/react-google-maps';
import type { Ring, RingMinutes } from '../../shared/isochrones';
import { MAP_STYLE } from '../lib/mapStyle';
import { MapOverlay } from './MapOverlay';
import { FitToRings, RingLayer } from './RingLayer';

export interface Origin {
  position: google.maps.LatLngLiteral;
  label: string;
}

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 }; // continental US until an address is mapped

export function MapPanel({
  origin,
  rings,
  visible,
}: {
  origin: Origin | null;
  rings: Ring[];
  visible: ReadonlySet<RingMinutes>;
}) {
  return (
    <section className="card map-panel" aria-label="Map">
      <div className="map-frame">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={4}
          styles={MAP_STYLE}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          style={{ position: 'absolute', inset: 0 }}
        >
          {rings
            .filter((r) => visible.has(r.minutes))
            .map((r) => (
              <RingLayer key={r.minutes} ring={r} />
            ))}
          <FitToRings rings={rings} />
          {origin && (
            <MapOverlay position={origin.position}>
              <div className="origin">
                <div className="origin-dot" />
                <div className="origin-label">{origin.label}</div>
              </div>
            </MapOverlay>
          )}
        </Map>
        {!origin && <div className="map-empty">Enter an address to see how far you can walk in 5, 10, and 15 minutes.</div>}
      </div>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ opacity: 0.8 }} />5 min walk
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ opacity: 0.5 }} />10 min
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ opacity: 0.25 }} />15 min
        </span>
        <span className="legend-note">Walking reach along real streets</span>
      </div>
    </section>
  );
}
