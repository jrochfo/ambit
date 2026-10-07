import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Ring } from '../../shared/isochrones';
import { fetchIsochrones } from './api';
import type { Category } from './categories';
import { classify, needsWiderSearch, ringShapes, searchCategory, searchRadius, type CategoryMatches, type CategorySearch } from './nearby';

export type CategoryResult = { status: 'loading' } | { status: 'error'; message: string } | ({ status: 'done' } & CategoryMatches);

// Session-only caches, keyed by address, so nothing billed is fetched twice:
// rings per minute value, searches per category. In memory only, since Google's
// terms limit storing Places data.
const ringCache = new Map<string, Map<number, Ring>>();
const searchCache = new Map<string, Map<string, CategorySearch>>();
const addressKey = (p: google.maps.LatLngLiteral) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

/**
 * Walking rings and category matches for one address. Only rings and categories
 * that aren't cached yet are requested, so toggling rings or categories back on is free.
 */
export function useAnalysis(
  places: google.maps.PlacesLibrary | null,
  origin: google.maps.LatLngLiteral | null,
  ringMinutes: number[],
  categories: Category[],
) {
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const pending = useRef(new Set<string>());
  // Failures aren't retried automatically (that could loop on billed calls); retry() clears them.
  const failed = useRef(new Map<string, string>());
  const [, setFailedVersion] = useState(0);
  const addr = origin ? addressKey(origin) : null;

  const rings = useMemo(() => {
    const cached = addr ? ringCache.get(addr) : undefined;
    return ringMinutes.flatMap((m) => (cached?.has(m) ? [cached.get(m)!] : [])).sort((a, b) => a.minutes - b.minutes);
  }, [addr, ringMinutes, version]);
  const ringsReady = origin !== null && rings.length === ringMinutes.length;
  const ringError = addr ? ringMinutes.map((m) => failed.current.get(`ring|${addr}|${m}`)).find(Boolean) : undefined;

  // Fetch rings this address doesn't have yet.
  useEffect(() => {
    if (!origin || !addr) return;
    const missing = ringMinutes.filter((m) => {
      const key = `ring|${addr}|${m}`;
      return !ringCache.get(addr)?.has(m) && !pending.current.has(key) && !failed.current.has(key);
    });
    if (missing.length === 0) return;
    const keys = missing.map((m) => `ring|${addr}|${m}`);
    keys.forEach((k) => pending.current.add(k));
    fetchIsochrones(origin.lat, origin.lng, missing)
      .then(({ rings }) => {
        const cached = ringCache.get(addr) ?? new Map<number, Ring>();
        rings.forEach((r) => cached.set(r.minutes, r));
        ringCache.set(addr, cached);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Walking rings request failed';
        keys.forEach((k) => failed.current.set(k, message));
      })
      .finally(() => {
        keys.forEach((k) => pending.current.delete(k));
        bump();
      });
  }, [origin, addr, ringMinutes]);

  const shapes = useMemo(() => ringShapes(rings), [rings]);
  const largest = rings[rings.length - 1];
  const radius = useMemo(() => (origin && largest ? searchRadius(origin, largest) : 0), [origin, largest]);

  const matches = useMemo(() => {
    const out: Record<string, CategoryMatches> = {};
    const cached = addr ? searchCache.get(addr) : undefined;
    for (const c of categories) {
      const search = cached?.get(c.id);
      if (search) out[c.id] = classify(search, shapes);
    }
    return out;
  }, [addr, categories, shapes, version]);

  // One Nearby Search per enabled category that has no usable cached search, once every ring is in.
  useEffect(() => {
    if (!places || !origin || !addr || !ringsReady || !radius) return;
    for (const c of categories) {
      const key = `search|${addr}|${c.id}`;
      if (pending.current.has(key) || failed.current.has(key)) continue;
      const search = searchCache.get(addr)?.get(c.id);
      const current = matches[c.id];
      if (search && current && !needsWiderSearch(search, radius, current)) continue;

      pending.current.add(key);
      searchCategory(places, origin, radius, c)
        .then((result) => {
          const cached = searchCache.get(addr) ?? new Map<string, CategorySearch>();
          cached.set(c.id, result);
          searchCache.set(addr, cached);
        })
        .catch((err: unknown) => {
          console.error(`Nearby search failed for ${c.label}`, err);
          failed.current.set(key, err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => {
          pending.current.delete(key);
          bump();
        });
    }
  }, [places, origin, addr, ringsReady, radius, categories, matches]);

  const results = useMemo(() => {
    const out: Record<string, CategoryResult> = {};
    if (!addr) return out;
    for (const c of categories) {
      const key = `search|${addr}|${c.id}`;
      const error = failed.current.get(key);
      if (error) out[c.id] = { status: 'error', message: error };
      else if (pending.current.has(key) || !matches[c.id]) out[c.id] = { status: 'loading' };
      else out[c.id] = { status: 'done', ...matches[c.id]! };
    }
    return out;
  }, [addr, categories, matches, version]);

  /** Allow failed rings and searches to be requested again (on a new search). */
  const retry = useCallback(() => {
    failed.current.clear();
    setFailedVersion((n) => n + 1);
  }, []);

  return {
    rings,
    ringsLoading: origin !== null && !ringsReady && !ringError,
    ringError,
    results,
    retry,
  };
}
