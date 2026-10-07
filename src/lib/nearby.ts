import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { multiPolygon, point } from '@turf/helpers';
import type { Ring } from '../../shared/isochrones';
import type { Category } from './categories';
import { toPolygonPaths } from './geojson';

export interface FoundPlace {
  id: string;
  name: string;
  position: google.maps.LatLngLiteral;
}

/** Raw Nearby Search result for one category at one address, kept so rings can change without re-searching. */
export interface CategorySearch {
  /** Radius searched, in meters. */
  radius: number;
  /** Nearest first. */
  places: FoundPlace[];
}

export interface NearbyPlace extends FoundPlace {
  /** Smallest active ring the place sits in, or null if outside them all. */
  ring: number | null;
}

export interface CategoryMatches {
  /** Best ring any match reaches (null = nothing inside the rings). */
  ring: number | null;
  /** Closest match by ring, then distance; may be outside the rings. */
  nearest: NearbyPlace | null;
  /** Every match inside the rings, nearest first (at most 20: the search's result cap). */
  within: NearbyPlace[];
}

// Fields kept to the Nearby Search Pro tier; adding ratings, hours etc. bumps every call to Enterprise.
const FIELDS = ['id', 'displayName', 'location'];
const MAX_RESULTS = 20;

/** One Nearby Search (billed) for a category. */
export async function searchCategory(
  places: google.maps.PlacesLibrary,
  origin: google.maps.LatLngLiteral,
  radius: number,
  category: Category,
): Promise<CategorySearch> {
  const { places: found } = await places.Place.searchNearby({
    fields: FIELDS,
    includedPrimaryTypes: category.types,
    locationRestriction: { center: origin, radius },
    rankPreference: places.SearchNearbyRankPreference.DISTANCE,
    maxResultCount: MAX_RESULTS,
  });
  return {
    radius,
    places: found.flatMap((p) => (p.location ? [{ id: p.id, name: p.displayName ?? 'Unnamed place', position: p.location.toJSON() }] : [])),
  };
}

/**
 * Whether a cached search still answers the question after rings grow. A wider search
 * only matters when nothing was found inside the rings and the old search wasn't full
 * (a full page of 20 already reaches past anything nearer).
 */
export function needsWiderSearch(search: CategorySearch, radius: number, matches: CategoryMatches): boolean {
  return search.radius < radius && matches.ring === null && search.places.length < MAX_RESULTS;
}

export type RingShapes = { minutes: number; shape: ReturnType<typeof multiPolygon> }[];

/** Rings as Turf shapes, smallest first, so the first hit is the place's ring. */
export function ringShapes(rings: Ring[]): RingShapes {
  return [...rings]
    .sort((a, b) => a.minutes - b.minutes)
    .map((r) => ({
      minutes: r.minutes,
      shape: multiPolygon(toPolygonPaths(r.geoJson).map((poly) => poly.map((ring) => ring.map(({ lat, lng }) => [lng, lat])))),
    }));
}

export function classify(search: CategorySearch, shapes: RingShapes): CategoryMatches {
  const placed: NearbyPlace[] = search.places.map((p) => {
    const pt = point([p.position.lng, p.position.lat]);
    return { ...p, ring: shapes.find((s) => booleanPointInPolygon(pt, s.shape))?.minutes ?? null };
  });
  // Places arrive nearest first, so the first one in the best ring is the one to pin.
  const rank = (r: number | null) => r ?? Infinity;
  const nearest = placed.reduce<NearbyPlace | null>((best, p) => (!best || rank(p.ring) < rank(best.ring) ? p : best), null);
  return { ring: nearest?.ring ?? null, nearest, within: placed.filter((p) => p.ring !== null) };
}

/** A circle just big enough to cover the largest ring (Nearby Search only takes circles). */
export function searchRadius(origin: google.maps.LatLngLiteral, largest: Ring): number {
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
