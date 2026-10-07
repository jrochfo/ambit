export type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; message: string }
  | { kind: 'done'; address: string }
  | { kind: 'error'; message: string };

export function StatusLine({ status }: { status: Status }) {
  return (
    <p className={`status${status.kind === 'error' ? ' status-error' : ''}`} role="status" aria-live="polite">
      {status.kind === 'busy' && status.message}
      {status.kind === 'error' && status.message}
      {status.kind === 'done' && (
        <>
          Walking from <strong>{status.address}</strong>
        </>
      )}
    </p>
  );
}
