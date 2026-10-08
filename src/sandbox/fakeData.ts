// Deterministic fake data for the design sandbox: no Google calls. The same address and
// category always produce the same spots, so the page looks identical on every reload.
import type { Category } from '../lib/categories';
import type { NearbyPlace } from '../lib/nearby';
import type { CategoryResult } from '../lib/useAnalysis';

/** The fake map's coordinate space (matches the map frame's 860:620 aspect ratio). */
export const VIEW = { width: 860, height: 620, cx: 430, cy: 300 };

export interface FakeSpot extends NearbyPlace {
  /** Position on the fake map, in VIEW units. */
  x: number;
  y: number;
}

export interface FakeAddress {
  id: string;
  label: string;
  address: string;
}

export const FAKE_ADDRESSES: FakeAddress[] = [
  { id: 'mission', label: 'Mission', address: '2000 Mission St, San Francisco, CA 94110, USA' },
  { id: 'haight', label: 'Lower Haight', address: '500 Haight St, San Francisco, CA 94117, USA' },
  { id: 'noe', label: 'Noe Valley', address: '4000 24th St, San Francisco, CA 94114, USA' },
];

const STREETS = ['Valencia', 'Guerrero', 'Dolores', 'Harrison', 'Bryant', 'Folsom', 'Capp', 'Alabama', 'Shotwell', 'Florida'];
const NOUNS: Record<string, string> = {
  grocery: 'Market',
  coffee: 'Coffee',
  drugstore: 'Pharmacy',
  park: 'Park',
  transit: 'Station',
  bus: 'Stop',
  gym: 'Fitness',
  restaurant: 'Kitchen',
  bar: 'Tavern',
  bakery: 'Bakery',
  laundry: 'Laundromat',
};

/** Stable pseudo-random number in [0, 1) for a string. */
function rand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Ring radius on the fake map: the largest active ring fills about 270 units. */
export function ringRadius(minutes: number, largest: number): number {
  return 270 * Math.sqrt(minutes / largest);
}

/** A jagged, street-grid-ish ring outline, in VIEW units. */
export function ringPoints(minutes: number, largest: number): [number, number][] {
  const r = ringRadius(minutes, largest);
  return Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const wobble = 0.82 + 0.3 * rand(`ring${minutes}:${i}`);
    return [VIEW.cx + Math.cos(angle) * r * wobble, VIEW.cy + Math.sin(angle) * r * wobble * 0.92];
  });
}

/** Fake spots for one category near one address, nearest first. */
export function fakeSpots(addressId: string, category: Category, rings: number[]): FakeSpot[] {
  const largest = rings[rings.length - 1] ?? 15;
  const count = 3 + Math.floor(rand(`${addressId}:${category.id}:n`) * 6);
  // About one category in eight has nothing within the rings, to show the "Beyond" state.
  const beyondOnly = rand(`${addressId}:${category.id}:beyond`) < 0.12;
  const noun = NOUNS[category.id] ?? category.label;
  const spots = Array.from({ length: count }, (_, i): FakeSpot => {
    const seed = `${addressId}:${category.id}:${i}`;
    const ringIndex = beyondOnly ? -1 : Math.min(rings.length - 1, Math.floor(rand(`${seed}:ring`) * rings.length * (i === 0 ? 0.6 : 1)));
    const ring = ringIndex >= 0 ? rings[ringIndex]! : null;
    const inner = ringIndex > 0 ? ringRadius(rings[ringIndex - 1]!, largest) : 20;
    const outer = ring ? ringRadius(ring, largest) * 0.8 : ringRadius(largest, largest) * 1.15;
    const dist = ring ? inner + (outer - inner) * rand(`${seed}:d`) : outer;
    const angle = rand(`${seed}:a`) * Math.PI * 2;
    const street = STREETS[Math.floor(rand(`${seed}:s`) * STREETS.length)]!;
    return {
      id: seed,
      name: category.custom ? `${street} ${category.label}` : `${street} ${noun}`,
      position: { lat: 0, lng: 0 },
      ring,
      typeLabel: category.label,
      address: `${100 + Math.floor(rand(`${seed}:no`) * 3800)} ${street} St`,
      accessible: rand(`${seed}:acc`) < 0.4 ? { entrance: true, restroom: rand(`${seed}:wc`) < 0.5 } : undefined,
      x: VIEW.cx + Math.cos(angle) * dist,
      y: VIEW.cy + Math.sin(angle) * dist * 0.92,
    };
  });
  const rank = (r: number | null) => (r === null ? Infinity : rings.indexOf(r));
  return spots.sort((a, b) => rank(a.ring) - rank(b.ring));
}

/** A category's result; `pickId` makes that spot the one that counts, like a user's pick. */
export function fakeResult(spots: FakeSpot[], pickId?: string): CategoryResult {
  const picked = pickId ? spots.find((s) => s.id === pickId) : undefined;
  const nearest = picked ?? spots[0] ?? null;
  return { status: 'done', ring: nearest?.ring ?? null, nearest, within: spots.filter((s) => s.ring !== null), capped: false, picked: !!picked };
}
