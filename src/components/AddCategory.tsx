import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { PLACE_TYPES } from '../lib/placeTypes';

export type AddOption =
  | { kind: 'existing'; category: Category }
  | { kind: 'type'; type: string; label: string }
  | { kind: 'text'; text: string };

const MAX_TYPE_SUGGESTIONS = 5;

/**
 * "Add your own category". Suggestions are local (no API calls): categories already in the
 * list, then exact Google place types (searched precisely by type), then a free-text search.
 */
export function AddCategory({
  categories,
  enabled,
  onAdd,
}: {
  /** Catalog plus custom categories. */
  categories: Category[];
  enabled: ReadonlySet<string>;
  onAdd: (option: AddOption) => void;
}) {
  const listId = useId();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const text = value.trim();

  const options = useMemo<AddOption[]>(() => {
    const q = text.toLowerCase();
    if (q.length < 2) return [];
    const existing = categories.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 3);
    const covered = new Set(categories.flatMap((c) => c.types));
    const types = PLACE_TYPES.filter(([type, label]) => !covered.has(type) && label.toLowerCase().includes(q))
      .sort(([, a], [, b]) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)))
      .slice(0, MAX_TYPE_SUGGESTIONS);
    return [
      ...existing.map((category) => ({ kind: 'existing' as const, category })),
      ...types.map(([type, label]) => ({ kind: 'type' as const, type, label })),
      { kind: 'text' as const, text },
    ];
  }, [text, categories]);

  function choose(option: AddOption) {
    onAdd(option);
    setValue('');
    setOpen(false);
    setActive(-1);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text) return;
    const q = text.toLowerCase();
    // Without a highlighted suggestion, prefer an exact name match over free text.
    const exact =
      options.find((o) => (o.kind === 'existing' ? o.category.label : o.kind === 'type' ? o.label : '').toLowerCase() === q) ??
      options.find((o) => o.kind === 'text');
    const pick = options[active] ?? exact;
    if (pick) choose(pick);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const showing = open && options.length > 0;
    if (e.key === 'ArrowDown' && options.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (showing ? (i + 1) % options.length : 0));
    } else if (e.key === 'ArrowUp' && showing) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Escape' && showing) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const expanded = open && options.length > 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <form className="field" onSubmit={submit}>
      <label className="field-label" htmlFor="custom-category">
        Add your own category
      </label>
      <div className="field-row">
        <div className="combo">
          <input
            id="custom-category"
            className="input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            placeholder="e.g. bakery, climbing gym"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
          />
          {expanded && (
            <div className="combo-popup">
              <ul className="combo-list" id={listId} role="listbox" aria-label="Category suggestions">
                {options.map((o, i) => (
                  <li
                    key={o.kind === 'existing' ? o.category.id : o.kind === 'type' ? o.type : 'text'}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    className="combo-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                  >
                    <OptionText option={o} enabled={enabled} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button className="btn btn-outline" type="submit" disabled={!text}>
          Add
        </button>
      </div>
    </form>
  );
}

function OptionText({ option, enabled }: { option: AddOption; enabled: ReadonlySet<string> }) {
  if (option.kind === 'existing')
    return (
      <>
        <span className="combo-main">
          {pickEmoji(option.category.emoji)} {option.category.label}
        </span>
        <span className="combo-secondary">{enabled.has(option.category.id) ? 'Already showing' : 'In your list · turn it on'}</span>
      </>
    );
  if (option.kind === 'type')
    return (
      <>
        <span className="combo-main">{option.label}</span>
        <span className="combo-secondary">Google place type · precise match</span>
      </>
    );
  return (
    <>
      <span className="combo-main">Search “{option.text}”</span>
      <span className="combo-secondary">Matches names and descriptions</span>
    </>
  );
}
