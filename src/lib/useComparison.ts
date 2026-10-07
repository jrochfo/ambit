import { useEffect, useMemo } from 'react';
import type { Category } from './categories';
import { ringShapes, searchRadius } from './nearby';
import {
  addressKey,
  classifyFor,
  ensureSearch,
  getSearch,
  requestRings,
  ringError,
  ringsFor,
  searchState,
  seedSearch,
} from './analysisStore';
import { ringsKeyOf, type SavedAddress, type SavedResults } from './saved';
import { useStoreVersion } from './useAnalysis';

export type Cell = { status: 'done'; ring: number | null } | { status: 'loading' } | { status: 'error'; message: string };

/**
 * Comparison grid cells (nearest ring per saved address × category). Stored results answer
 * a cell with no calls; otherwise the address's rings and that category's search are fetched
 * (positions only, no names needed). Fresh results are handed to `onResults` to store.
 */
export function useComparison(
  places: google.maps.PlacesLibrary | null,
  saved: SavedAddress[],
  ringMinutes: number[],
  categories: Category[],
  onResults: (id: string, results: SavedResults) => void,
): Record<string, Record<string, Cell>> {
  const version = useStoreVersion();
  const ringsKey = ringsKeyOf(ringMinutes);

  // Stored spots let a ring change re-sort without searching again.
  useEffect(() => {
    for (const a of saved) {
      const addr = addressKey(a.position);
      for (const [categoryId, s] of Object.entries(a.results?.spots ?? {})) {
        seedSearch(addr, categoryId, {
          at: s.at,
          radius: s.radius,
          places: s.spots.map(([id, lat, lng]) => ({ id, name: '', position: { lat, lng } })),
        });
      }
    }
  }, [saved]);

  const cells = useMemo(() => {
    const out: Record<string, Record<string, Cell>> = {};
    for (const a of saved) {
      const addr = addressKey(a.position);
      const stored = a.results?.ringsKey === ringsKey ? a.results.cells : undefined;
      const rings = ringsFor(addr, ringMinutes);
      const ringsReady = rings.length === ringMinutes.length;
      const shapes = ringsReady ? ringShapes(rings) : [];
      const row: Record<string, Cell> = {};
      for (const c of categories) {
        const search = getSearch(addr, c.id);
        const { pending, error } = searchState(addr, c.id);
        if (stored && c.id in stored) row[c.id] = { status: 'done', ring: stored[c.id]! };
        else if (search && ringsReady && !pending) row[c.id] = { status: 'done', ring: classifyFor(search, shapes, c).ring };
        else if (error || ringError(addr, ringMinutes)) row[c.id] = { status: 'error', message: error ?? ringError(addr, ringMinutes)! };
        else row[c.id] = { status: 'loading' };
      }
      out[a.id] = row;
    }
    return out;
  }, [saved, ringMinutes, ringsKey, categories, version]);

  // Fetch whatever a column is missing.
  useEffect(() => {
    if (!places) return;
    for (const a of saved) {
      const stored = a.results?.ringsKey === ringsKey ? a.results.cells : undefined;
      const missing = categories.filter((c) => !(stored && c.id in stored));
      if (missing.length === 0) continue;
      requestRings(a.position, ringMinutes);
      const rings = ringsFor(addressKey(a.position), ringMinutes);
      if (rings.length !== ringMinutes.length) continue;
      const shapes = ringShapes(rings);
      const radius = searchRadius(a.position, rings[rings.length - 1]!);
      for (const c of missing) ensureSearch(places, a.position, radius, shapes, c, false);
    }
  }, [places, saved, ringMinutes, ringsKey, categories, version]);

  // Store newly computed cells and spots (IDs and coordinates only).
  useEffect(() => {
    for (const a of saved) {
      const addr = addressKey(a.position);
      const rings = ringsFor(addr, ringMinutes);
      if (rings.length !== ringMinutes.length) continue;
      const shapes = ringShapes(rings);
      const prev = a.results;
      const sameRings = prev?.ringsKey === ringsKey;
      const next: SavedResults = { ringsKey, cells: sameRings ? { ...prev!.cells } : {}, spots: { ...(prev?.spots ?? {}) } };
      let changed = !sameRings;
      for (const c of categories) {
        const search = getSearch(addr, c.id);
        if (!search || searchState(addr, c.id).pending) continue;
        const ring = classifyFor(search, shapes, c).ring;
        if (next.cells[c.id] !== ring) {
          next.cells[c.id] = ring;
          changed = true;
        }
        if (next.spots[c.id]?.at !== search.at) {
          next.spots[c.id] = {
            at: search.at,
            radius: search.radius,
            spots: search.places.map((p) => [p.id, p.position.lat, p.position.lng]),
          };
          changed = true;
        }
      }
      if (changed && Object.keys(next.cells).length > 0) onResults(a.id, next);
    }
  }, [saved, ringMinutes, ringsKey, categories, version, onResults]);

  return cells;
}
