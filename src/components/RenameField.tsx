import { useState } from 'react';

/**
 * Inline field for renaming a saved address: Enter or leaving the field saves, Escape cancels.
 * `onDone` gets the trimmed name, or null to keep the old one.
 */
export function RenameField({ initial, className, onDone }: { initial: string; className?: string; onDone: (label: string | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      className={`input input-sm ${className ?? ''}`}
      aria-label="Address name"
      value={value}
      maxLength={40}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone(value.trim() || null);
        if (e.key === 'Escape') onDone(null);
      }}
    />
  );
}
