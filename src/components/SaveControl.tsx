import { useState, type FormEvent } from 'react';
import { MAX_SAVED, type SavedAddress } from '../lib/saved';
import { Icon } from './Icon';

/** Save the mapped address (with a nickname) to the comparison grid, or show that it's saved. */
export function SaveControl({
  defaultLabel,
  saved,
  full,
  onSave,
  onRemove,
}: {
  defaultLabel: string;
  saved: SavedAddress | undefined;
  /** Already at the saved-address limit. */
  full: boolean;
  onSave: (label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState(defaultLabel);

  if (saved)
    return (
      <div className="save-row">
        <span className="save-state">
          <Icon name="bookmarkAdded" size={20} />
          Saved as <strong>{saved.label}</strong>
        </span>
        <button type="button" className="link-btn" onClick={() => onRemove(saved.id)}>
          Remove
        </button>
      </div>
    );

  if (full)
    return <p className="field-hint">You’ve saved {MAX_SAVED} addresses. Remove one below to save this one.</p>;

  if (!naming)
    return (
      <div className="save-row">
        <button type="button" className="btn btn-sm btn-outline btn-icon" onClick={() => setNaming(true)}>
          <Icon name="bookmarkAdd" size={20} />
          Save to compare
        </button>
      </div>
    );

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = label.trim();
    if (name) onSave(name);
  }

  return (
    <form className="field" onSubmit={submit}>
      <label className="field-label" htmlFor="save-label">
        Name this address
      </label>
      <div className="field-row">
        <input
          id="save-label"
          className="input input-sm"
          value={label}
          maxLength={40}
          autoFocus
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setNaming(false);
          }}
        />
        <button className="btn btn-sm" type="submit" disabled={!label.trim()}>
          Save
        </button>
      </div>
    </form>
  );
}
