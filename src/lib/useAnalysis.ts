import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Category } from './categories';
import type { CategoryMatches, SpotPick } from './nearby';
import { mergeSearches, ringShapes, searchRadius } from './nearby';
import {
  addressKey,
  classifyFor,
  ensureLocality,
  ensureNames,
  ensureSearch,
  ensureSpreadSearch,
  getSearch,
  getSpreadSearch,
  getVersion,
  requestRings,
  ringError as storedRingError,
  ringsFor,
  searchState,
  subscribe,
} from './analysisStore';

export type CategoryResult = { status: 'loading' } | { status: 'error'; message: string } | ({ status: 'done' } & CategoryMatches);

export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getVersion);
}

/**
 * Walking rings and category spots (with names) for the address on the map. Only rings and
 * searches that aren't cached yet are requested, so toggling rings or categories back on is free.
 */
export function useAnalysis(
  places: google.maps.PlacesLibrary | null,
  geocoding: google.maps.GeocodingLibrary | null,
  origin: google.maps.LatLngLiteral | null,
  ringMinutes: number[],
  categories: Category[],
  /** Focused category: also gets a spread search so outer rings show spots. */
  focused: string | null,
  /** Spots the user picked per category at this address. */
  picks: Record<string, SpotPick> | undefined,
) {
  const version = useStoreVersion();
  const addr = origin ? addressKey(origin) : null;

  const rings = useMemo(() => (addr ? ringsFor(addr, ringMinutes) : []), [addr, ringMinutes, version]);
  const ringsReady = origin !== null && rings.length === ringMinutes.length;
  const ringError = addr ? storedRingError(addr, ringMinutes) : undefined;
  const shapes = useMemo(() => ringShapes(rings), [rings]);
  const largest = rings[rings.length - 1];
  const radius = useMemo(() => (origin && largest ? searchRadius(origin, largest) : 0), [origin, largest]);

  useEffect(() => {
    if (origin) requestRings(origin, ringMinutes);
  }, [origin, ringMinutes, version]);

  useEffect(() => {
    if (!places || !geocoding || !origin || !ringsReady || !radius) return;
    ensureLocality(geocoding, origin);
    for (const c of categories) ensureSearch(places, origin, radius, c, true);
    const focusedCategory = categories.find((c) => c.id === focused);
    if (focusedCategory) ensureSpreadSearch(places, origin, radius, focusedCategory);
  }, [places, geocoding, origin, ringsReady, radius, categories, focused, version]);

  const results = useMemo(() => {
    const out: Record<string, CategoryResult> = {};
    if (!addr) return out;
    for (const c of categories) {
      const { pending, error } = searchState(addr, c.id);
      const search = getSearch(addr, c.id);
      if (error) out[c.id] = { status: 'error', message: error };
      else if (pending || !search?.named || !ringsReady) out[c.id] = { status: 'loading' };
      else {
        // The focused category's spread search adds spots across all rings; nearest is unchanged.
        const spread = c.id === focused ? getSpreadSearch(addr, c.id) : undefined;
        out[c.id] = { status: 'done', ...classifyFor(spread && origin ? mergeSearches(origin, search, spread) : search, shapes, c, picks?.[c.id]) };
      }
    }
    return out;
  }, [addr, origin, categories, shapes, ringsReady, focused, picks, version]);

  // A pick that isn't among this session's results needs its name looked up.
  useEffect(() => {
    if (!places) return;
    const missing = Object.values(results).flatMap((r) => (r.status === 'done' && r.picked && r.nearest && !r.nearest.name ? [r.nearest.id] : []));
    if (missing.length) ensureNames(places, missing);
  }, [places, results]);

  return {
    rings,
    ringsLoading: origin !== null && !ringsReady && !ringError,
    ringError,
    results,
  };
}
