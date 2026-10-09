import { useRef, useState, type FormEvent } from 'react';
import { MAX_SAVED, type SavedAddress } from '../lib/saved';
import { Icon } from './Icon';
import { RenameField } from './RenameField';

/** Save the mapped address (with a nickname) to the comparison grid, or show that it's saved. */
export function SaveControl({
  defaultLabel,
  saved,
  full,
  onSave,
  onRemove,
  onRename,
}: {
  defaultLabel: string;
  saved: SavedAddress | undefined;
  /** Already at the saved-address limit. */
  full: boolean;
  onSave: (label: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState(defaultLabel);
  const [renaming, setRenaming] = useState(false);
  const nameRef = useRef<HTMLButtonElement>(null);

  if (saved)
    return (
      <div className="save-row" data-tour="save">
        <span className="save-state">
          <Icon name="bookmarkAdded" size={20} />
          Saved as{' '}
          {renaming ? (
            <RenameField
              initial={saved.label}
              className="save-rename"
              onDone={(name) => {
                if (name) onRename(saved.id, name);
                setRenaming(false);
                requestAnimationFrame(() => nameRef.current?.focus());
              }}
            />
          ) : (
            <button type="button" ref={nameRef} className="save-name" aria-label={`${saved.label}. Rename`} onClick={() => setRenaming(true)}>
              <strong>{saved.label}</strong>
              <Icon name="edit" size={16} />
            </button>
          )}
        </span>
        <button type="button" className="link-btn" onClick={() => onRemove(saved.id)}>
          Remove
        </button>
      </div>
    );

  if (full)
    return <p className="field-hint" data-tour="save">You’ve saved {MAX_SAVED} addresses. Remove one below to save this one.</p>;

  if (!naming)
    return (
      <div className="save-row" data-tour="save">
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
    <form className="field" data-tour="save" onSubmit={submit}>
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
