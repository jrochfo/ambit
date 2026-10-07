import { useCallback, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { RING_MINUTES, type Ring, type RingMinutes } from '../shared/isochrones';
import { fetchIsochrones } from './lib/api';
import { Header } from './components/Header';
import { AddressSearch, type SearchTarget } from './components/AddressSearch';
import { WalkingTimePills } from './components/WalkingTimePills';
import { MapPanel, type Origin } from './components/MapPanel';
import { NearbyList } from './components/NearbyList';
import { PRESET_CATEGORIES } from './lib/categories';
import { searchCategory, type CategoryResult } from './lib/nearby';

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

// Session-only cache so re-mapping an address doesn't repeat billed calls.
// In memory only: Google's terms limit storing Places data.
interface Analysis {
  rings: Ring[];
  results: Record<string, CategoryResult>;
}
const cacheKey = (p: google.maps.LatLngLiteral) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

function Ambit() {
  const geocoding = useMapsLibrary('geocoding');
  const places = useMapsLibrary('places');
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [rings, setRings] = useState<Ring[]>([]);
  const [results, setResults] = useState<Record<string, CategoryResult>>({});
  const [visible, setVisible] = useState<ReadonlySet<RingMinutes>>(() => new Set(RING_MINUTES));
  const [shownPins, setShownPins] = useState<ReadonlySet<string>>(() => new Set(PRESET_CATEGORIES.map((c) => c.id)));
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inflight = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, Analysis>());

  const mapAddress = useCallback(
    async (target: SearchTarget) => {
      if (!geocoding || !places) return;
      inflight.current?.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;

      try {
        setStatus({ kind: 'busy', message: 'Finding that address…' });
        const found = target.kind === 'prediction' ? await resolvePrediction(target.prediction) : await geocode(geocoding, target.text);
        if (ctrl.signal.aborted) return;

        setOrigin({ position: found.position, label: found.address.split(',')[0] ?? found.address });
        const key = cacheKey(found.position);
        const cached = cache.current.get(key);
        if (cached) {
          setRings(cached.rings);
          setResults(cached.results);
          setStatus({ kind: 'done', address: found.address });
          return;
        }
        setRings([]);
        setResults({});

        setStatus({ kind: 'busy', message: 'Drawing walking rings…' });
        const { rings } = await fetchIsochrones(found.position.lat, found.position.lng, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setRings(rings);
        setStatus({ kind: 'done', address: found.address });

        // One Nearby Search per category, in parallel; rows fill in as each returns.
        const analysis: Analysis = { rings, results: {} };
        setResults(Object.fromEntries(PRESET_CATEGORIES.map((c) => [c.id, { status: 'loading' }])));
        await Promise.all(
          PRESET_CATEGORIES.map(async (c) => {
            let result: CategoryResult;
            try {
              result = await searchCategory(places, found.position, rings, c);
            } catch (err) {
              console.error(`Nearby search failed for ${c.label}`, err);
              result = { status: 'error', message: err instanceof Error ? err.message : 'Search failed' };
            }
            analysis.results[c.id] = result;
            if (!ctrl.signal.aborted) setResults((prev) => ({ ...prev, [c.id]: result }));
          }),
        );
        // Only complete, error-free analyses are reused.
        if (Object.values(analysis.results).every((r) => r.status === 'done')) cache.current.set(key, analysis);
      } catch (err) {
        if (ctrl.signal.aborted) return;
        const message =
          err instanceof Error && 'code' in err && err.code === 'ZERO_RESULTS'
            ? 'Couldn’t find that address.'
            : err instanceof Error
              ? err.message
              : 'Something went wrong.';
        setStatus({ kind: 'error', message });
      }
    },
    [geocoding, places],
  );

  const toggleRing = useCallback((m: RingMinutes) => setVisible((prev) => toggled(prev, m)), []);
  const togglePins = useCallback((id: string) => setShownPins((prev) => toggled(prev, id)), []);

  const pins = PRESET_CATEGORIES.flatMap((category) => {
    const r = results[category.id];
    return shownPins.has(category.id) && r?.status === 'done' && r.nearest ? [{ category, place: r.nearest }] : [];
  });

  return (
    <div className="app">
      <Header />
      <main className="main">
        <aside className="card sidebar">
          <AddressSearch busy={status.kind === 'busy' || !geocoding || !places} onSearch={mapAddress} />
          <WalkingTimePills visible={visible} onToggle={toggleRing} />
          <StatusLine status={status} />
          <NearbyList categories={PRESET_CATEGORIES} results={results} shown={shownPins} onToggle={togglePins} />
        </aside>
        <MapPanel origin={origin} rings={rings} visible={visible} pins={pins} />
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
