import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MAX_RING, MAX_RINGS, MIN_RING } from '../../shared/isochrones';
import { formatMinutes, pillColors } from '../lib/rings';
import { Icon } from './Icon';

const PRESETS = [5, 10, 15, 20, 30, 45, 60];

/**
 * Active walking rings as pills, three to a row: tap to show or hide, close icon to remove, "Add time" for a preset or
 * custom time. The add menu stays open for several changes until Done. Adding a ring costs one Isochrones call per
 * address; hiding is free.
 */
export function RingPicker({
  rings,
  hidden,
  onToggle,
  onAdd,
  onRemove,
}: {
  rings: number[];
  hidden: ReadonlySet<number>;
  onToggle: (m: number) => void;
  onAdd: (m: number) => void;
  onRemove: (m: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');
  const presets = PRESETS.filter((m) => !rings.includes(m));
  const canAdd = rings.length < MAX_RINGS;
  const customValue = Number(custom);
  const customValid = Number.isInteger(customValue) && customValue >= MIN_RING && customValue <= MAX_RING && !rings.includes(customValue);

  // An added preset leaves the menu, so keyboard focus moves to the preset now in its place
  // (or the custom field) instead of getting lost.
  const menuRef = useRef<HTMLDivElement>(null);
  const [refocus, setRefocus] = useState<number | null>(null);
  useEffect(() => {
    if (refocus === null) return;
    const chips = menuRef.current?.querySelectorAll<HTMLElement>('.ring-add-presets .chip');
    const next = chips?.[Math.min(refocus, chips.length - 1)] ?? menuRef.current?.querySelector<HTMLElement>('input');
    (next ?? document.getElementById('ring-add-toggle'))?.focus();
    setRefocus(null);
  }, [refocus]);

  function add(m: number, fromPreset?: number) {
    onAdd(m);
    setCustom('');
    if (fromPreset !== undefined) setRefocus(fromPreset);
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    if (customValid) add(customValue);
  }

  return (
    <div className="field" role="group" aria-labelledby="walking-time-label">
      <div className="field-head">
        <h2 className="field-label" id="walking-time-label">
          Walking times
        </h2>
        <button type="button" id="ring-add-toggle" className="link-btn" aria-expanded={adding} aria-controls="ring-add" onClick={() => setAdding((a) => !a)}>
          {adding ? (
            'Done'
          ) : (
            <>
              <Icon name="add" size={20} />
              Add time
            </>
          )}
        </button>
      </div>
      <div className="field-hint">Tap to show or hide</div>
      <div className="pills">
        {rings.map((m, rank) => {
          const shown = !hidden.has(m);
          const { bg, fg } = pillColors(rank);
          return (
            <span key={m} className="pill-chip" style={shown ? { background: bg, color: fg, borderColor: bg } : undefined}>
              <button type="button" className="pill-toggle" aria-pressed={shown} onClick={() => onToggle(m)}>
                {formatMinutes(m)}
              </button>
              {rings.length > 1 && (
                <button type="button" className="pill-remove" aria-label={`Remove ${formatMinutes(m)} ring`} data-tip={`Remove ${formatMinutes(m)}`} onClick={() => onRemove(m)}>
                  <Icon name="close" size={16} />
                </button>
              )}
            </span>
          );
        })}
      </div>
      {adding && !canAdd && (
        <div className="ring-add" id="ring-add" ref={menuRef}>
          <div className="field-hint">That’s the most walking times at once ({MAX_RINGS}). Remove one to add another.</div>
        </div>
      )}
      {adding && canAdd && (
        <div className="ring-add" id="ring-add" ref={menuRef}>
          {presets.length > 0 && (
            <div className="ring-add-presets">
              {presets.map((m, i) => (
                <button key={m} type="button" className="chip" onClick={() => add(m, i)}>
                  {formatMinutes(m)}
                </button>
              ))}
            </div>
          )}
          <form className="field-row" onSubmit={submitCustom}>
            <label className="sr-only" htmlFor="ring-custom">
              Custom walking time in minutes
            </label>
            <input
              id="ring-custom"
              className="input input-sm"
              type="number"
              inputMode="numeric"
              min={MIN_RING}
              max={MAX_RING}
              step={1}
              placeholder={`Minutes (${MIN_RING}–${MAX_RING})`}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button className="btn btn-sm btn-outline" type="submit" disabled={!customValid}>
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
