import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { Icon } from './Icon';

/** Checklist of every category; each checked one costs one search per address. */
export function CategoryPicker({
  categories,
  customs,
  enabled,
  onToggle,
  onClear,
  onReset,
  onRemove,
  isDefault,
}: {
  categories: Category[];
  customs: Category[];
  enabled: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  onReset: () => void;
  onRemove: (id: string) => void;
  /** Selection already matches the defaults. */
  isDefault: boolean;
}) {
  return (
    <fieldset className="category-picker" id="category-picker">
      <legend className="sr-only">Categories to look for</legend>
      <div className="category-picker-head">
        <span>{enabled.size} selected</span>
        <span className="category-picker-actions">
          <button type="button" className="link-btn" onClick={onReset} disabled={isDefault}>
            Reset to defaults
          </button>
          <button type="button" className="link-btn" onClick={onClear} disabled={enabled.size === 0}>
            Clear all
          </button>
        </span>
      </div>
      {customs.length > 0 && (
        <>
          <div className="category-picker-section">Added by you</div>
          {customs.map((c) => (
            <div key={c.id} className="category-option-row">
              <Option category={c} checked={enabled.has(c.id)} onToggle={onToggle} />
              <button type="button" className="category-remove" aria-label={`Remove ${c.label}`} onClick={() => onRemove(c.id)}>
                <Icon name="close" size={18} />
              </button>
            </div>
          ))}
          <div className="category-picker-section">Suggested</div>
        </>
      )}
      {categories.map((c) => (
        <Option key={c.id} category={c} checked={enabled.has(c.id)} onToggle={onToggle} />
      ))}
    </fieldset>
  );
}

function Option({ category, checked, onToggle }: { category: Category; checked: boolean; onToggle: (id: string) => void }) {
  return (
    <label className="category-option">
      <input type="checkbox" checked={checked} onChange={() => onToggle(category.id)} />
      <span className="emoji" aria-hidden="true">{pickEmoji(category.emoji)}</span>
      <span className="category-option-label">{category.label}</span>
    </label>
  );
}
