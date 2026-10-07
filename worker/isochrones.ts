// The only code that talks to Google's Isochrones API (pre-GA Preview).
// Keep it this small so a request/response change, or a swap to another
// provider (OpenRouteService, Valhalla), stays contained here.

import type { ApiError, Ring } from '../shared/isochrones';

const GOOGLE_URL = 'https://isochrones.googleapis.com/v1/isochrones:generate';

export async function fetchWalkingRing(apiKey: string, lat: number, lng: number, minutes: number): Promise<Ring | ApiError> {
  const res = await fetch(GOOGLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({
      location: { latitude: lat, longitude: lng },
      travelMode: 'WALK',
      travelDuration: `${minutes * 60}s`,
      // Google rejects the request (400) without these two, though the reference lists them as optional.
      travelDirection: 'FROM',
      routingPreference: 'TRAFFIC_UNAWARE',
      // Docs recommend high fidelity, no smoothing for point-in-polygon tests (phase 2).
      polygonFidelity: 'HIGH',
      enableSmoothing: false,
    }),
  });

  if (!res.ok) {
    // Log Google's message for debugging; it never contains the key.
    console.error(`Isochrones ${minutes}m failed`, res.status, await res.text());
    // A JSON 404 is the API's "no road within ~100 m"; an HTML 404 means a bad URL.
    const noRoad = res.status === 404 && res.headers.get('content-type')?.includes('json');
    return {
      error: noRoad
        ? 'No walkable street found near that address. Try a more specific address.'
        : `Google Isochrones returned ${res.status}`,
      status: noRoad ? 404 : 502,
    };
  }

  const data = (await res.json()) as { isochrone?: { geoJson?: unknown } };
  if (!data.isochrone?.geoJson) {
    return { error: 'Google Isochrones returned no shape', status: 502 };
  }
  return { minutes, geoJson: data.isochrone.geoJson };
}
