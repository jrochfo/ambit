import { useState } from 'react';
import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { formatMinutes, pillColors } from '../lib/rings';
import type { CategoryResult } from '../lib/useAnalysis';
import { CategoryPicker } from './CategoryPicker';

export function NearbyList({
  catalog,
  categories,
  results,
  rings,
  focused,
  onFocus,
  onToggleCategory,
}: {
  catalog: Category[];
  /** Enabled categories, in catalog order. */
  categories: Category[];
  results: Record<string, CategoryResult>;
  /** Active ring sizes, ascending. */
  rings: number[];
  focused: string | null;
  onFocus: (id: string | null) => void;
  onToggleCategory: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const enabled = new Set(categories.map((c) => c.id));

  return (
    <div className="field">
      <div className="field-head">
        <div className="field-label" id="nearby-label">
          What's nearby
        </div>
        <button type="button" className="link-btn" aria-expanded={editing} aria-controls="category-picker" onClick={() => setEditing((e) => !e)}>
          {editing ? 'Done' : `Choose (${categories.length})`}
        </button>
      </div>
      {editing && <CategoryPicker categories={catalog} enabled={enabled} onToggle={onToggleCategory} />}
      {categories.length > 0 && <div className="field-hint">Tap a row to see every match</div>}
      <div className="nearby-list" role="group" aria-labelledby="nearby-label">
        {categories.map((c) => {
          const result = results[c.id];
          const place = result?.status === 'done' ? result.nearest : null;
          const isFocused = focused === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className="nearby-row"
              aria-pressed={isFocused}
              data-dimmed={focused !== null && !isFocused}
              onClick={() => onFocus(isFocused ? null : c.id)}
            >
              <span className="nearby-avatar" style={{ background: `${c.color}22`, borderColor: c.color }} aria-hidden="true">
                {pickEmoji(c.emoji)}
              </span>
              <span className="nearby-text">
                <span className="nearby-label">{c.label}</span>
                {place && (
                  <span className="nearby-place">
                    {place.name}
                    {isFocused && result?.status === 'done' && result.within.length > 1 && <MoreCount count={result.within.length} />}
                  </span>
                )}
              </span>
              <RingPill result={result} rings={rings} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Nearby Search returns at most 20 places, so a full page means "at least this many". */
function MoreCount({ count }: { count: number }) {
  return <>{count >= 20 ? ` + ${count - 1} more (nearest 20 shown)` : ` + ${count - 1} more`}</>;
}

function RingPill({ result, rings }: { result: CategoryResult | undefined; rings: number[] }) {
  if (!result) return <span className="ring-pill ring-none">—</span>;
  if (result.status === 'loading') return <span className="ring-pill ring-none">…</span>;
  if (result.status === 'error')
    return (
      <span className="ring-pill ring-none" title={result.message}>
        Error
      </span>
    );
  const largest = rings[rings.length - 1];
  if (result.ring === null) return <span className="ring-pill ring-none">Beyond {largest ? formatMinutes(largest) : ''}</span>;
  const { bg, fg } = pillColors(rings.indexOf(result.ring));
  return (
    <span className="ring-pill" style={{ background: bg, color: fg }}>
      {formatMinutes(result.ring)}
    </span>
  );
}
