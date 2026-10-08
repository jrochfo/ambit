import { useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import type { NearbyPlace } from '../lib/nearby';
import { formatMinutes } from '../lib/rings';
import { Icon } from './Icon';
import { MapOverlay, OVERLAY_Z } from './MapOverlay';

const HIDE_DELAY_MS = 150;

/** A spot's standing in its category, and the actions for changing which spot counts. */
export interface PinPick {
  /** 'nearest': counts by default. 'chosen': the user's pick. 'other': another spot in the category. */
  role: 'nearest' | 'chosen' | 'other';
  /** Other spots inside the rings for this category. */
  others: number;
  /** Mark this pin as the one that counts (in a focused category, among its alternatives). */
  emphasize: boolean;
  onChoose: () => void;
  onUseNearest: () => void;
}

interface SpotPinProps {
  category: Category;
  place: NearbyPlace;
  outerRing: number | undefined;
  /** Shown open without hover: picked from the comparison grid. */
  spotlight: boolean;
  pick?: PinPick;
}

/** "Park" → "park", "Bank or ATM" → "bank or ATM": a label used mid-sentence. */
function inSentence(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

/** A spot's pin on the Google map. */
export function CategoryPin(props: SpotPinProps) {
  const [open, setOpen] = useState(false);
  return (
    <MapOverlay position={props.place.position} interactive zIndex={open ? OVERLAY_Z.openPin : OVERLAY_Z.pin}>
      <SpotPin {...props} onOpenChange={setOpen} />
    </MapOverlay>
  );
}

/**
 * Emoji pin for a spot; clicking opens it in Google Maps. Its card shows on hover or keyboard
 * focus (and when picked from the comparison grid). All details come from the search; no extra calls.
 * Rendered by CategoryPin on the real map and by the design sandbox on its fake one.
 */
export function SpotPin({
  category,
  place,
  outerRing,
  spotlight,
  pick,
  onOpenChange,
}: SpotPinProps & { onOpenChange?: (open: boolean) => void }) {
  const cardId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const open = spotlight || hovered || focused;
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);

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
    <div
      className="spot"
      onMouseEnter={enter}
      onMouseLeave={leave}
      // Keyboard focus only: a mouse click also focuses the pin, which shouldn't hold the card open.
      onFocus={(e) => setFocused(e.target.matches(':focus-visible'))}
      onBlur={blur}
    >
      <a
        className={pick?.emphasize ? 'pin pin-pick' : 'pin'}
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
          {pick && <PickLine pick={pick} noun={inSentence(category.label)} />}
          <div className="spot-card-hint">
            <Icon name="openInNew" size={14} />
            Click the pin to open in Google Maps
          </div>
        </div>
      )}
    </div>
  );
}

/** Which spot counts for this category, and how to change it. */
function PickLine({ pick, noun }: { pick: PinPick; noun: string }) {
  if (pick.role === 'other')
    return (
      <button type="button" className="spot-card-action" onClick={pick.onChoose}>
        <Icon name="star" size={16} />
        Make this my {noun} pick
      </button>
    );
  return (
    <div className="spot-card-pick">
      <div className="spot-card-line">
        <Icon name={pick.role === 'chosen' ? 'starFill' : 'star'} size={16} />
        {pick.role === 'chosen' ? `Your ${noun} pick` : `Nearest ${noun} · counts in your comparison`}
      </div>
      {pick.role === 'chosen' && (
        <button type="button" className="spot-card-link-btn" onClick={pick.onUseNearest}>
          Use the nearest instead
        </button>
      )}
      {pick.role === 'nearest' && pick.others > 0 && (
        <div className="spot-card-hint">
          {pick.others} other {pick.others === 1 ? 'option' : 'options'} nearby. Tap the category in the list to choose one.
        </div>
      )}
    </div>
  );
}
