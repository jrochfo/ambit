import type { ApiError, IsochroneResponse } from '../../shared/isochrones';

export async function fetchIsochrones(lat: number, lng: number, signal?: AbortSignal): Promise<IsochroneResponse> {
  const res = await fetch('/api/isochrones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
    signal,
  });
  const body = (await res.json().catch(() => null)) as IsochroneResponse | ApiError | null;
  if (!res.ok || !body || 'error' in body) {
    throw new Error(body && 'error' in body ? body.error : `Walking rings request failed (${res.status})`);
  }
  return body;
}
