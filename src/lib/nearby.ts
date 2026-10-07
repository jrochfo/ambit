import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { multiPolygon, point } from '@turf/helpers';
import type { Ring, RingMinutes } from '../../shared/isochrones';
import type { Category } from './categories';
import { toPolygonPaths } from './geojson';

export interface NearbyPlace {
  id: string;
  name: string;
  position: google.maps.LatLngLiteral;
  /** Smallest walking ring the place sits in, or null if outside the 15 minute ring. */
  ring: RingMinutes | null;
}

export type CategoryResult =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'done';
      /** Best ring any match reaches (null = nothing within 15 min). */
      ring: RingMinutes | null;
      /** Pin to show: the closest match by ring, then by distance; may be outside the rings. */
      nearest: NearbyPlace | null;
      /** Matches inside the 15 minute ring (capped by the 20-result search limit). */
      within: number;
    };

// Fields kept to the Nearby Search Pro tier; adding ratings, hours etc. bumps every call to Enterprise.
const FIELDS = ['id', 'displayName', 'location'];

/** One Nearby Search (billed) for a category, then sorted into rings in the browser. */
export async function searchCategory(
  places: google.maps.PlacesLibrary,
  origin: google.maps.LatLngLiteral,
  rings: Ring[],
  category: Category,
): Promise<CategoryResult> {
  const { places: found } = await places.Place.searchNearby({
    fields: FIELDS,
    includedPrimaryTypes: category.types,
    locationRestriction: { center: origin, radius: searchRadius(origin, rings) },
    rankPreference: places.SearchNearbyRankPreference.DISTANCE,
    maxResultCount: 20,
  });

  const shapes = ringShapes(rings);
  const matches: NearbyPlace[] = found.flatMap((p) => {
    if (!p.location) return [];
    const position = p.location.toJSON();
    const pt = point([position.lng, position.lat]);
    const ring = shapes.find((s) => booleanPointInPolygon(pt, s.shape))?.minutes ?? null;
    return [{ id: p.id, name: p.displayName ?? 'Unnamed place', position, ring }];
  });

  // Results arrive nearest first, so the first match in the best ring is the one to pin.
  const rank = (r: RingMinutes | null) => r ?? Infinity;
  const nearest = matches.reduce<NearbyPlace | null>((best, m) => (!best || rank(m.ring) < rank(best.ring) ? m : best), null);

  return {
    status: 'done',
    ring: nearest?.ring ?? null,
    nearest,
    within: matches.filter((m) => m.ring !== null).length,
  };
}

/** Rings as Turf shapes, smallest first, so the first hit is the place's ring. */
function ringShapes(rings: Ring[]) {
  return [...rings]
    .sort((a, b) => a.minutes - b.minutes)
    .map((r) => ({
      minutes: r.minutes,
      shape: multiPolygon(toPolygonPaths(r.geoJson).map((poly) => poly.map((ring) => ring.map(({ lat, lng }) => [lng, lat])))),
    }));
}

/** A circle just big enough to cover the largest ring (Nearby Search only takes circles). */
function searchRadius(origin: google.maps.LatLngLiteral, rings: Ring[]): number {
  const largest = rings.reduce((a, b) => (b.minutes > a.minutes ? b : a));
  let max = 0;
  for (const [outer] of toPolygonPaths(largest.geoJson)) {
    for (const p of outer ?? []) max = Math.max(max, metersBetween(origin, p));
  }
  return Math.min(Math.max(Math.ceil(max) + 50, 200), 50_000);
}

function metersBetween(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
