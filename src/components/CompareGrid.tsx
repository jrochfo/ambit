import { useState } from 'react';
import type { Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { formatMinutes, pillColors } from '../lib/rings';
import type { SavedAddress } from '../lib/saved';
import type { Cell } from '../lib/useComparison';
import { Icon } from './Icon';

/** Categories × saved addresses, each cell the walking ring of the nearest spot. */
export function CompareGrid({
  saved,
  categories,
  rings,
  cells,
  currentId,
  onSelect,
  onSelectCell,
  onRemove,
  onRename,
}: {
  saved: SavedAddress[];
  categories: Category[];
  /** Active ring sizes, ascending. */
  rings: number[];
  cells: Record<string, Record<string, Cell>>;
  /** Saved address currently on the map. */
  currentId: string | undefined;
  onSelect: (a: SavedAddress) => void;
  /** Map an address with a category's nearest spot opened. */
  onSelectCell: (a: SavedAddress, categoryId: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const largest = rings[rings.length - 1];
  const within = largest ? formatMinutes(largest) : '';

  return (
    <section className="card compare" aria-labelledby="compare-title">
      <div className="compare-head">
        <h2 className="compare-title" id="compare-title">
          Compare addresses
        </h2>
        {saved.length > 0 && (
          <p className="compare-note">
            Walking minutes to the nearest spot in each category. A dash means nothing within {within}.
          </p>
        )}
      </div>
      {saved.length === 0 ? (
        <p className="compare-empty">Map an address and choose “Save to compare” to see your saved addresses side by side, here.</p>
      ) : categories.length === 0 ? (
        <p className="compare-empty">Choose categories to compare your saved addresses.</p>
      ) : (
        <div className="compare-scroll">
          <table className="compare-table">
            <caption className="sr-only">Nearest spot per category, in walking minutes, for each saved address</caption>
            <thead>
              <tr>
                <th scope="col" className="compare-corner">
                  Category
                </th>
                {saved.map((a) => (
                  <th key={a.id} scope="col" aria-current={a.id === currentId ? 'true' : undefined} className="compare-col">
                    <button type="button" className="icon-btn compare-remove" aria-label={`Remove ${a.label}`} onClick={() => onRemove(a.id)}>
                      <Icon name="close" size={16} />
                    </button>
                    {renaming === a.id ? (
                      <RenameField
                        initial={a.label}
                        onDone={(label) => {
                          if (label) onRename(a.id, label);
                          setRenaming(null);
                        }}
                      />
                    ) : (
                      <div className="compare-col-head">
                        <button type="button" className="compare-col-name" title={`${a.address}. Show on the map.`} onClick={() => onSelect(a)}>
                          {a.label}
                        </button>
                        <button type="button" className="icon-btn compare-rename-btn" aria-label={`Rename ${a.label}`} onClick={() => setRenaming(a.id)}>
                          <Icon name="edit" size={16} />
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <th scope="row" className="compare-category">
                    <span aria-hidden="true">{pickEmoji(c.emoji)}</span> {c.label}
                  </th>
                  {saved.map((a) => (
                    <td key={a.id} aria-current={a.id === currentId ? 'true' : undefined}>
                      <button
                        type="button"
                        className="compare-cell"
                        aria-label={`${c.label} near ${a.label}: ${describeCell(cells[a.id]?.[c.id], within)}. Show on the map.`}
                        onClick={() => onSelectCell(a, c.id)}
                      >
                        <CellPill cell={cells[a.id]?.[c.id]} rings={rings} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Within {within}</th>
                {saved.map((a) => {
                  const row = cells[a.id] ?? {};
                  const found = categories.filter((c) => {
                    const cell = row[c.id];
                    return cell?.status === 'done' && cell.ring !== null;
                  }).length;
                  return (
                    <td key={a.id} className="compare-total">
                      {found} of {categories.length}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

function describeCell(cell: Cell | undefined, within: string): string {
  if (!cell || cell.status === 'loading') return 'loading';
  if (cell.status === 'error') return cell.message;
  return cell.ring === null ? `nothing within ${within}` : `within ${formatMinutes(cell.ring)}`;
}

function CellPill({ cell, rings }: { cell: Cell | undefined; rings: number[] }) {
  if (!cell || cell.status === 'loading')
    return (
      <span className="grid-pill grid-pill-none">
        …
      </span>
    );
  if (cell.status === 'error')
    return (
      <span className="grid-pill grid-pill-none" title={cell.message}>
        !
      </span>
    );
  if (cell.ring === null)
    return (
      <span className="grid-pill grid-pill-none">
        —
      </span>
    );
  const { bg, fg } = pillColors(rings.indexOf(cell.ring));
  return (
    <span className="grid-pill" style={{ background: bg, color: fg, borderColor: bg }}>
      {cell.ring < 60 ? cell.ring : formatMinutes(cell.ring)}
    </span>
  );
}

function RenameField({ initial, onDone }: { initial: string; onDone: (label: string | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      className="input input-sm compare-rename"
      aria-label="Address name"
      value={value}
      maxLength={40}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone(value.trim() || null);
        if (e.key === 'Escape') onDone(null);
      }}
    />
  );
}
