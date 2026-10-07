import { useEffect, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { Ring, RingMinutes } from '../../shared/isochrones';
import { toPolygonPaths, topPoint } from '../lib/geojson';
import { MapOverlay } from './MapOverlay';

// Inner rings sit on top and read darker, as in the mock-up.
const RING_STYLE: Record<RingMinutes, { fill: number; stroke: number; z: number }> = {
  5: { fill: 0.32, stroke: 0.9, z: 3 },
  10: { fill: 0.2, stroke: 0.7, z: 2 },
  15: { fill: 0.12, stroke: 0.55, z: 1 },
};

export function RingLayer({ ring }: { ring: Ring }) {
  const map = useMap();
  const paths = useMemo(() => toPolygonPaths(ring.geoJson), [ring.geoJson]);
  const labelAt = useMemo(() => topPoint(paths), [paths]);

  useEffect(() => {
    if (!map) return;
    const style = RING_STYLE[ring.minutes];
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
  }, [map, paths, ring.minutes]);

  if (!labelAt) return null;
  return (
    <MapOverlay position={labelAt}>
      <div className="map-label" style={{ marginTop: -4 }}>
        {ring.minutes} min
      </div>
    </MapOverlay>
  );
}

/** Zooms to the largest ring whenever a new set of rings arrives. */
export function FitToRings({ rings }: { rings: Ring[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || rings.length === 0) return;
    const largest = rings.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    const bounds = new google.maps.LatLngBounds();
    toPolygonPaths(largest.geoJson).forEach(([outer]) => outer?.forEach((p) => bounds.extend(p)));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
  }, [map, rings]);
  return null;
}
