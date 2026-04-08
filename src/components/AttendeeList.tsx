import { useMemo, useState } from 'react';
import type { Scan } from '../lib/types';

interface Props {
  scans: Scan[];
}

/** Live, searchable list of everyone checked in so far, with a running count. */
export default function AttendeeList({ scans }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scans;
    return scans.filter(
      (s) => s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q),
    );
  }, [scans, query]);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Checked in</h3>
        <span className="mono" aria-live="polite">
          {scans.length}
        </span>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or registration number"
        aria-label="Search attendees"
      />

      {filtered.length === 0 && <p className="muted">{scans.length === 0 ? 'No check-ins yet.' : 'No matches.'}</p>}

      <ul className="attendee-list">
        {filtered.map((scan) => (
          <li key={scan.id} className="card row" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>{scan.name || 'Unknown'}</strong>
              <div className="muted mono">{scan.regNo}</div>
            </div>
            <span className="muted">{new Date(scan.timestamp).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
