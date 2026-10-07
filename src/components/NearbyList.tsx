import type { RingMinutes } from '../../shared/isochrones';
import type { Category } from '../lib/categories';
import type { CategoryResult } from '../lib/nearby';

export function NearbyList({
  categories,
  results,
  shown,
  onToggle,
}: {
  categories: Category[];
  results: Record<string, CategoryResult>;
  shown: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="field">
      <div className="field-head">
        <div className="field-label" id="nearby-label">
          What's nearby
        </div>
        <div className="field-hint">Tap a row to show or hide pins</div>
      </div>
      <div className="nearby-list" role="group" aria-labelledby="nearby-label">
        {categories.map((c) => {
          const result = results[c.id];
          const place = result?.status === 'done' ? result.nearest : null;
          return (
            <button key={c.id} type="button" className="nearby-row" aria-pressed={shown.has(c.id)} onClick={() => onToggle(c.id)}>
              <span className="nearby-avatar" style={{ background: c.color }} aria-hidden="true">
                {c.letter}
              </span>
              <span className="nearby-text">
                <span className="nearby-label">{c.label}</span>
                {place && <span className="nearby-place">{place.name}</span>}
              </span>
              <RingPill result={result} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PILL_CLASS: Record<RingMinutes, string> = { 5: 'ring-5', 10: 'ring-10', 15: 'ring-15' };

function RingPill({ result }: { result: CategoryResult | undefined }) {
  if (!result) return <span className="ring-pill ring-none">—</span>;
  if (result.status === 'loading') return <span className="ring-pill ring-none">…</span>;
  if (result.status === 'error')
    return (
      <span className="ring-pill ring-none" title={result.message}>
        Error
      </span>
    );
  if (result.ring === null) return <span className="ring-pill ring-none">Beyond 15</span>;
  return <span className={`ring-pill ${PILL_CLASS[result.ring]}`}>{result.ring} min</span>;
}
