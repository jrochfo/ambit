import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Category } from './categories';
import type { CategoryMatches } from './nearby';
import { ringShapes, searchRadius } from './nearby';
import {
  addressKey,
  classifyFor,
  ensureSearch,
  getSearch,
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
  origin: google.maps.LatLngLiteral | null,
  ringMinutes: number[],
  categories: Category[],
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
    if (!places || !origin || !ringsReady || !radius) return;
    for (const c of categories) ensureSearch(places, origin, radius, shapes, c, true);
  }, [places, origin, ringsReady, radius, shapes, categories, version]);

  const results = useMemo(() => {
    const out: Record<string, CategoryResult> = {};
    if (!addr) return out;
    for (const c of categories) {
      const { pending, error } = searchState(addr, c.id);
      const search = getSearch(addr, c.id);
      if (error) out[c.id] = { status: 'error', message: error };
      else if (pending || !search?.named || !ringsReady) out[c.id] = { status: 'loading' };
      else out[c.id] = { status: 'done', ...classifyFor(search, shapes, c) };
    }
    return out;
  }, [addr, categories, shapes, ringsReady, version]);

  return {
    rings,
    ringsLoading: origin !== null && !ringsReady && !ringError,
    ringError,
    results,
  };
}
