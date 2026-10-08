import { useEffect, useMemo } from 'react';
import type { Category } from './categories';
import { ringShapes, searchRadius } from './nearby';
import {
  addressKey,
  classifyFor,
  ensureLocality,
  ensureNames,
  ensureSearch,
  getName,
  getSearch,
  isHidden,
  nameFailed,
  requestRings,
  ringError,
  ringsFor,
  searchState,
  seedSearch,
} from './analysisStore';
import { ringsKeyOf, type SavedAddress, type SavedResults } from './saved';
import { useStoreVersion } from './useAnalysis';

export type Cell =
  | { status: 'done'; ring: number | null; spotId?: string | null; spotName?: string; nameFailed?: boolean; picked?: boolean }
  | { status: 'loading' }
  | { status: 'error'; message: string };

/**
 * Comparison grid cells (nearest ring per saved address × category). Stored results answer
 * a cell with no calls; otherwise the address's rings and that category's search are fetched
 * (positions only, no names needed). Fresh results are handed to `onResults` to store.
 */
export function useComparison(
  places: google.maps.PlacesLibrary | null,
  geocoding: google.maps.GeocodingLibrary | null,
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
      const storedNearest = a.results?.ringsKey === ringsKey ? a.results.nearest : undefined;
      const rings = ringsFor(addr, ringMinutes);
      const ringsReady = rings.length === ringMinutes.length;
      const shapes = ringsReady ? ringShapes(rings) : [];
      const row: Record<string, Cell> = {};
      for (const c of categories) {
        const search = getSearch(addr, c.id);
        const { pending, error } = searchState(addr, c.id);
        // A stored cell pointing at a spot the user has since hidden is recomputed.
        const storedUsable = stored && c.id in stored && !(storedNearest?.[c.id] && isHidden(storedNearest[c.id]!));
        if (storedUsable) {
          const spotId = storedNearest?.[c.id] ?? null;
          const picked = a.picks?.[c.id]?.id !== undefined && a.picks[c.id]!.id === spotId;
          row[c.id] = { status: 'done', ring: stored[c.id]!, spotId, spotName: spotId ? getName(spotId) : undefined, nameFailed: !!spotId && nameFailed(spotId), picked };
        } else if (search && ringsReady && !pending) {
          const { ring, nearest, picked } = classifyFor(search, shapes, c, a.picks?.[c.id]);
          const spotId = ring !== null ? (nearest?.id ?? null) : null;
          row[c.id] = { status: 'done', ring, spotId, spotName: spotId ? getName(spotId) : undefined, nameFailed: !!spotId && nameFailed(spotId), picked };
        }
        else if (error || ringError(addr, ringMinutes)) row[c.id] = { status: 'error', message: error ?? ringError(addr, ringMinutes)! };
        else row[c.id] = { status: 'loading' };
      }
      out[a.id] = row;
    }
    return out;
  }, [saved, ringMinutes, ringsKey, categories, version]);

  // Names for each cell's nearest spot (one name lookup per spot not already named this session).
  useEffect(() => {
    if (!places) return;
    const ids = Object.values(cells).flatMap((row) =>
      Object.values(row).flatMap((cell) => (cell.status === 'done' && cell.spotId && !cell.spotName && !cell.nameFailed ? [cell.spotId] : [])),
    );
    if (ids.length > 0) ensureNames(places, ids);
  }, [places, cells]);

  // Fetch whatever a column is missing.
  useEffect(() => {
    if (!places || !geocoding) return;
    for (const a of saved) {
      const stored = a.results?.ringsKey === ringsKey ? a.results.cells : undefined;
      const storedNearest = a.results?.ringsKey === ringsKey ? a.results.nearest : undefined;
      const missing = categories.filter((c) => !(stored && c.id in stored) || (storedNearest?.[c.id] && isHidden(storedNearest[c.id]!)));
      if (missing.length === 0) continue;
      requestRings(a.position, ringMinutes);
      const rings = ringsFor(addressKey(a.position), ringMinutes);
      if (rings.length !== ringMinutes.length) continue;
      const radius = searchRadius(a.position, rings[rings.length - 1]!);
      ensureLocality(geocoding, a.position);
      for (const c of missing) ensureSearch(places, a.position, radius, c, false);
    }
  }, [places, geocoding, saved, ringMinutes, ringsKey, categories, version]);

  // Store newly computed cells and spots (IDs and coordinates only).
  useEffect(() => {
    for (const a of saved) {
      const addr = addressKey(a.position);
      const rings = ringsFor(addr, ringMinutes);
      if (rings.length !== ringMinutes.length) continue;
      const shapes = ringShapes(rings);
      const prev = a.results;
      const sameRings = prev?.ringsKey === ringsKey;
      const next: SavedResults = {
        ringsKey,
        cells: sameRings ? { ...prev!.cells } : {},
        nearest: sameRings ? { ...(prev!.nearest ?? {}) } : {},
        spots: { ...(prev?.spots ?? {}) },
      };
      let changed = !sameRings;
      for (const c of categories) {
        const search = getSearch(addr, c.id);
        if (!search || searchState(addr, c.id).pending) continue;
        const { ring, nearest } = classifyFor(search, shapes, c, a.picks?.[c.id]);
        const spotId = ring !== null ? (nearest?.id ?? null) : null;
        if (next.cells[c.id] !== ring || next.nearest![c.id] !== spotId) {
          next.cells[c.id] = ring;
          next.nearest![c.id] = spotId;
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
