import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import type { NearbyPlace } from '../lib/nearby';
import { formatMinutes } from '../lib/rings';
import { MapOverlay } from './MapOverlay';

/** Emoji pin for a matching place; opens the place in Google Maps. */
export function CategoryPin({ category, place, outerRing }: { category: Category; place: NearbyPlace; outerRing: number | undefined }) {
  const where = place.ring ? `within a ${formatMinutes(place.ring)} walk` : outerRing ? `beyond a ${formatMinutes(outerRing)} walk` : '';
  return (
    <MapOverlay position={place.position} interactive>
      <a
        className="pin"
        style={{ borderColor: category.color }}
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`}
        target="_blank"
        rel="noreferrer"
        title={`${place.name} (${category.label}, ${where})`}
        aria-label={`${place.name}, ${category.label}, ${where}. Opens Google Maps.`}
      >
        <span aria-hidden="true">{pickEmoji(category.emoji)}</span>
      </a>
    </MapOverlay>
  );
}
