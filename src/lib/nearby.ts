import { multiPolygon, point } from '@turf/helpers';
import pointToPolygonDistance from '@turf/point-to-polygon-distance';
import type { Ring } from '../../shared/isochrones';
import type { Category } from './categories';
import { toPolygonPaths } from './geojson';

export interface FoundPlace {
  id: string;
  name: string;
  position: google.maps.LatLngLiteral;
  /** Google's label for the place's main type ("Climbing gym"). */
  typeLabel?: string;
  /** Street-level address ("3450 20th St"). */
  address?: string;
  /** Accessibility features Google reports as present (absent ones may just be unknown). */
  accessible?: { entrance?: boolean; restroom?: boolean; parking?: boolean };
  mapsUrl?: string;
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

// All Pro tier (same price as id/name/location). Ratings, hours, price or website would bump
// every search to Enterprise ($35/1k, 1k free): fetch those per spot on demand instead.
const FIELDS = [
  'id',
  'displayName',
  'location',
  'primaryTypeDisplayName',
  'shortFormattedAddress',
  'businessStatus',
  'accessibilityOptions',
  'googleMapsURI',
];
const MAX_RESULTS = 20;

/**
 * One billed search for a category: Nearby Search by place type, or Text Search for
 * free-text custom categories. Text Search only takes a rectangle, so it gets the circle's
 * bounding box (ring sorting trims the corners), and it ranks by relevance: ranking by
 * distance lets weak matches win just by being close ("climbing gym" → any gym).
 */
export async function searchCategory(
  places: google.maps.PlacesLibrary,
  origin: google.maps.LatLngLiteral,
  radius: number,
  category: Category,
): Promise<CategorySearch> {
  const { places: found } = category.query
    ? await places.Place.searchByText({
        textQuery: category.query,
        fields: FIELDS,
        locationRestriction: boundsAround(origin, radius),
        rankPreference: places.SearchByTextRankPreference.RELEVANCE,
        maxResultCount: MAX_RESULTS,
      })
    : await places.Place.searchNearby({
        fields: FIELDS,
        includedPrimaryTypes: category.types,
        locationRestriction: { center: origin, radius },
        rankPreference: places.SearchNearbyRankPreference.DISTANCE,
        maxResultCount: MAX_RESULTS,
      });
  const located = found.flatMap((p): FoundPlace[] => {
    // A closed laundromat doesn't count as one nearby.
    if (!p.location || p.businessStatus === 'CLOSED_PERMANENTLY' || p.businessStatus === 'CLOSED_TEMPORARILY') return [];
    const a = p.accessibilityOptions;
    return [
      {
        id: p.id,
        name: p.displayName ?? 'Unnamed spot',
        position: p.location.toJSON(),
        typeLabel: p.primaryTypeDisplayName ?? undefined,
        address: p.shortFormattedAddress ?? undefined,
        accessible: a
          ? {
              entrance: a.hasWheelchairAccessibleEntrance ?? undefined,
              restroom: a.hasWheelchairAccessibleRestroom ?? undefined,
              parking: a.hasWheelchairAccessibleParking ?? undefined,
            }
          : undefined,
        mapsUrl: p.googleMapsURI ?? undefined,
      },
    ];
  });
  // Callers rely on nearest-first order; Text Search results arrive by relevance.
  if (category.query) located.sort((a, b) => metersBetween(origin, a.position) - metersBetween(origin, b.position));
  return { radius, places: located };
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

/** Sorts places into rings. A place counts as inside a ring if it's within `edgeTolerance` meters of its edge. */
export function classify(search: CategorySearch, shapes: RingShapes, edgeTolerance: number): CategoryMatches {
  const placed: NearbyPlace[] = search.places.map((p) => {
    const pt = point([p.position.lng, p.position.lat]);
    // Negative inside the ring, positive outside.
    const ring = shapes.find((s) => pointToPolygonDistance(pt, s.shape, { units: 'meters' }) <= edgeTolerance);
    return { ...p, ring: ring?.minutes ?? null };
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

function boundsAround(center: google.maps.LatLngLiteral, radius: number): google.maps.LatLngBoundsLiteral {
  const dLat = radius / 111_320;
  const dLng = radius / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return { north: center.lat + dLat, south: center.lat - dLat, east: center.lng + dLng, west: center.lng - dLng };
}

function metersBetween(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
