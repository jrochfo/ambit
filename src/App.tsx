import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { DEFAULT_RINGS, MAX_RINGS, isValidRing } from '../shared/isochrones';
import { Header } from './components/Header';
import { AddressSearch, type SearchTarget } from './components/AddressSearch';
import { RingPicker } from './components/RingPicker';
import { MapPanel, type Origin, type Pin } from './components/MapPanel';
import { NearbyList } from './components/NearbyList';
import { CATEGORIES, DEFAULT_CATEGORY_IDS, isCustomCategoryList, makeCustomCategory, type Category } from './lib/categories';
import type { AddOption } from './components/AddCategory';
import { strongEmojiMatch } from './lib/emojiTags';
import { loadPref, savePref } from './lib/storage';
import { useAnalysis } from './lib/useAnalysis';

const BROWSER_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

type Status = { kind: 'idle' } | { kind: 'busy'; message: string } | { kind: 'done'; address: string } | { kind: 'error'; message: string };

export default function App() {
  if (!BROWSER_KEY) {
    return (
      <div className="app">
        <Header />
        <p className="status status-error">Missing VITE_GOOGLE_MAPS_BROWSER_KEY in .env.</p>
      </div>
    );
  }
  return (
    <APIProvider apiKey={BROWSER_KEY}>
      <Ambit />
    </APIProvider>
  );
}

const isNumberList = (v: unknown): v is number[] => Array.isArray(v) && v.length > 0 && v.every(isValidRing);
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

function Ambit() {
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
  const lookup = useRef(0);

  useEffect(() => savePref('rings', ringMinutes), [ringMinutes]);
  useEffect(() => savePref('categories', [...categoryIds]), [categoryIds]);
  useEffect(() => savePref('customCategories', customs), [customs]);

  const categories = useMemo(() => [...CATEGORIES, ...customs].filter((c) => categoryIds.has(c.id)), [categoryIds, customs]);
  const position = origin?.position ?? null;
  const analysis = useAnalysis(places, position, ringMinutes, categories);
  const { retry } = analysis;

  const mapAddress = useCallback(
    async (target: SearchTarget) => {
      if (!geocoding) return;
      const id = ++lookup.current;
      try {
        setStatus({ kind: 'busy', message: 'Finding that address…' });
        const found = target.kind === 'prediction' ? await resolvePrediction(target.prediction) : await geocode(geocoding, target.text);
        if (id !== lookup.current) return;
        retry();
        setFocused(null);
        setOrigin({ position: found.position, label: found.address.split(',')[0] ?? found.address });
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
    [geocoding, retry],
  );

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
  const pins: Pin[] = categories.flatMap((category) => {
    const r = analysis.results[category.id];
    if (r?.status !== 'done' || !r.nearest) return [];
    if (focused === null) return [{ category, place: r.nearest }];
    if (focused !== category.id) return [];
    return (r.within.length ? r.within : [r.nearest]).map((place) => ({ category, place }));
  });

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
      <Header />
      <main className="main">
        <aside className="card sidebar">
          <div className="sidebar-head">
            <AddressSearch busy={status.kind === 'busy' || !geocoding || !places} onSearch={mapAddress} />
          </div>
          {/* Scrolls inside the card when side by side with the map, so the sidebar never outgrows it. */}
          <div className="sidebar-scroll">
            <RingPicker rings={ringMinutes} hidden={hiddenRings} onToggle={toggleRing} onAdd={addRing} onRemove={removeRing} />
            <StatusLine status={shownStatus} />
            <NearbyList
              catalog={CATEGORIES}
              customs={customs}
              categories={categories}
              results={analysis.results}
              rings={analysis.rings.map((r) => r.minutes)}
              focused={focused}
              onFocus={setFocused}
              onToggleCategory={toggleCategory}
              onClearCategories={clearCategories}
              onResetCategories={resetCategories}
              onAddCategory={addCategory}
              onRemoveCustom={removeCustom}
              onSetEmoji={setCustomEmoji}
            />
          </div>
        </aside>
        <MapPanel origin={origin} rings={analysis.rings} hidden={hiddenRings} pins={pins} />
      </main>
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
}

/** Picking a suggestion: one Place lookup (location + address only) that also closes the autocomplete session. */
async function resolvePrediction(prediction: google.maps.places.PlacePrediction): Promise<FoundAddress> {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ['location', 'formattedAddress'] });
  if (!place.location) throw new Error('Couldn’t find that address.');
  return { position: place.location.toJSON(), address: place.formattedAddress ?? prediction.text.text };
}

/** Typed text with no suggestions to pick from: fall back to the Geocoding API. */
async function geocode(lib: google.maps.GeocodingLibrary, address: string): Promise<FoundAddress> {
  const { results } = await new lib.Geocoder().geocode({ address });
  const top = results[0];
  if (!top) throw new Error('Couldn’t find that address.');
  return { position: top.geometry.location.toJSON(), address: top.formatted_address };
}

function StatusLine({ status }: { status: Status }) {
  return (
    <p className={`status${status.kind === 'error' ? ' status-error' : ''}`} role="status" aria-live="polite">
      {status.kind === 'busy' && status.message}
      {status.kind === 'error' && status.message}
      {status.kind === 'done' && (
        <>
          Walking from <strong>{status.address}</strong>
        </>
      )}
    </p>
  );
}
