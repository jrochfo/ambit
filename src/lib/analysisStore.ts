import type { Ring } from '../../shared/isochrones';
import { fetchIsochrones } from './api';
import { DEFAULT_EDGE_TOLERANCE, type Category } from './categories';
import {
  MAX_RESULTS,
  applyPick,
  metersBetween,
  classify,
  needsWiderSearch,
  searchCategory,
  type CategoryMatches,
  type CategorySearch,
  type RingShapes,
  type SpotPick,
} from './nearby';

/**
 * Shared, session-only caches for every address on screen (the map and each comparison
 * column), so nothing billed is fetched twice: rings per address and minute value, searches
 * per address and category. Components subscribe through useStoreVersion.
 */

export interface CachedSearch extends CategorySearch {
  /** When Google returned it (ms). */
  at: number;
  /** False for searches restored from saved results, which keep only IDs and coordinates. */
  named: boolean;
}

const ringCache = new Map<string, Map<number, Ring>>();
/**
 * Each address's city center (null if unknown). Listings Google can't locate get pinned to
 * exactly that point (a "park" on San Francisco's center), so results within a few meters are
 * dropped. Tested: real spots near a center, like Van Ness station, sit 35 m away.
 */
const localityCenters = new Map<string, google.maps.LatLngLiteral | null>();
const CITY_CENTER_JUNK_METERS = 5;
/** Spots the user hid (place IDs), left out everywhere. */
let hiddenSpots: ReadonlySet<string> = new Set();
/** Spot names by place ID: from searches (free) or looked up for the grid (Place Details). */
const nameCache = new Map<string, string>();
const searchCache = new Map<string, Map<string, CachedSearch>>();
const pending = new Set<string>();
// Failures aren't retried automatically (that could loop on billed calls); clearFailures() resets.
const failed = new Map<string, string>();

let version = 0;
const listeners = new Set<() => void>();
function emit() {
  version++;
  listeners.forEach((l) => l());
}
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const getVersion = () => version;

export const addressKey = (p: google.maps.LatLngLiteral) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
const ringKey = (addr: string, m: number) => `ring|${addr}|${m}`;
const searchKey = (addr: string, categoryId: string) => `search|${addr}|${categoryId}`;
const spreadKey = (addr: string, categoryId: string) => `spread|${addr}|${categoryId}`;
const nameKey = (placeId: string) => `name|${placeId}`;
const localityKey = (addr: string) => `locality|${addr}`;
const SPREAD = '#spread';

/** Cached rings for an address among `minutes`, ascending. */
export function ringsFor(addr: string, minutes: number[]): Ring[] {
  const cached = ringCache.get(addr);
  return minutes.flatMap((m) => (cached?.has(m) ? [cached.get(m)!] : [])).sort((a, b) => a.minutes - b.minutes);
}

export function ringError(addr: string, minutes: number[]): string | undefined {
  return minutes.map((m) => failed.get(ringKey(addr, m))).find(Boolean);
}

/** Fetches the rings an address is missing (one Isochrones call per ring). */
export function requestRings(origin: google.maps.LatLngLiteral, minutes: number[]): void {
  const addr = addressKey(origin);
  const missing = minutes.filter((m) => {
    const key = ringKey(addr, m);
    return !ringCache.get(addr)?.has(m) && !pending.has(key) && !failed.has(key);
  });
  if (missing.length === 0) return;
  const keys = missing.map((m) => ringKey(addr, m));
  keys.forEach((k) => pending.add(k));
  emit();
  fetchIsochrones(origin.lat, origin.lng, missing)
    .then(({ rings }) => {
      const cached = ringCache.get(addr) ?? new Map<number, Ring>();
      rings.forEach((r) => cached.set(r.minutes, r));
      ringCache.set(addr, cached);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Walking rings request failed';
      keys.forEach((k) => failed.set(k, message));
    })
    .finally(() => {
      keys.forEach((k) => pending.delete(k));
      emit();
    });
}

export function getSearch(addr: string, categoryId: string): CachedSearch | undefined {
  return searchCache.get(addr)?.get(categoryId);
}

export function searchState(addr: string, categoryId: string): { pending: boolean; error?: string } {
  const key = searchKey(addr, categoryId);
  return { pending: pending.has(key), error: failed.get(key) };
}

export function classifyFor(search: CategorySearch, shapes: RingShapes, category: Category, pick?: SpotPick): CategoryMatches {
  const tolerance = category.edgeTolerance ?? DEFAULT_EDGE_TOLERANCE;
  const visible = hiddenSpots.size ? { ...search, places: search.places.filter((p) => !hiddenSpots.has(p.id)) } : search;
  return applyPick(classify(visible, shapes, tolerance), pick && !hiddenSpots.has(pick.id) ? pick : undefined, shapes, tolerance, getName);
}

export const isHidden = (placeId: string) => hiddenSpots.has(placeId);

export function setHiddenSpots(ids: ReadonlySet<string>): void {
  hiddenSpots = ids;
  emit();
}

/**
 * Finds an address's city center (one reverse-geocoding call per address per session).
 * Searches wait for it so junk can be filtered before results are cached or stored.
 */
export function ensureLocality(geocoding: google.maps.GeocodingLibrary, origin: google.maps.LatLngLiteral): void {
  const addr = addressKey(origin);
  const key = localityKey(addr);
  if (localityCenters.has(addr) || pending.has(key)) return;
  pending.add(key);
  new geocoding.Geocoder()
    .geocode({ location: origin })
    .then(({ results }) => {
      const locality = results.find((r) => r.types.includes('locality'));
      localityCenters.set(addr, locality ? locality.geometry.location.toJSON() : null);
    })
    .catch((err: unknown) => {
      console.error('City lookup failed', err);
      localityCenters.set(addr, null); // search anyway, just without this filter
    })
    .finally(() => {
      pending.delete(key);
      emit();
    });
}

function dropCityCenterJunk<T extends CategorySearch>(addr: string, search: T): T {
  const center = localityCenters.get(addr);
  if (!center) return search;
  return { ...search, places: search.places.filter((p) => metersBetween(p.position, center) > CITY_CENTER_JUNK_METERS) };
}

/**
 * Runs a category's search for an address unless the cache already answers it: a search
 * with names when `needNames` (the map), and a wider one only when rings grew and the old
 * search found nothing inside them.
 */
export function ensureSearch(
  places: google.maps.PlacesLibrary,
  origin: google.maps.LatLngLiteral,
  radius: number,
  category: Category,
  needNames: boolean,
): void {
  const addr = addressKey(origin);
  const key = searchKey(addr, category.id);
  if (pending.has(key) || failed.has(key) || !localityCenters.has(addr)) return;
  const cached = getSearch(addr, category.id);
  if (cached && (cached.named || !needNames) && !needsWiderSearch(cached, radius)) return;

  pending.add(key);
  emit();
  searchCategory(places, origin, radius, category)
    .then((raw) => {
      const result = dropCityCenterJunk(addr, raw);
      const byCategory = searchCache.get(addr) ?? new Map<string, CachedSearch>();
      byCategory.set(category.id, { ...result, at: Date.now(), named: true });
      searchCache.set(addr, byCategory);
      result.places.forEach((p) => nameCache.set(p.id, p.name));
    })
    .catch((err: unknown) => {
      console.error(`Search failed for ${category.label}`, err);
      failed.set(key, describeSearchError(err));
    })
    .finally(() => {
      pending.delete(key);
      emit();
    });
}

/**
 * For a focused category whose nearest-first search was full (20), one more search for the
 * 20 most popular across the whole area, so outer rings show spots too. Type categories only:
 * Text Search already ranks by relevance across the area.
 */
export function ensureSpreadSearch(
  places: google.maps.PlacesLibrary,
  origin: google.maps.LatLngLiteral,
  radius: number,
  category: Category,
): void {
  const addr = addressKey(origin);
  const primary = getSearch(addr, category.id);
  if (category.query || !primary?.named || primary.places.length < MAX_RESULTS) return;
  const key = spreadKey(addr, category.id);
  const cached = getSpreadSearch(addr, category.id);
  if (pending.has(key) || failed.has(key) || !localityCenters.has(addr) || (cached && cached.radius >= radius)) return;

  pending.add(key);
  emit();
  searchCategory(places, origin, radius, category, 'spread')
    .then((raw) => {
      const result = dropCityCenterJunk(addr, raw);
      const byCategory = searchCache.get(addr) ?? new Map<string, CachedSearch>();
      byCategory.set(category.id + SPREAD, { ...result, at: Date.now(), named: true });
      searchCache.set(addr, byCategory);
      result.places.forEach((p) => nameCache.set(p.id, p.name));
    })
    .catch((err: unknown) => {
      console.error(`Spread search failed for ${category.label}`, err);
      failed.set(key, describeSearchError(err));
    })
    .finally(() => {
      pending.delete(key);
      emit();
    });
}

export function getSpreadSearch(addr: string, categoryId: string): CachedSearch | undefined {
  return searchCache.get(addr)?.get(categoryId + SPREAD);
}

export function getName(placeId: string): string | undefined {
  return nameCache.get(placeId);
}

/** The name lookup for a spot failed (cleared by clearFailures, so a later search retries). */
export function nameFailed(placeId: string): boolean {
  return failed.has(nameKey(placeId));
}

/**
 * Looks up names for spots shown in the comparison grid (one Place Details call each, name
 * only; cached for the session, never stored, per Google's terms).
 */
export function ensureNames(places: google.maps.PlacesLibrary, placeIds: string[]): void {
  for (const id of new Set(placeIds)) {
    const key = nameKey(id);
    if (nameCache.has(id) || pending.has(key) || failed.has(key)) continue;
    pending.add(key);
    const place = new places.Place({ id });
    place
      .fetchFields({ fields: ['displayName'] })
      .then(() => {
        if (place.displayName) nameCache.set(id, place.displayName);
      })
      .catch((err: unknown) => {
        console.error('Name lookup failed', err);
        failed.set(key, describeSearchError(err));
      })
      .finally(() => {
        pending.delete(key);
        emit();
      });
  }
}

/** Restores a saved search (IDs and coordinates only) without a call; never overwrites a live one. */
export function seedSearch(addr: string, categoryId: string, search: Omit<CachedSearch, 'named'>): void {
  if (getSearch(addr, categoryId)) return;
  const byCategory = searchCache.get(addr) ?? new Map<string, CachedSearch>();
  byCategory.set(categoryId, { ...search, named: false });
  searchCache.set(addr, byCategory);
}

/** Lets failed rings and searches be requested again (on a new search or refresh). */
export function clearFailures(): void {
  if (failed.size === 0) return;
  failed.clear();
  emit();
}

/** Google's quota errors are long and technical; the per-day caps are the common case. */
function describeSearchError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/RESOURCE_EXHAUSTED|Quota exceeded/i.test(message)) return 'Daily search limit reached. It resets at midnight Pacific time.';
  return message || 'Search failed';
}
