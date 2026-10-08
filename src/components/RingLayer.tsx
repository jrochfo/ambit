import { useEffect, useMemo, useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { Ring } from '../../shared/isochrones';
import { toPolygonPaths, topPoint } from '../lib/geojson';
import { ringStyle } from '../lib/rings';
import { RING_SHAPE_KEY, readRingShape, shapePolygons } from '../lib/ringShape';
import { MapOverlay, OVERLAY_Z } from './MapOverlay';
import { RingLabel } from './MapParts';

/** One walking ring; `rank` is its position among active rings (0 = smallest). */
export function RingLayer({ ring, rank, count }: { ring: Ring; rank: number; count: number }) {
  const map = useMap();
  const shape = useRingShape();
  const paths = useMemo(() => shapePolygons(toPolygonPaths(ring.geoJson), shape), [ring.geoJson, shape]);
  const labelAt = useMemo(() => topPoint(paths), [paths]);

  useEffect(() => {
    if (!map) return;
    const style = ringStyle(rank, count);
    // Google polygons need a literal color; take the theme's data color.
    const teal = getComputedStyle(document.documentElement).getPropertyValue('--data').trim() || '#0e7c74';
    const polygons = paths.map(
      (p) =>
        new google.maps.Polygon({
          map,
          paths: p,
          clickable: false,
          fillColor: teal,
          fillOpacity: style.fill,
          strokeColor: teal,
          strokeOpacity: style.stroke,
          strokeWeight: 2,
          zIndex: style.z,
        }),
    );
    return () => polygons.forEach((p) => p.setMap(null));
  }, [map, paths, rank, count]);

  if (!labelAt) return null;
  return (
    <MapOverlay position={labelAt} zIndex={OVERLAY_Z.ringLabel}>
      <RingLabel minutes={ring.minutes} />
    </MapOverlay>
  );
}

/** Zooms to a ring (the largest) whenever it changes. */
export function FitToRing({ ring }: { ring: Ring | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !ring) return;
    const bounds = new google.maps.LatLngBounds();
    toPolygonPaths(ring.geoJson).forEach(([outer]) => outer?.forEach((p) => bounds.extend(p)));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
  }, [map, ring]);
  return null;
}

/** The ring display treatment; on localhost it follows the style guide's live preview. */
function useRingShape() {
  const [shape, setShape] = useState(readRingShape);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === RING_SHAPE_KEY) setShape(readRingShape());
    };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);
  return shape;
}
