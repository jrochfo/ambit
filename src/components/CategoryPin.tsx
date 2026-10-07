import { useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import type { NearbyPlace } from '../lib/nearby';
import { formatMinutes } from '../lib/rings';
import { Icon } from './Icon';
import { MapOverlay } from './MapOverlay';

const HIDE_DELAY_MS = 150;

/**
 * Emoji pin for a spot. Its card opens on hover or keyboard focus, and stays open when
 * clicked or tapped (touch has no hover). All details come from the search; no extra calls.
 */
export function CategoryPin({
  category,
  place,
  outerRing,
  pinned,
  onTogglePinned,
}: {
  category: Category;
  place: NearbyPlace;
  outerRing: number | undefined;
  /** Held open by a click or tap. */
  pinned: boolean;
  onTogglePinned: (open: boolean) => void;
}) {
  const cardId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const open = pinned || hovered || focused;
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const where = place.ring ? `Within a ${formatMinutes(place.ring)} walk` : outerRing ? `Beyond a ${formatMinutes(outerRing)} walk` : '';
  const access = place.accessible
    ? (['entrance', 'restroom', 'parking'] as const).filter((k) => place.accessible?.[k])
    : [];
  const mapsUrl =
    place.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`;

  // Moving from the pin into the card crosses a small gap; a short delay keeps the card open.
  const enter = () => {
    clearTimeout(hideTimer.current);
    setHovered(true);
  };
  const leave = () => {
    hideTimer.current = setTimeout(() => setHovered(false), HIDE_DELAY_MS);
  };
  const blur = (e: FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <MapOverlay position={place.position} interactive zIndex={open ? 2 : 1}>
      <div
        className="spot"
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={() => setFocused(true)}
        onBlur={blur}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            setHovered(false);
            onTogglePinned(false);
            (e.currentTarget.querySelector('.pin') as HTMLElement | null)?.focus();
            setFocused(false);
          }
        }}
      >
        <button
          type="button"
          className="pin"
          style={{ borderColor: category.color }}
          aria-label={`${place.name}, ${category.label}. ${where}.`}
          aria-expanded={open}
          aria-controls={open ? cardId : undefined}
          onClick={() => onTogglePinned(!pinned)}
        >
          <span aria-hidden="true">{pickEmoji(category.emoji)}</span>
        </button>
        {open && (
          <div className="spot-card" id={cardId} role="group" aria-label={place.name}>
            <div className="spot-card-name">{place.name}</div>
            <div className="spot-card-meta">{[place.typeLabel ?? category.label, place.address].filter(Boolean).join(' · ')}</div>
            {where && (
              <div className="spot-card-line">
                <Icon name="directionsWalk" size={16} />
                {where}
              </div>
            )}
            {access.length > 0 && (
              <div className="spot-card-line">
                <Icon name="accessible" size={16} />
                Wheelchair-accessible {access.join(', ')}
              </div>
            )}
            <a className="spot-card-link" href={mapsUrl} target="_blank" rel="noreferrer">
              Open in Google Maps
              <Icon name="openInNew" size={14} />
            </a>
          </div>
        )}
      </div>
    </MapOverlay>
  );
}
