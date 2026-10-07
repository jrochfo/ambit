import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';

/** Checklist of every category; each checked one costs one Nearby Search per address. */
export function CategoryPicker({
  categories,
  enabled,
  onToggle,
  onClear,
}: {
  categories: Category[];
  enabled: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <fieldset className="category-picker" id="category-picker">
      <legend className="sr-only">Categories to look for</legend>
      <div className="category-picker-head">
        <span>{enabled.size} selected</span>
        <button type="button" className="link-btn" onClick={onClear} disabled={enabled.size === 0}>
          Clear all
        </button>
      </div>
      {categories.map((c) => (
        <label key={c.id} className="category-option">
          <input type="checkbox" checked={enabled.has(c.id)} onChange={() => onToggle(c.id)} />
          <span aria-hidden="true">{pickEmoji(c.emoji)}</span>
          <span className="category-option-label">{c.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
