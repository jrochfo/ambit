import difference from '@turf/difference';
import { featureCollection, multiPolygon } from '@turf/helpers';
import type { Position } from 'geojson';

type LatLng = google.maps.LatLngLiteral;

/**
 * A ring's band: its area minus the next smaller shown ring, so each band is filled once in its
 * own color (--ring-N) instead of stacking. Display only; spots are sorted by the precise shapes.
 */
export function ringBand(outer: LatLng[][][], inner: LatLng[][][] | null): LatLng[][][] {
  if (!inner?.length || !outer.length) return outer;
  const toCoords = (polys: LatLng[][][]): Position[][][] => polys.map((rings) => rings.map((ring) => ring.map((p) => [p.lng, p.lat])));
  try {
    const result = difference(featureCollection([multiPolygon(toCoords(outer)), multiPolygon(toCoords(inner))]));
    if (!result) return [];
    const g = result.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    return polys.map((rings) => rings.map((ring) => ring.map(([lng, lat]) => ({ lat, lng }))));
  } catch {
    // A degenerate shape: fall back to the whole ring rather than drawing nothing.
    return outer;
  }
}
