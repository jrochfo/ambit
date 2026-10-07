// Contract between the browser and the /api/isochrones proxy.

export const RING_MINUTES = [5, 10, 15] as const;
export type RingMinutes = (typeof RING_MINUTES)[number];

export interface IsochroneRequest {
  lat: number;
  lng: number;
}

export interface Ring {
  minutes: RingMinutes;
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
