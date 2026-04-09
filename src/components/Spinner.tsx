/** Small inline loading indicator, used wherever a page is waiting on IndexedDB. */
export default function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="row muted" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  );
}
