import { Map, useMap } from '@vis.gl/react-google-maps';
import type { Ring } from '../../shared/isochrones';
import type { Category } from '../lib/categories';
import type { NearbyPlace } from '../lib/nearby';
import { useEffect, useState } from 'react';
import { MAP_STYLE, MAP_STYLE_BLANK, START_ZOOM, randomStartView } from '../lib/mapStyle';
import { CategoryPin } from './CategoryPin';
import { MapOverlay, OVERLAY_Z } from './MapOverlay';
import { EmptyMapPrompt, MapLegend, OriginMarker } from './MapParts';
import { FitToRing, RingLayer } from './RingLayer';

export interface Origin {
  position: google.maps.LatLngLiteral;
  /** Short name shown on the map (street, or a saved address's nickname). */
  label: string;
  /** Full address from Google. */
  address: string;
  placeId?: string;
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
  spotlight,
  onMapClick,
}: {
  origin: Origin | null;
  /** Active rings, ascending. */
  rings: Ring[];
  hidden: ReadonlySet<number>;
  pins: Pin[];
  /** `${categoryId}:${placeId}` of a spot whose card is shown open and panned to. */
  spotlight: string | null;
  onMapClick: () => void;
}) {
  const largest = rings[rings.length - 1];
  const [startView] = useState(randomStartView);
  return (
    <section className="card map-panel" aria-label="Walking rings map">
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
          onClick={onMapClick}
        >
          {rings.map((r, rank) => (hidden.has(r.minutes) ? null : <RingLayer key={r.minutes} ring={r} rank={rank} count={rings.length} />))}
          <FitToRing ring={largest} />
          {pins.map(({ category, place }) => {
            const key = `${category.id}:${place.id}`;
            return (
              <CategoryPin
                key={key}
                category={category}
                place={place}
                outerRing={largest?.minutes}
                spotlight={spotlight === key}
              />
            );
          })}
          <PanToSpot position={pins.find((p) => `${p.category.id}:${p.place.id}` === spotlight)?.place.position} />
          {origin && (
            <MapOverlay position={origin.position} zIndex={OVERLAY_Z.origin}>
              <OriginMarker label={origin.label} />
            </MapOverlay>
          )}
        </Map>
        {!origin && <EmptyMapPrompt />}
      </div>
      <MapLegend minutes={rings.map((r) => r.minutes)} />
    </section>
  );
}

/** Brings a spotlighted spot into view (after the rings have been fitted). */
function PanToSpot({ position }: { position: google.maps.LatLngLiteral | undefined }) {
  const map = useMap();
  const lat = position?.lat;
  const lng = position?.lng;
  useEffect(() => {
    if (!map || lat === undefined || lng === undefined) return;
    const bounds = map.getBounds();
    if (bounds?.contains({ lat, lng })) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) map.setCenter({ lat, lng });
    else map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
}
