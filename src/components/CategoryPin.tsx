import { useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import type { NearbyPlace } from '../lib/nearby';
import { formatMinutes } from '../lib/rings';
import { Icon } from './Icon';
import { MapOverlay, OVERLAY_Z } from './MapOverlay';

const HIDE_DELAY_MS = 150;

/**
 * Emoji pin for a spot; clicking opens it in Google Maps. Its card shows on hover or keyboard
 * focus (and when picked from the comparison grid). All details come from the search; no extra calls.
 */
export function CategoryPin({
  category,
  place,
  outerRing,
  spotlight,
}: {
  category: Category;
  place: NearbyPlace;
  outerRing: number | undefined;
  /** Shown open without hover: picked from the comparison grid. */
  spotlight: boolean;
}) {
  const cardId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const open = spotlight || hovered || focused;
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const where = place.ring ? `Within a ${formatMinutes(place.ring)} walk` : outerRing ? `Beyond a ${formatMinutes(outerRing)} walk` : '';
  const access = (['entrance', 'restroom', 'parking'] as const).filter((k) => place.accessible?.[k]);
  const mapsUrl =
    place.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`;

  // Moving from the pin to the card crosses a small gap; a short delay keeps the card open.
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
    <MapOverlay position={place.position} interactive zIndex={open ? OVERLAY_Z.openPin : OVERLAY_Z.pin}>
      <div
        className="spot"
        onMouseEnter={enter}
        onMouseLeave={leave}
        // Keyboard focus only: a mouse click also focuses the pin, which shouldn't hold the card open.
        onFocus={(e) => setFocused(e.target.matches(':focus-visible'))}
        onBlur={blur}
      >
        <a
          className="pin"
          style={{ borderColor: category.color }}
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`${place.name}, ${category.label}. ${where}. Opens Google Maps.`}
          aria-describedby={open ? cardId : undefined}
        >
          <span aria-hidden="true">{pickEmoji(category.emoji)}</span>
        </a>
        {open && (
          <div className="spot-card" id={cardId} role="tooltip">
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
            <div className="spot-card-hint">
              <Icon name="openInNew" size={14} />
              Click the pin to open in Google Maps
            </div>
          </div>
        )}
      </div>
    </MapOverlay>
  );
}
