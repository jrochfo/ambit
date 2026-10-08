import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { DEFAULT_RINGS, MAX_RINGS, isValidRing } from '../shared/isochrones';
import { Header } from './components/Header';
import { StatusLine, type Status } from './components/StatusLine';
import { AddressSearch, type SearchTarget } from './components/AddressSearch';
import { RingPicker } from './components/RingPicker';
import { MapPanel, type Origin, type Pin } from './components/MapPanel';
import { NearbyList } from './components/NearbyList';
import { CATEGORIES, DEFAULT_CATEGORY_IDS, isCustomCategoryList, makeCustomCategory, type Category } from './lib/categories';
import type { AddOption } from './components/AddCategory';
import { strongEmojiMatch } from './lib/emojiTags';
import { useTheme, type Theme } from './lib/theme';
import { loadPref, savePref } from './lib/storage';
import { useAnalysis, type CategoryResult } from './lib/useAnalysis';
import type { NearbyPlace, SpotPick } from './lib/nearby';
import { addressKey, clearFailures } from './lib/analysisStore';
import { MAX_AGE_MS, MAX_SAVED, isSavedList, pruneExpired, type SavedAddress, type SavedResults } from './lib/saved';
import { useComparison } from './lib/useComparison';
import { SaveControl } from './components/SaveControl';
import { CompareGrid } from './components/CompareGrid';

const BROWSER_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined;


export default function App() {
  const [theme, setTheme] = useTheme();
  if (!BROWSER_KEY) {
    return (
      <div className="app">
        <Header theme={theme} onTheme={setTheme} />
        <p className="status status-error">Missing VITE_GOOGLE_MAPS_BROWSER_KEY in .env.</p>
      </div>
    );
  }
  return (
    <APIProvider apiKey={BROWSER_KEY}>
      <Ambit theme={theme} onTheme={setTheme} />
    </APIProvider>
  );
}

const isNumberList = (v: unknown): v is number[] => Array.isArray(v) && v.length > 0 && v.every(isValidRing);
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

function Ambit({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) {
  const geocoding = useMapsLibrary('geocoding');
  const places = useMapsLibrary('places');
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [ringMinutes, setRingMinutes] = useState<number[]>(() =>
    [...new Set(loadPref('rings', DEFAULT_RINGS, isNumberList))].sort((a, b) => a - b).slice(0, MAX_RINGS),
  );
  const [hiddenRings, setHiddenRings] = useState<ReadonlySet<number>>(() => new Set());
  const [categoryIds, setCategoryIds] = useState<ReadonlySet<string>>(() => new Set(loadPref('categories', DEFAULT_CATEGORY_IDS, isStringList)));
  const [customs, setCustoms] = useState<Category[]>(() => loadPref('customCategories', [], isCustomCategoryList));
  const [focused, setFocused] = useState<string | null>(null);
  // Category whose nearest spot's card is shown open (picked from the comparison grid).
  const [spotlight, setSpotlight] = useState<string | null>(null);
  // Picks for addresses that aren't saved (saved ones keep theirs on the address); session only.
  const [sessionPicks, setSessionPicks] = useState<Record<string, Record<string, SpotPick>>>({});
  const [saved, setSaved] = useState<SavedAddress[]>(() => pruneExpired(loadPref('savedAddresses', [], isSavedList)));
  const lookup = useRef(0);

  useEffect(() => savePref('rings', ringMinutes), [ringMinutes]);
  useEffect(() => savePref('categories', [...categoryIds]), [categoryIds]);
  useEffect(() => savePref('customCategories', customs), [customs]);
  useEffect(() => savePref('savedAddresses', saved), [saved]);

  // Stored coordinates may be kept 30 days; after that, look the address up again (Geocoding,
  // by place ID when we have one). A moved point invalidates its stored results.
  useEffect(() => {
    if (!geocoding) return;
    const stale = saved.filter((a) => Date.now() - a.positionAt > MAX_AGE_MS);
    for (const a of stale) {
      new geocoding.Geocoder()
        .geocode(a.placeId ? { placeId: a.placeId } : { address: a.address })
        .then(({ results }) => {
          const position = results[0]?.geometry.location.toJSON();
          if (!position) return;
          setSaved((prev) =>
            prev.map((x) =>
              x.id !== a.id
                ? x
                : { ...x, position, positionAt: Date.now(), results: addressKey(position) === addressKey(x.position) ? x.results : undefined },
            ),
          );
        })
        .catch((err: unknown) => console.error('Refreshing saved address failed', err));
    }
  }, [geocoding, saved]);

  const categories = useMemo(() => [...CATEGORIES, ...customs].filter((c) => categoryIds.has(c.id)), [categoryIds, customs]);
  const position = origin?.position ?? null;
  const currentSaved = origin ? saved.find((a) => addressKey(a.position) === addressKey(origin.position)) : undefined;
  const currentPicks = currentSaved ? currentSaved.picks : origin ? sessionPicks[addressKey(origin.position)] : undefined;
  const analysis = useAnalysis(places, position, ringMinutes, categories, focused, currentPicks);

  // Choose which spot counts for a category at the mapped address (null = back to the nearest).
  const setPick = useCallback(
    (categoryId: string, place: NearbyPlace | null) => {
      if (!origin) return;
      const update = (picks: Record<string, SpotPick> | undefined) => {
        const next = { ...(picks ?? {}) };
        if (place) next[categoryId] = { id: place.id, lat: place.position.lat, lng: place.position.lng, at: Date.now() };
        else delete next[categoryId];
        return next;
      };
      if (currentSaved) setSaved((prev) => prev.map((a) => (a.id === currentSaved.id ? { ...a, picks: update(a.picks) } : a)));
      else setSessionPicks((prev) => ({ ...prev, [addressKey(origin.position)]: update(prev[addressKey(origin.position)]) }));
    },
    [origin, currentSaved],
  );

  const updateResults = useCallback((id: string, results: SavedResults) => {
    setSaved((prev) => prev.map((a) => (a.id === id ? { ...a, results } : a)));
  }, []);
  const comparison = useComparison(places, saved, ringMinutes, categories, updateResults);

  const mapAddress = useCallback(
    async (target: SearchTarget) => {
      if (!geocoding) return;
      const id = ++lookup.current;
      try {
        setStatus({ kind: 'busy', message: 'Finding that address…' });
        const found = target.kind === 'prediction' ? await resolvePrediction(target.prediction) : await geocode(geocoding, target.text);
        if (id !== lookup.current) return;
        clearFailures();
        setFocused(null);
        setSpotlight(null);
        setOrigin({ position: found.position, label: found.address.split(',')[0] ?? found.address, address: found.address, placeId: found.placeId });
        setStatus({ kind: 'done', address: found.address });
      } catch (err) {
        if (id !== lookup.current) return;
        const message =
          err instanceof Error && 'code' in err && err.code === 'ZERO_RESULTS'
            ? 'Couldn’t find that address.'
            : err instanceof Error
              ? err.message
              : 'Something went wrong.';
        setStatus({ kind: 'error', message });
      }
    },
    [geocoding],
  );

  const saveCurrent = useCallback(
    (label: string) => {
      if (!origin) return;
      setSaved((prev) =>
        prev.length >= MAX_SAVED || prev.some((a) => addressKey(a.position) === addressKey(origin.position))
          ? prev
          : [
              ...prev,
              {
                id: `addr-${Date.now().toString(36)}`,
                label,
                address: origin.address,
                placeId: origin.placeId,
                position: origin.position,
                positionAt: Date.now(),
                picks: sessionPicks[addressKey(origin.position)],
              },
            ],
      );
    },
    [origin, sessionPicks],
  );
  const removeSaved = useCallback((id: string) => setSaved((prev) => prev.filter((a) => a.id !== id)), []);
  const renameSaved = useCallback((id: string, label: string) => setSaved((prev) => prev.map((a) => (a.id === id ? { ...a, label } : a))), []);
  // Mapping a saved address reuses its stored point: no lookup call.
  const showSaved = useCallback((a: SavedAddress) => {
    lookup.current++;
    clearFailures();
    setFocused(null);
    setSpotlight(null);
    setOrigin({ position: a.position, label: a.label, address: a.address, placeId: a.placeId });
    setStatus({ kind: 'done', address: a.address });
  }, []);
  // A grid cell: map that address, show the category's spots, and open its nearest spot's card.
  const showSavedSpot = useCallback(
    (a: SavedAddress, categoryId: string) => {
      showSaved(a);
      setFocused(categoryId);
      setSpotlight(categoryId);
    },
    [showSaved],
  );
  const focusCategory = useCallback((id: string | null) => {
    setFocused(id);
    setSpotlight(null);
  }, []);

  const toggleRing = useCallback((m: number) => setHiddenRings((prev) => toggled(prev, m)), []);
  const addRing = useCallback((m: number) => setRingMinutes((prev) => [...new Set([...prev, m])].sort((a, b) => a - b).slice(0, MAX_RINGS)), []);
  const removeRing = useCallback((m: number) => setRingMinutes((prev) => (prev.length > 1 ? prev.filter((x) => x !== m) : prev)), []);
  const resetCategories = useCallback(() => {
    setCategoryIds(new Set(DEFAULT_CATEGORY_IDS));
    setFocused(null);
  }, []);
  const clearCategories = useCallback(() => {
    setCategoryIds(new Set());
    setFocused(null);
  }, []);
  // Adding turns the category on; a type or query that already exists is reused, not duplicated.
  const addCategory = useCallback(
    (option: AddOption) => {
      let id: string;
      if (option.kind === 'existing') id = option.category.id;
      else {
        const match = customs.find((c) => (option.kind === 'type' ? c.types[0] === option.type : c.query?.toLowerCase() === option.text.toLowerCase()));
        if (match) id = match.id;
        else {
          const label = option.kind === 'type' ? option.label : option.text.charAt(0).toUpperCase() + option.text.slice(1);
          // Start from a confident emoji match ("Climbing gym" → 🧗), else the pin.
          const emoji = strongEmojiMatch(label, option.kind === 'type' ? option.type : undefined) ?? undefined;
          const created = makeCustomCategory(
            option.kind === 'type' ? { label, type: option.type, emoji } : { label, query: option.text, emoji },
            customs,
          );
          setCustoms((prev) => [...prev, created]);
          id = created.id;
        }
      }
      setCategoryIds((prev) => new Set([...prev, id]));
    },
    [customs],
  );
  const removeCustom = useCallback((id: string) => {
    setCustoms((prev) => prev.filter((c) => c.id !== id));
    setCategoryIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setFocused((f) => (f === id ? null : f));
  }, []);
  const setCustomEmoji = useCallback((id: string, emoji: string) => {
    setCustoms((prev) => prev.map((c) => (c.id === id ? { ...c, emoji: [emoji] } : c)));
  }, []);
  const toggleCategory = useCallback((id: string) => {
    setCategoryIds((prev) => toggled(prev, id));
    setFocused((f) => (f === id ? null : f));
  }, []);

  // Overview: each category's nearest match. Focused: every match for that one category.
  // Overview: the spot that counts per category. Focused: every spot in that category, each
  // able to become the pick.
  const pins: Pin[] = categories.flatMap((category) => {
    const r = analysis.results[category.id];
    if (r?.status !== 'done' || !r.nearest) return [];
    const current = r.nearest;
    const pin = (place: NearbyPlace): Pin => ({
      category,
      place,
      pick: {
        role: place.id === current.id ? (r.picked ? 'chosen' : 'nearest') : 'other',
        others: r.within.filter((p) => p.id !== current.id).length,
        emphasize: focused === category.id && place.id === current.id,
        onChoose: () => setPick(category.id, place),
        onUseNearest: () => setPick(category.id, null),
      },
    });
    if (focused === null) return [pin(current)];
    if (focused !== category.id) return [];
    const list = r.within.some((p) => p.id === current.id) ? r.within : [current, ...r.within];
    return list.map(pin);
  });

  const spotlightResult = spotlight ? analysis.results[spotlight] : undefined;
  const spotlightKey = spotlightResult?.status === 'done' && spotlightResult.nearest ? `${spotlight}:${spotlightResult.nearest.id}` : null;

  const shownStatus: Status =
    status.kind !== 'done'
      ? status
      : analysis.ringError
        ? { kind: 'error', message: analysis.ringError }
        : analysis.ringsLoading
          ? { kind: 'busy', message: 'Drawing walking rings…' }
          : status;

  return (
    <div className="app">
      <Header theme={theme} onTheme={onTheme} />
      <main className="main">
        <aside className="card sidebar">
          <div className="sidebar-head">
            <AddressSearch busy={status.kind === 'busy' || !geocoding || !places} onSearch={mapAddress} />
            {/* The mapped address comes first: everything below adjusts what's shown for it. */}
            <StatusLine status={shownStatus} />
            {origin && status.kind === 'done' && (
              <SaveControl
                key={addressKey(origin.position)}
                defaultLabel={origin.label}
                saved={currentSaved}
                full={saved.length >= MAX_SAVED}
                onSave={saveCurrent}
                onRemove={removeSaved}
              />
            )}
          </div>
          {/* Scrolls inside the card when side by side with the map, so the sidebar never outgrows it. */}
          <div className="sidebar-scroll">
            <RingPicker rings={ringMinutes} hidden={hiddenRings} onToggle={toggleRing} onAdd={addRing} onRemove={removeRing} />
            <NearbyList
              catalog={CATEGORIES}
              customs={customs}
              categories={categories}
              results={analysis.results}
              rings={analysis.rings.map((r) => r.minutes)}
              focused={focused}
              onFocus={focusCategory}
              onToggleCategory={toggleCategory}
              onClearCategories={clearCategories}
              onResetCategories={resetCategories}
              onAddCategory={addCategory}
              onRemoveCustom={removeCustom}
              onSetEmoji={setCustomEmoji}
            />
          </div>
        </aside>
        <MapPanel
          origin={origin}
          rings={analysis.rings}
          hidden={hiddenRings}
          pins={pins}
          spotlight={spotlightKey}
          onMapClick={() => setSpotlight(null)}
          theme={theme}
        />
        <CompareGrid
        saved={saved}
        categories={categories}
        rings={ringMinutes}
        cells={comparison}
        currentId={currentSaved?.id}
        onSelect={showSaved}
        onSelectCell={showSavedSpot}
        onRemove={removeSaved}
          onRename={renameSaved}
        />
      </main>
      <ResultsAnnouncer origin={origin} results={analysis.results} />
    </div>
  );
}

function toggled<T>(set: ReadonlySet<T>, item: T): ReadonlySet<T> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

interface FoundAddress {
  position: google.maps.LatLngLiteral;
  address: string;
  placeId?: string;
}

/** Picking a suggestion: one Place lookup (location + address only) that also closes the autocomplete session. */
async function resolvePrediction(prediction: google.maps.places.PlacePrediction): Promise<FoundAddress> {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ['location', 'formattedAddress'] });
  if (!place.location) throw new Error('Couldn’t find that address.');
  return { position: place.location.toJSON(), address: place.formattedAddress ?? prediction.text.text, placeId: prediction.placeId };
}

/** Typed text with no suggestions to pick from: fall back to the Geocoding API. */
async function geocode(lib: google.maps.GeocodingLibrary, address: string): Promise<FoundAddress> {
  const { results } = await new lib.Geocoder().geocode({ address });
  const top = results[0];
  if (!top) throw new Error('Couldn’t find that address.');
  return { position: top.geometry.location.toJSON(), address: top.formatted_address, placeId: top.place_id };
}

/** Tells screen readers when an address's categories have finished loading. */
function ResultsAnnouncer({ origin, results }: { origin: Origin | null; results: Record<string, CategoryResult> }) {
  const values = Object.values(results);
  const done = values.length > 0 && values.every((r) => r.status !== 'loading');
  const found = values.filter((r) => r.status === 'done' && r.ring !== null).length;
  const message = origin && done ? `Found spots within a walk for ${found} of ${values.length} categories.` : '';
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {message}
    </p>
  );
}
