import { useMemo, useState } from 'react';
import type { Scan } from '../lib/types';

interface Props {
  scans: Scan[];
}

/** Live, searchable list of everyone checked in so far, across all volunteers. */
export default function AttendeeList({ scans }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scans;
    return scans.filter((s) => s.regNo.toLowerCase().includes(q));
  }, [scans, query]);

  return (
    <section className="stack">
      <div className="ledger-head">
        <h3 className="eyebrow">Checked in</h3>
        <span className="mono" aria-live="polite">
          {scans.length}
        </span>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by registration number"
        aria-label="Search attendees"
      />

      {filtered.length === 0 && <p className="muted">{scans.length === 0 ? 'No check-ins yet.' : 'No matches.'}</p>}

      <ul className="ledger-rows">
        {filtered.map((scan) => (
          <li key={scan.id}>
            <div>
              <strong className="mono">{scan.regNo}</strong>
              <span>
                {scan.volunteer}
                {!scan.synced && ' · waiting to sync'}
              </span>
            </div>
            <time dateTime={new Date(scan.timestamp).toISOString()}>
              {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
