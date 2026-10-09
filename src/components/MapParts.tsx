// Map visuals shared by the real Google map (MapPanel) and the design sandbox's fake map,
// so styling them in one place styles both.
import { categoryTint, type Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { formatMinutes, ringStyle } from '../lib/rings';
import { Icon } from './Icon';
import { Logomark } from './Logomark';

export function OriginMarker({ label }: { label: string }) {
  return (
    <div className="origin">
      <div className="origin-dot" />
      <div className="origin-label">{label}</div>
    </div>
  );
}

export function RingLabel({ minutes }: { minutes: number }) {
  return (
    <div className="map-label" style={{ marginTop: -4 }}>
      {formatMinutes(minutes)}
    </div>
  );
}

/** Shown over the map before an address is entered: introduces Ambit and how to start. */
export function EmptyMapPrompt() {
  return (
    <div className="map-empty">
      <div className="map-intro">
        <div className="map-intro-brand">
          <Logomark size={36} />
          <p className="map-intro-name">Ambit</p>
        </div>
        <p className="map-intro-tagline">What’s within a walk of here?</p>
        <p className="map-intro-text">
          See how far you can walk from any address, and which groceries, coffee shops, transit stops, and other spots fall within 5, 10,
          or 15 minutes. Save a few addresses to compare them side by side.
        </p>
        <p className="map-intro-start">Enter an address to get started.</p>
      </div>
    </div>
  );
}

/** Ring swatches under the map; `minutes` ascending. */
export function MapLegend({ minutes }: { minutes: number[] }) {
  return (
    <div className="legend">
      {minutes.map((m, rank) => (
        <span key={m} className="legend-item">
          <span
            className="legend-swatch"
            style={{ background: `color-mix(in srgb, var(${ringStyle(rank, minutes.length).fillVar}) calc(var(--map-ring-fill) * 100%), var(--map-land))` }}
          />
          {formatMinutes(m)}
          {rank === 0 && ' walk'}
        </span>
      ))}
      <span className="legend-note">Walking reach along real streets</span>
    </div>
  );
}

/**
 * Shown over the top of the map in category view: which category, what the view means, and a
 * clear way out (also Escape, or a click anywhere outside the map).
 */
export function CategoryBanner({
  category,
  count,
  outerRing,
  onExit,
}: {
  category: Category;
  /** Spots shown, or null while they load. */
  count: number | null;
  outerRing: number | undefined;
  onExit: () => void;
}) {
  const reach = outerRing ? ` within a ${formatMinutes(outerRing)} walk` : '';
  return (
    <div className="category-banner" role="region" aria-label="Category view">
      <span className="category-avatar" style={{ background: categoryTint(category.color), borderColor: category.color }} aria-hidden="true">
        {pickEmoji(category.emoji)}
      </span>
      <div className="category-banner-text">
        <span className="category-banner-eyebrow">Category view</span>
        <strong>
          {category.label}
          {count === null ? '' : `: ${count} ${count === 1 ? 'spot' : 'spots'}${reach}`}
        </strong>
        <span className="category-banner-help">The starred spot counts in your comparison. Choose a different one from its card.</span>
      </div>
      <button type="button" className="category-banner-exit" onClick={onExit} aria-label="Exit category view" data-tip="Exit category view (Esc)">
        <Icon name="close" size={18} />
        Exit
      </button>
    </div>
  );
}
