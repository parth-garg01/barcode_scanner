import { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { getEvent } from '../lib/events';
import { countScans } from '../lib/scans';
import type { Event } from '../lib/types';

/** Event summary header plus tab navigation into scan/list/master/export sub-pages. */
export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId).then((e) => setEvent(e ?? null));
    countScans(eventId).then(setCount);
  }, [eventId]);

  if (!event) return <p className="muted">Loading…</p>;

  return (
    <div className="stack">
      <div>
        <h2>{event.name}</h2>
        <p className="muted">
          {event.date} · {count} checked in
        </p>
      </div>

      <nav className="tab-bar">
        <Link to="">Scan</Link>
        <Link to="master-list">Master list</Link>
        <Link to="export">Export</Link>
      </nav>

      <Outlet />
    </div>
  );
}
