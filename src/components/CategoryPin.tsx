import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import type { NearbyPlace } from '../lib/nearby';
import { formatMinutes } from '../lib/rings';
import { Icon } from './Icon';
import { MapOverlay, OVERLAY_Z } from './MapOverlay';

const HIDE_DELAY_MS = 150;
/** Matches the .spot-card fade-out in styles.css. */
const FADE_OUT_MS = 120;

/** A spot's standing in its category, and the actions for changing which spot counts. */
export interface PinPick {
  /**
   * 'nearest': counts by default. 'chosen': the user's pick. 'other': another spot in the
   * category. 'hidden': hidden by the user; shown faintly, not counted.
   */
  role: 'nearest' | 'chosen' | 'other' | 'hidden';
  /** Other spots inside the rings for this category. */
  others: number;
  /** Mark this pin as the one that counts (in a focused category, among its alternatives). */
  emphasize: boolean;
  onChoose: () => void;
  onUseNearest: () => void;
  /** Leave this spot out everywhere (junk listings, places that don't matter to you). */
  onHide: () => void;
  onUnhide: () => void;
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
  // Escape closes the card until the pointer or focus leaves the spot.
  const [dismissed, setDismissed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pinRef = useRef<HTMLAnchorElement>(null);
  const open = !dismissed && (spotlight || hovered || focused);
  // The card stays mounted briefly after closing so it can fade out.
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) return setMounted(true);
    const t = setTimeout(() => setMounted(false), FADE_OUT_MS);
    return () => clearTimeout(t);
  }, [open]);
  const shown = open || mounted;
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  useEffect(() => onOpenChange?.(shown), [shown, onOpenChange]);

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
    hideTimer.current = setTimeout(() => {
      setHovered(false);
      setDismissed(false);
    }, HIDE_DELAY_MS);
  };
  const blur = (e: FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setFocused(false);
      setDismissed(false);
    }
  };
  const keyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !open) return;
    e.stopPropagation();
    setDismissed(true);
    pinRef.current?.focus();
  };

  return (
    <div
      className="spot"
      onMouseEnter={enter}
      onMouseLeave={leave}
      // Keyboard focus only: a mouse click also focuses the pin, which shouldn't hold the card open.
      onFocus={(e) => setFocused(e.target.matches(':focus-visible'))}
      onBlur={blur}
      onKeyDown={keyDown}
    >
      <a
        ref={pinRef}
        className={pick?.role === 'hidden' ? 'pin pin-hidden' : pick?.emphasize ? 'pin pin-pick' : 'pin'}
        style={{ borderColor: category.color }}
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`${place.name}, ${category.label}. ${where}. Opens Google Maps.`}
        aria-describedby={open ? cardId : undefined}
      >
        <span aria-hidden="true">{pickEmoji(category.emoji)}</span>
      </a>
      {shown && (
        // An interactive popover (it holds actions), so a labelled group rather than a tooltip;
        // the pin is described by the card's facts only.
        <div className={open ? 'spot-card' : 'spot-card spot-card-out'} role="group" aria-label={place.name}>
          <div className="spot-card-facts" id={cardId}>
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
          </div>
          {pick && <PickLine pick={pick} noun={inSentence(category.label)} />}
          <div className="spot-card-foot">
            <a className="spot-card-foot-link" href={mapsUrl} target="_blank" rel="noreferrer">
              <Icon name="openInNew" size={16} />
              Open in Google Maps
            </a>
            {pick && pick.role !== 'hidden' && (
              <button type="button" className="spot-card-foot-link" onClick={pick.onHide}>
                <Icon name="visibilityOff" size={16} />
                Hide
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Which spot counts for this category, and how to change it. Facts are plain lines; the one
 * decision a card can offer (choose this spot, unhide it) is a chip; undoing a pick is a text
 * link on the line it changes.
 */
function PickLine({ pick, noun }: { pick: PinPick; noun: string }) {
  if (pick.role === 'hidden')
    return (
      <>
        <div className="spot-card-line">
          <Icon name="visibilityOff" size={16} />
          Hidden, so it doesn’t count
        </div>
        <button type="button" className="chip spot-card-chip" onClick={pick.onUnhide}>
          <Icon name="visibility" size={16} />
          Unhide
        </button>
      </>
    );
  if (pick.role === 'other')
    return (
      <button type="button" className="chip spot-card-chip" onClick={pick.onChoose}>
        <Icon name="star" size={16} />
        Make this my {noun} pick
      </button>
    );
  if (pick.role === 'chosen')
    return (
      <div className="spot-card-line">
        <Icon name="starFill" size={16} />
        <span>
          Your {noun} pick ·{' '}
          <button type="button" className="spot-card-inline-link" onClick={pick.onUseNearest}>
            Use nearest
          </button>
        </span>
      </div>
    );
  return (
    <>
      <div className="spot-card-line">
        <Icon name="star" size={16} />
        Nearest {noun} · counts in your comparison
      </div>
      {pick.others > 0 && (
        <div className="spot-card-hint">
          {pick.others} {pick.others === 1 ? 'other' : 'others'} nearby · pick one from the list
        </div>
      )}
    </>
  );
}
