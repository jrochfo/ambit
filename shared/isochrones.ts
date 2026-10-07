// Contract between the browser and the /api/isochrones proxy.

export const DEFAULT_RINGS = [5, 10, 15];
/** Walking isochrones top out at 2 hours (Google's limit). */
export const MIN_RING = 1;
export const MAX_RING = 120;
/** Each ring is one Isochrones call per address, so cap how many can be active. */
export const MAX_RINGS = 3;

export interface IsochroneRequest {
  lat: number;
  lng: number;
  /** Ring sizes to fetch, in whole minutes. */
  minutes: number[];
}

export interface Ring {
  minutes: number;
  /** RFC 7946 GeoJSON straight from Google (Feature, Polygon or MultiPolygon). */
  geoJson: unknown;
}

export interface IsochroneResponse {
  rings: Ring[];
}

export interface ApiError {
  error: string;
  /** Google's status for the failing ring, when there is one (404 = no road near the origin). */
  status?: number;
}

export function isValidRing(m: unknown): m is number {
  return typeof m === 'number' && Number.isInteger(m) && m >= MIN_RING && m <= MAX_RING;
}
