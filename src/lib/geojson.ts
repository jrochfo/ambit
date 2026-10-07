type Position = [number, number] | number[];
type PolygonCoords = Position[][];

/**
 * Flattens Google's isochrone GeoJSON (Feature, FeatureCollection, Polygon or
 * MultiPolygon) into Maps polygons: one entry per polygon, each an outer ring
 * followed by any holes. GeoJSON is [lng, lat].
 */
export function toPolygonPaths(geoJson: unknown): google.maps.LatLngLiteral[][][] {
  const polygons: PolygonCoords[] = [];
  collect(geoJson, polygons);
  return polygons.map((rings) => rings.map((ring) => ring.map(([lng, lat]) => ({ lat, lng }))));
}

function collect(node: unknown, out: PolygonCoords[]): void {
  if (!node || typeof node !== 'object') return;
  const g = node as { type?: string; coordinates?: unknown; geometry?: unknown; features?: unknown[]; geometries?: unknown[] };
  switch (g.type) {
    case 'FeatureCollection':
      g.features?.forEach((f) => collect(f, out));
      break;
    case 'Feature':
      collect(g.geometry, out);
      break;
    case 'GeometryCollection':
      g.geometries?.forEach((geom) => collect(geom, out));
      break;
    case 'Polygon':
      out.push(g.coordinates as PolygonCoords);
      break;
    case 'MultiPolygon':
      (g.coordinates as PolygonCoords[]).forEach((p) => out.push(p));
      break;
  }
}

/** Northernmost point of the outer rings: where the ring's "N min" label sits. */
export function topPoint(polygons: google.maps.LatLngLiteral[][][]): google.maps.LatLngLiteral | null {
  let top: google.maps.LatLngLiteral | null = null;
  for (const [outer] of polygons) {
    for (const p of outer ?? []) if (!top || p.lat > top.lat) top = p;
  }
  return top;
}
