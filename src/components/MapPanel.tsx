import { Map, useMap } from '@vis.gl/react-google-maps';
import type { Ring } from '../../shared/isochrones';
import type { Category } from '../lib/categories';
import type { NearbyPlace } from '../lib/nearby';
import { useEffect, useMemo, useState } from 'react';
import { toPolygonPaths } from '../lib/geojson';
import { ringBand } from '../lib/ringBands';
import { shapePolygons } from '../lib/ringShape';
import { START_ZOOM, mapStyleFor, randomStartView } from '../lib/mapStyle';
import type { Theme } from '../lib/theme';
import { CategoryPin, type PinPick } from './CategoryPin';
import { MapOverlay, OVERLAY_Z } from './MapOverlay';
import { CategoryBanner, EmptyMapPrompt, MapLegend, OriginMarker } from './MapParts';
import { FitToRing, RingLayer, useRingShape } from './RingLayer';

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
  pick?: PinPick;
  /** Clicking the pin: this spot in its category view. */
  onSelect?: () => void;
}

/** What the category view banner shows (null when not in category view). */
export interface CategoryViewInfo {
  category: Category;
  count: number | null;
  onExit: () => void;
}

export function MapPanel({
  origin,
  rings,
  hidden,
  pins,
  spotlight,
  onMapClick,
  categoryView,
  theme,
}: {
  origin: Origin | null;
  /** Active rings, ascending. */
  rings: Ring[];
  hidden: ReadonlySet<number>;
  pins: Pin[];
  /** `${categoryId}:${placeId}` of a spot whose card is shown open and panned to. */
  spotlight: string | null;
  onMapClick: () => void;
  categoryView: CategoryViewInfo | null;
  theme: Theme;
}) {
  const largest = rings[rings.length - 1];
  const [startView] = useState(randomStartView);
  const shape = useRingShape();
  const shaped = useMemo(() => rings.map((r) => shapePolygons(toPolygonPaths(r.geoJson), shape)), [rings, shape]);
  // Bands by ring and inner ring, kept while the shapes are, so toggling a ring only redraws (and
  // fades) the band next to it.
  const bandCache = useMemo(() => new globalThis.Map<string, google.maps.LatLngLiteral[][][]>(), [shaped]);
  // Shown rings as bands: each minus the next smaller shown ring, so fills never stack.
  const drawn = useMemo(() => {
    const out: { minutes: number; rank: number; outline: google.maps.LatLngLiteral[][][]; band: google.maps.LatLngLiteral[][][] }[] = [];
    let inner = -1;
    rings.forEach((r, rank) => {
      if (hidden.has(r.minutes)) return;
      const outline = shaped[rank]!;
      const key = `${rank}:${inner}`;
      let band = bandCache.get(key);
      if (!band) bandCache.set(key, (band = ringBand(outline, inner >= 0 ? shaped[inner]! : null)));
      out.push({ minutes: r.minutes, rank, outline, band });
      inner = rank;
    });
    return out;
  }, [rings, hidden, shaped, bandCache]);
  return (
    <section className="card map-panel" aria-label="Walking rings map">
      <div className="map-frame">
        <Map
          defaultCenter={startView}
          defaultZoom={START_ZOOM}
          styles={mapStyleFor(theme, origin !== null)}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          style={{ position: 'absolute', inset: 0 }}
          onClick={onMapClick}
        >
          {drawn.map((d) => (
            <RingLayer key={d.minutes} minutes={d.minutes} outline={d.outline} band={d.band} rank={d.rank} count={rings.length} theme={theme} />
          ))}
          <FitToRing ring={largest} />
          {pins.map(({ category, place, onSelect }) => {
            const key = `${category.id}:${place.id}`;
            return (
              <CategoryPin
                key={key}
                category={category}
                place={place}
                outerRing={largest?.minutes}
                spotlight={spotlight === key}
                pick={pins.find((p) => p.category === category && p.place === place)?.pick}
                onSelect={onSelect}
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
        {categoryView && <CategoryBanner {...categoryView} outerRing={largest?.minutes} />}
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
