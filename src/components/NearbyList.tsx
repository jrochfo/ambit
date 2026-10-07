import { useState } from 'react';
import { DEFAULT_CATEGORY_IDS, type Category } from '../lib/categories';
import { EMOJI_CHOICES, isSupported, pickEmoji } from '../lib/emoji';
import { formatMinutes, pillColors } from '../lib/rings';
import type { CategoryResult } from '../lib/useAnalysis';
import { AddCategory, type AddOption } from './AddCategory';
import { CategoryPicker } from './CategoryPicker';

export function NearbyList({
  catalog,
  customs,
  categories,
  results,
  rings,
  focused,
  onFocus,
  onToggleCategory,
  onClearCategories,
  onResetCategories,
  onAddCategory,
  onRemoveCustom,
  onSetEmoji,
}: {
  catalog: Category[];
  customs: Category[];
  /** Enabled categories, catalog first, then custom. */
  categories: Category[];
  results: Record<string, CategoryResult>;
  /** Active ring sizes, ascending. */
  rings: number[];
  focused: string | null;
  onFocus: (id: string | null) => void;
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
  onResetCategories: () => void;
  onAddCategory: (option: AddOption) => void;
  onRemoveCustom: (id: string) => void;
  onSetEmoji: (id: string, emoji: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const enabled = new Set(categories.map((c) => c.id));
  const limited = categories.some((c) => {
    const r = results[c.id];
    return r?.status === 'error' && r.message.startsWith('Daily search limit');
  });

  return (
    <>
      <div className="field">
        <div className="field-head">
          <div className="field-label" id="nearby-label">
            What's nearby
          </div>
          <button type="button" className="link-btn" aria-expanded={editing} aria-controls="category-picker" onClick={() => setEditing((e) => !e)}>
            {editing ? 'Done' : `Choose (${categories.length})`}
          </button>
        </div>
        {editing && (
          <CategoryPicker
            categories={catalog}
            customs={customs}
            enabled={enabled}
            onToggle={onToggleCategory}
            onClear={onClearCategories}
            onReset={onResetCategories}
            onRemove={onRemoveCustom}
            isDefault={enabled.size === DEFAULT_CATEGORY_IDS.length && DEFAULT_CATEGORY_IDS.every((id) => enabled.has(id))}
          />
        )}
        <div className="field-hint">{categories.length > 0 ? 'Tap a row to see every match' : 'Choose categories to see what’s within a walk.'}</div>
        {limited && (
          <p className="status status-error" role="status">
            Today’s search limit is used up, so some rows couldn’t load. It resets at midnight Pacific time.
          </p>
        )}
        <div className="nearby-list" role="group" aria-labelledby="nearby-label">
          {categories.map((c) => {
            const result = results[c.id];
            const place = result?.status === 'done' ? result.nearest : null;
            const isFocused = focused === c.id;
            const emoji = pickEmoji(c.emoji);
            const avatarStyle = { background: `${c.color}22`, borderColor: c.color };
            return (
              <div key={c.id} className="nearby-item">
                <button
                  type="button"
                  className="nearby-row"
                  aria-pressed={isFocused}
                  data-dimmed={focused !== null && !isFocused}
                  onClick={() => onFocus(isFocused ? null : c.id)}
                >
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
                {/* Sits over the row's left edge; a sibling, since buttons can't nest. */}
                {c.custom ? (
                  <button
                    type="button"
                    className="nearby-avatar nearby-avatar-btn"
                    style={avatarStyle}
                    aria-label={`Change emoji for ${c.label}`}
                    aria-expanded={emojiFor === c.id}
                    onClick={() => setEmojiFor((id) => (id === c.id ? null : c.id))}
                  >
                    {emoji}
                  </button>
                ) : (
                  <span className="nearby-avatar" style={avatarStyle} aria-hidden="true">
                    {emoji}
                  </span>
                )}
                {emojiFor === c.id && (
                  <div className="emoji-grid" role="group" aria-label={`Emoji for ${c.label}`}>
                    {EMOJI_CHOICES.filter(isSupported).map((e) => (
                      <button
                        key={e}
                        type="button"
                        className="emoji-choice"
                        aria-pressed={e === emoji}
                        onClick={() => {
                          onSetEmoji(c.id, e);
                          setEmojiFor(null);
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <AddCategory categories={[...catalog, ...customs]} enabled={enabled} onAdd={onAddCategory} />
    </>
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
        {result.message.startsWith('Daily search limit') ? 'Limit' : 'Error'}
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
