import { MAX_RINGS, isValidRing, type IsochroneRequest, type IsochroneResponse, type Ring } from '../shared/isochrones';
import { fetchWalkingRing } from './isochrones';

interface Env {
  GOOGLE_ISOCHRONES_SERVER_KEY: string;
  /** Per-visitor rate limit (wrangler.jsonc): 20 requests a minute. */
  ISOCHRONE_LIMIT?: RateLimit;
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
  const visitor = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (env.ISOCHRONE_LIMIT && !(await env.ISOCHRONE_LIMIT.limit({ key: visitor })).success) {
    return json({ error: 'Too many walking ring requests. Wait a minute and try again.' }, 429);
  }

  let body: Partial<IsochroneRequest>;
  try {
    body = (await request.json()) as Partial<IsochroneRequest>;
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }
  const { lat, lng, minutes } = body;
  if (!isFiniteInRange(lat, -90, 90) || !isFiniteInRange(lng, -180, 180)) {
    return json({ error: 'lat and lng must be valid coordinates' }, 400);
  }
  // Bounded so one request can't fan out into many billed calls.
  const rings = [...new Set(Array.isArray(minutes) ? minutes : [])];
  if (rings.length === 0 || rings.length > MAX_RINGS || !rings.every(isValidRing)) {
    return json({ error: `minutes must be 1 to ${MAX_RINGS} whole numbers between 1 and 120` }, 400);
  }

  // Google returns one isochrone per request, so fetch the rings in parallel.
  const results = await Promise.all(rings.map((m) => fetchWalkingRing(env.GOOGLE_ISOCHRONES_SERVER_KEY, lat, lng, m)));

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
