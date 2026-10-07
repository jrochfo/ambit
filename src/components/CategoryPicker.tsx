import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';

/** Checklist of every category; each checked one costs one Nearby Search per address. */
export function CategoryPicker({
  categories,
  enabled,
  onToggle,
}: {
  categories: Category[];
  enabled: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="category-picker" id="category-picker">
      <legend className="sr-only">Categories to look for</legend>
      {categories.map((c) => (
        <label key={c.id} className="category-option">
          <input type="checkbox" checked={enabled.has(c.id)} onChange={() => onToggle(c.id)} />
          <span aria-hidden="true">{pickEmoji(c.emoji)}</span>
          {c.label}
        </label>
      ))}
    </fieldset>
  );
}
