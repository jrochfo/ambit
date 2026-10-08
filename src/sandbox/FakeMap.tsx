import { useState, type ReactNode } from 'react';
import type { Category } from '../lib/categories';
import { ringStyle } from '../lib/rings';
import { SpotPin, type PinPick } from '../components/CategoryPin';
import { EmptyMapPrompt, MapLegend, OriginMarker, RingLabel } from '../components/MapParts';
import { OVERLAY_Z } from '../components/MapOverlay';
import { ringPoints, VIEW, type FakeSpot } from './fakeData';

/**
 * Stand-in for MapPanel: same card, frame, legend, pins, labels and origin, drawn over a
 * plain SVG instead of Google Maps. The basemap's own colors live in src/lib/mapStyle.ts.
 */
export function FakeMap({
  originLabel,
  rings,
  hidden,
  pins,
  spotlight,
  onMapClick,
}: {
  originLabel: string | null;
  rings: number[];
  hidden: ReadonlySet<number>;
  pins: { category: Category; spot: FakeSpot; pick?: PinPick }[];
  spotlight: string | null;
  onMapClick: () => void;
}) {
  const largest = rings[rings.length - 1] ?? 15;
  const shown = originLabel ? rings.filter((m) => !hidden.has(m)) : [];

  return (
    <section className="card map-panel" aria-label="Walking rings map">
      <div className="map-frame" onClick={onMapClick}>
        <svg className="fake-basemap" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="fake-blocks" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(-9)">
              <path d="M56 0H0V56" fill="none" style={{ stroke: 'var(--map-road)' }} strokeWidth="3" />
            </pattern>
          </defs>
          <rect width={VIEW.width} height={VIEW.height} style={{ fill: 'var(--map-land)' }} />
          <rect width={VIEW.width} height={VIEW.height} fill="url(#fake-blocks)" />
          <path d="M0 520 C120 500 180 580 260 620 L0 620 Z" style={{ fill: 'var(--map-water)' }} />
          <rect x="610" y="430" width="140" height="90" rx="10" style={{ fill: 'var(--map-park)' }} />
          <rect x="110" y="120" width="110" height="80" rx="10" style={{ fill: 'var(--map-park)' }} />
          <path d="M0 420 L860 250" style={{ stroke: 'var(--map-highway)' }} strokeWidth="6" fill="none" />
          <path d="M300 0 L520 620" style={{ stroke: 'var(--map-highway)' }} strokeWidth="6" fill="none" />
          {[...shown].reverse().map((m) => {
            const style = ringStyle(rings.indexOf(m), rings.length);
            const d = `M${ringPoints(m, largest).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;
            return <path key={m} className="fake-ring" d={d} style={{ fill: 'var(--data)', stroke: 'var(--data)' }} fillOpacity={style.fill} strokeOpacity={style.stroke} strokeWidth="2" />;
          })}
        </svg>
        <div className="fake-overlays">
          {shown.map((m) => {
            const [x, y] = ringPoints(m, largest).reduce((top, p) => (p[1] < top[1] ? p : top));
            return (
              <At key={m} x={x} y={y} z={OVERLAY_Z.ringLabel}>
                <RingLabel minutes={m} />
              </At>
            );
          })}
          {pins.map(({ category, spot, pick }) => (
            <FakePin
              key={`${category.id}:${spot.id}`}
              category={category}
              spot={spot}
              pick={pick}
              outerRing={largest}
              spotlight={spotlight === `${category.id}:${spot.id}`}
            />
          ))}
          {originLabel && (
            <At x={VIEW.cx} y={VIEW.cy} z={OVERLAY_Z.origin}>
              <OriginMarker label={originLabel} />
            </At>
          )}
        </div>
        {!originLabel && <EmptyMapPrompt />}
      </div>
      <MapLegend minutes={originLabel ? rings : []} />
    </section>
  );
}

function FakePin({
  category,
  spot,
  pick,
  outerRing,
  spotlight,
}: {
  category: Category;
  spot: FakeSpot;
  pick?: PinPick;
  outerRing: number;
  spotlight: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <At x={spot.x} y={spot.y} z={open ? OVERLAY_Z.openPin : OVERLAY_Z.pin}>
      <SpotPin category={category} place={spot} pick={pick} outerRing={outerRing} spotlight={spotlight} onOpenChange={setOpen} />
    </At>
  );
}

/** Positions an overlay like MapOverlay does, including the edge flags spot cards use. */
function At({ x, y, z, children }: { x: number; y: number; z: number; children: ReactNode }) {
  return (
    <div
      style={{ position: 'absolute', left: `${(x / VIEW.width) * 100}%`, top: `${(y / VIEW.height) * 100}%`, zIndex: z }}
      data-edge-top={y < 160}
      data-edge-left={x < 140}
      data-edge-right={x > VIEW.width - 140}
    >
      {children}
    </div>
  );
}
