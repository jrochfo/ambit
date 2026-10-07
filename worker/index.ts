import { RING_MINUTES, type IsochroneResponse, type Ring } from '../shared/isochrones';
import { fetchWalkingRing } from './isochrones';

interface Env {
  GOOGLE_ISOCHRONES_SERVER_KEY: string;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/isochrones') {
      if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
      return handleIsochrones(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;

async function handleIsochrones(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_ISOCHRONES_SERVER_KEY) {
    return json({ error: 'Server key is not configured' }, 500);
  }

  let lat: number, lng: number;
  try {
    ({ lat, lng } = (await request.json()) as { lat: number; lng: number });
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }
  if (!isFiniteInRange(lat, -90, 90) || !isFiniteInRange(lng, -180, 180)) {
    return json({ error: 'lat and lng must be valid coordinates' }, 400);
  }

  // Google returns one isochrone per request, so fetch the three rings in parallel.
  // The ring set is fixed server-side so the proxy can't be used for arbitrary calls.
  const results = await Promise.all(RING_MINUTES.map((m) => fetchWalkingRing(env.GOOGLE_ISOCHRONES_SERVER_KEY, lat, lng, m)));

  const failed = results.find((r) => 'error' in r);
  if (failed && 'error' in failed) {
    return json(failed, failed.status === 404 ? 404 : 502);
  }

  return json({ rings: results as Ring[] } satisfies IsochroneResponse);
}

function isFiniteInRange(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
