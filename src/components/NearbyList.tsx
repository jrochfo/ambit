import { isDailyLimit } from '../../shared/limits';
import { useState } from 'react';
import { DEFAULT_CATEGORY_IDS, categoryTint, type Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { allEmoji, suggestEmoji } from '../lib/emojiTags';
import { formatMinutes } from '../lib/rings';
import { RingTag } from './RingTag';
import type { CategoryResult } from '../lib/useAnalysis';
import { AddCategory, type AddOption } from './AddCategory';
import { CategoryPicker } from './CategoryPicker';
import { Icon } from './Icon';
import { scrollSectionToTop } from '../lib/categoryView';

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
  hiddenCount,
  onUnhideAll,
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
  hiddenCount: number;
  onUnhideAll: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const enabled = new Set(categories.map((c) => c.id));
  const limited = categories.some((c) => {
    const r = results[c.id];
    return r?.status === 'error' && isDailyLimit(r.message);
  });

  return (
    <>
      <div className="field" data-tour="categories">
        <div className="field-head" onClick={(e) => scrollSectionToTop(e.currentTarget)}>
          <h2 className="field-label" id="nearby-label">
            What's nearby
          </h2>
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
            add={<AddCategory categories={[...catalog, ...customs]} enabled={enabled} onAdd={onAddCategory} />}
            hiddenCount={hiddenCount}
            onUnhideAll={onUnhideAll}
            isDefault={enabled.size === DEFAULT_CATEGORY_IDS.length && DEFAULT_CATEGORY_IDS.every((id) => enabled.has(id))}
          />
        )}
        <div className="field-hint">{categories.length > 0 ? 'Tap a category to see every spot' : 'Choose categories to find spots within a walk.'}</div>
        {limited && (
          <p className="status status-note" role="status">
            <span className="status-error-line">
              <Icon name="info" size={16} />
              Ambit’s had a busy day, so some categories couldn’t load. Searches reset at midnight Pacific.
            </span>
          </p>
        )}
        <div className="nearby-list" role="group" aria-labelledby="nearby-label">
          {categories.map((c) => {
            const result = results[c.id];
            const place = result?.status === 'done' ? result.nearest : null;
            const isFocused = focused === c.id;
            const emoji = pickEmoji(c.emoji);
            const avatarStyle = { background: categoryTint(c.color), borderColor: c.color };
            return (
              <div key={c.id} className="nearby-item">
                <button
                  type="button"
                  className="nearby-row"
                  aria-pressed={isFocused}
                  data-dimmed={focused !== null && !isFocused}
                  data-category-control
                  data-tip={isFocused ? 'Exit category view' : `Show every ${c.label.toLowerCase()} on the map`}
                  onClick={() => onFocus(isFocused ? null : c.id)}
                >
                  <span className="nearby-text">
                    <span className="nearby-label">{c.label}</span>
                    {place && (
                      <span className="nearby-place">
                        {place.name || '…'}
                        {result?.status === 'done' && result.picked && <span className="pick-note"> · your pick</span>}
                        {isFocused && result?.status === 'done' && result.within.length > 1 && (
                          <MoreCount count={result.within.length} capped={result.capped} />
                        )}
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
                    <span className="avatar-emoji">{emoji}</span>
                    <Icon name="edit" size={16} className="avatar-edit" />
                  </button>
                ) : (
                  <span className="nearby-avatar" style={avatarStyle} aria-hidden="true">
                    {emoji}
                  </span>
                )}
                {emojiFor === c.id && (
                  <EmojiPicker
                    category={c}
                    current={emoji}
                    onPick={(e) => {
                      onSetEmoji(c.id, e);
                      setEmojiFor(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** Suggested emoji for the category's name first, then everything else. */
function EmojiPicker({ category, current, onPick }: { category: Category; current: string; onPick: (emoji: string) => void }) {
  const suggested = suggestEmoji(category.label, category.types[0])
    .slice(0, 6)
    .map((s) => s.emoji);
  const more = allEmoji().filter((e) => !suggested.includes(e));
  const choice = (e: string) => (
    <button key={e} type="button" className="emoji-choice" aria-pressed={e === current} onClick={() => onPick(e)}>
      {e}
    </button>
  );
  return (
    <div className="emoji-picker" role="group" aria-label={`Emoji for ${category.label}`}>
      {suggested.length > 0 && (
        <>
          <div className="emoji-section">Suggested</div>
          <div className="emoji-grid">{suggested.map(choice)}</div>
          <div className="emoji-section">More</div>
        </>
      )}
      <div className="emoji-grid emoji-grid-more">{more.map(choice)}</div>
    </div>
  );
}


/** Searches return at most 20 places, so a capped search means there are likely more. */
function MoreCount({ count, capped }: { count: number; capped: boolean }) {
  return <>{` + ${count - 1} more ${count === 2 ? 'spot' : 'spots'}${capped ? ' (not all shown)' : ''}`}</>;
}

function RingPill({ result, rings }: { result: CategoryResult | undefined; rings: number[] }) {
  const largest = rings[rings.length - 1];
  if (!result) return <RingTag value={{ kind: 'none', label: '—' }} rings={rings} />;
  if (result.status === 'loading') return <RingTag value={{ kind: 'loading' }} rings={rings} />;
  if (result.status === 'error')
    return (
      <RingTag value={{ kind: 'error', label: isDailyLimit(result.message) ? 'Paused' : 'Error', message: result.message }} rings={rings} />
    );
  if (result.ring === null) return <RingTag value={{ kind: 'none', label: `Beyond ${largest ? formatMinutes(largest) : ''}` }} rings={rings} />;
  return <RingTag value={{ kind: 'ring', minutes: result.ring }} rings={rings} />;
}
