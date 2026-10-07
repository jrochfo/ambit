import { Map } from '@vis.gl/react-google-maps';
import type { Ring } from '../../shared/isochrones';
import type { Category } from '../lib/categories';
import type { NearbyPlace } from '../lib/nearby';
import { useState } from 'react';
import { MAP_STYLE, MAP_STYLE_BLANK, START_ZOOM, randomStartView } from '../lib/mapStyle';
import { formatMinutes, ringStyle } from '../lib/rings';
import { CategoryPin } from './CategoryPin';
import { MapOverlay } from './MapOverlay';
import { FitToRing, RingLayer } from './RingLayer';

export interface Origin {
  position: google.maps.LatLngLiteral;
  label: string;
}

export interface Pin {
  category: Category;
  place: NearbyPlace;
}

export function MapPanel({
  origin,
  rings,
  hidden,
  pins,
}: {
  origin: Origin | null;
  /** Active rings, ascending. */
  rings: Ring[];
  hidden: ReadonlySet<number>;
  pins: Pin[];
}) {
  const largest = rings[rings.length - 1];
  const [startView] = useState(randomStartView);
  return (
    <section className="card map-panel" aria-label="Map">
      <div className="map-frame">
        <Map
          defaultCenter={startView}
          defaultZoom={START_ZOOM}
          styles={origin ? MAP_STYLE : MAP_STYLE_BLANK}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          style={{ position: 'absolute', inset: 0 }}
        >
          {rings.map((r, rank) => (hidden.has(r.minutes) ? null : <RingLayer key={r.minutes} ring={r} rank={rank} count={rings.length} />))}
          <FitToRing ring={largest} />
          {pins.map(({ category, place }) => (
            <CategoryPin key={`${category.id}:${place.id}`} category={category} place={place} outerRing={largest?.minutes} />
          ))}
          {origin && (
            <MapOverlay position={origin.position}>
              <div className="origin">
                <div className="origin-dot" />
                <div className="origin-label">{origin.label}</div>
              </div>
            </MapOverlay>
          )}
        </Map>
        {!origin && (
          <div className="map-empty">
            <p className="map-empty-text">Enter an address to see how far you can walk.</p>
          </div>
        )}
      </div>
      <div className="legend">
        {rings.map((r, rank) => (
          <span key={r.minutes} className="legend-item">
            <span className="legend-swatch" style={{ opacity: Math.min(1, ringStyle(rank, rings.length).fill * 2.6) }} />
            {formatMinutes(r.minutes)}
            {rank === 0 && ' walk'}
          </span>
        ))}
        <span className="legend-note">Walking reach along real streets</span>
      </div>
    </section>
  );
}
