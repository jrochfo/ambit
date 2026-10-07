import { useCallback, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { RING_MINUTES, type Ring, type RingMinutes } from '../shared/isochrones';
import { fetchIsochrones } from './lib/api';
import { Header } from './components/Header';
import { AddressSearch, type SearchTarget } from './components/AddressSearch';
import { WalkingTimePills } from './components/WalkingTimePills';
import { MapPanel, type Origin } from './components/MapPanel';

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

function Ambit() {
  const geocoding = useMapsLibrary('geocoding');
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [rings, setRings] = useState<Ring[]>([]);
  const [visible, setVisible] = useState<ReadonlySet<RingMinutes>>(() => new Set(RING_MINUTES));
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inflight = useRef<AbortController | null>(null);

  const mapAddress = useCallback(
    async (target: SearchTarget) => {
      if (!geocoding) return;
      inflight.current?.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;

      try {
        setStatus({ kind: 'busy', message: 'Finding that address…' });
        const found = target.kind === 'prediction' ? await resolvePrediction(target.prediction) : await geocode(geocoding, target.text);
        if (ctrl.signal.aborted) return;

        setOrigin({ position: found.position, label: found.address.split(',')[0] ?? found.address });
        setRings([]);

        setStatus({ kind: 'busy', message: 'Drawing walking rings…' });
        const { rings } = await fetchIsochrones(found.position.lat, found.position.lng, ctrl.signal);
        setRings(rings);
        setStatus({ kind: 'done', address: found.address });
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
    [geocoding],
  );

  const toggle = useCallback((m: RingMinutes) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="main">
        <aside className="card sidebar">
          <AddressSearch busy={status.kind === 'busy' || !geocoding} onSearch={mapAddress} />
          <WalkingTimePills visible={visible} onToggle={toggle} />
          <StatusLine status={status} />
        </aside>
        <MapPanel origin={origin} rings={rings} visible={visible} />
      </main>
    </div>
  );
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
