// Saved addresses and their stored results, kept in the browser.
//
// Google's terms allow storing place IDs indefinitely and coordinates for up to 30 days, so
// stored results hold only those (no names) and expire per category after 30 days; the
// address's own coordinates are re-looked-up after 30 days too.

export const MAX_SAVED = 6;
export const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type StoredSpot = [id: string, lat: number, lng: number];

export interface SavedResults {
  /** Ring set the cells were computed for, e.g. "5,10,15". */
  ringsKey: string;
  /** Nearest ring per category (null = nothing inside the rings). */
  cells: Record<string, number | null>;
  /** Place ID of that nearest spot, for looking up its name (names themselves aren't stored). */
  nearest?: Record<string, string | null>;
  /** Search results per category: when fetched, radius searched, spots nearest first. */
  spots: Record<string, { at: number; radius: number; spots: StoredSpot[] }>;
}

export interface SavedAddress {
  id: string;
  /** Nickname shown as the column header. */
  label: string;
  /** Full address from Google. */
  address: string;
  placeId?: string;
  position: google.maps.LatLngLiteral;
  /** When `position` was looked up (ms). */
  positionAt: number;
  results?: SavedResults;
}

export const ringsKeyOf = (minutes: number[]) => minutes.join(',');

export function isSavedList(v: unknown): v is SavedAddress[] {
  return (
    Array.isArray(v) &&
    v.every(
      (a) =>
        a &&
        typeof a.id === 'string' &&
        typeof a.label === 'string' &&
        typeof a.address === 'string' &&
        typeof a.position?.lat === 'number' &&
        typeof a.position?.lng === 'number' &&
        typeof a.positionAt === 'number',
    )
  );
}

/** Drops stored search results older than 30 days (and the cells derived from them). */
export function pruneExpired(list: SavedAddress[], now = Date.now()): SavedAddress[] {
  return list.slice(0, MAX_SAVED).map((a) => {
    if (!a.results) return a;
    const spots = { ...a.results.spots };
    const cells = { ...a.results.cells };
    const nearest = { ...(a.results.nearest ?? {}) };
    for (const [id, s] of Object.entries(spots)) {
      if (now - s.at > MAX_AGE_MS) {
        delete spots[id];
        delete cells[id];
        delete nearest[id];
      }
    }
    return { ...a, results: { ...a.results, spots, cells, nearest } };
  });
}
