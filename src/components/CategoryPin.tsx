import type { Category } from '../lib/categories';
import type { NearbyPlace } from '../lib/nearby';
import { MapOverlay } from './MapOverlay';

/** Lettered pin for a category's nearest match; opens the place in Google Maps. */
export function CategoryPin({ category, place }: { category: Category; place: NearbyPlace }) {
  const where = place.ring ? `${place.ring} min walk` : 'beyond a 15 min walk';
  return (
    <MapOverlay position={place.position} interactive>
      <a
        className="pin"
        style={{ background: category.color }}
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`}
        target="_blank"
        rel="noreferrer"
        title={`${place.name} (${category.label}, ${where})`}
        aria-label={`${place.name}, ${category.label}, ${where}. Opens Google Maps.`}
      >
        {category.letter}
      </a>
    </MapOverlay>
  );
}
