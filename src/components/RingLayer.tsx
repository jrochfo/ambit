import { useEffect, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { Ring } from '../../shared/isochrones';
import { toPolygonPaths, topPoint } from '../lib/geojson';
import { formatMinutes, ringStyle } from '../lib/rings';
import { MapOverlay } from './MapOverlay';

/** One walking ring; `rank` is its position among active rings (0 = smallest). */
export function RingLayer({ ring, rank, count }: { ring: Ring; rank: number; count: number }) {
  const map = useMap();
  const paths = useMemo(() => toPolygonPaths(ring.geoJson), [ring.geoJson]);
  const labelAt = useMemo(() => topPoint(paths), [paths]);

  useEffect(() => {
    if (!map) return;
    const style = ringStyle(rank, count);
    const polygons = paths.map(
      (p) =>
        new google.maps.Polygon({
          map,
          paths: p,
          clickable: false,
          fillColor: '#0E7C74',
          fillOpacity: style.fill,
          strokeColor: '#0E7C74',
          strokeOpacity: style.stroke,
          strokeWeight: 2,
          zIndex: style.z,
        }),
    );
    return () => polygons.forEach((p) => p.setMap(null));
  }, [map, paths, rank, count]);

  if (!labelAt) return null;
  return (
    <MapOverlay position={labelAt}>
      <div className="map-label" style={{ marginTop: -4 }}>
        {formatMinutes(ring.minutes)}
      </div>
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
