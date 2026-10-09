import { isDailyLimit } from '../../shared/limits';
import { Icon } from './Icon';

export type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; message: string }
  | { kind: 'done'; address: string }
  | { kind: 'error'; message: string };

/**
 * Splits Google's one-line address into a street line and a locality line, envelope style.
 * The country is dropped for US addresses (domestic addresses omit it) and kept otherwise.
 */
export function splitAddress(address: string): [street: string, locality: string] {
  const parts = address.split(', ');
  if (parts.length > 1 && /^(USA|United States)$/.test(parts[parts.length - 1]!)) parts.pop();
  return [parts[0]!, parts.slice(1).join(', ')];
}

export function StatusLine({ status }: { status: Status }) {
  const [street, locality] = status.kind === 'done' ? splitAddress(status.address) : ['', ''];
  // A used-up daily quota isn't the visitor's mistake: shown as a calm note, not an error.
  const limit = status.kind === 'error' && isDailyLimit(status.message);
  return (
    <div className={`status${status.kind === 'error' && !limit ? ' status-error' : ''}${limit ? ' status-note' : ''}`} role="status" aria-live="polite">
      {status.kind === 'busy' && status.message}
      {status.kind === 'error' && (
        // An icon as well as color, so errors never rely on hue (red-orange palettes).
        <span className="status-error-line">
          <Icon name={limit ? 'info' : 'error'} size={16} />
          {status.message}
        </span>
      )}
      {status.kind === 'done' && (
        <div className="current-address">
          <span className="eyebrow">Walking from</span>
          <span className="address-street">{street}</span>
          {locality && <span className="address-locality">{locality}</span>}
        </div>
      )}
    </div>
  );
}
