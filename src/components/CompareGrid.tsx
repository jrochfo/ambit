import { useState } from 'react';
import { categoryTint, type Category } from '../lib/categories';
import { pickEmoji } from '../lib/emoji';
import { formatMinutes } from '../lib/rings';
import { RingTag } from './RingTag';
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
            Walking time to the spot that counts in each category. A dash means nothing within {within}.
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
            <colgroup>
              <col className="compare-col-category" />
              {saved.map((a) => (
                <col key={a.id} />
              ))}
            </colgroup>
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
                    <div className="compare-category-inner">
                      <span className="category-avatar" style={{ background: categoryTint(c.color), borderColor: c.color }} aria-hidden="true">
                        {pickEmoji(c.emoji)}
                      </span>
                      <span className="compare-category-label">{c.label}</span>
                    </div>
                  </th>
                  {saved.map((a) => (
                    <td key={a.id} aria-current={a.id === currentId ? 'true' : undefined}>
                      <button type="button" className="compare-cell" onClick={() => onSelectCell(a, c.id)}>
                        {/* Visible text stays in the spoken name; the hidden parts give it context. */}
                        <span className="sr-only">{c.label} near {a.label}: </span>
                        <CellPill cell={cells[a.id]?.[c.id]} rings={rings} />
                        <CellName cell={cells[a.id]?.[c.id]} />
                        <span className="sr-only">. {describeCell(cells[a.id]?.[c.id], within)}. Show on the map.</span>
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
  if (!cell || cell.status === 'loading') return 'Loading';
  if (cell.status === 'error') return cell.message;
  return cell.ring === null ? `Nothing within ${within}` : `Within a ${formatMinutes(cell.ring)} walk`;
}

function CellPill({ cell, rings }: { cell: Cell | undefined; rings: number[] }) {
  if (!cell || cell.status === 'loading') return <RingTag value={{ kind: 'loading' }} rings={rings} />;
  if (cell.status === 'error') return <RingTag value={{ kind: 'error', label: '!', message: cell.message }} rings={rings} />;
  if (cell.ring === null) return <RingTag value={{ kind: 'none', label: '—' }} rings={rings} />;
  return <RingTag value={{ kind: 'ring', minutes: cell.ring }} rings={rings} />;
}

function CellName({ cell }: { cell: Cell | undefined }) {
  // A failed name lookup just leaves the pill (the cell still opens the spot on the map).
  if (cell?.status !== 'done' || !cell.spotId || (cell.nameFailed && !cell.spotName)) return null;
  return (
    <span className={cell.spotName ? 'compare-spot' : 'compare-spot compare-spot-loading'}>
      {cell.picked && <Icon name="starFill" size={16} className="pick-star" />}
      {cell.spotName ?? 'Loading name…'}
      {cell.picked && <span className="sr-only"> (your pick)</span>}
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
