import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { deleteEvent, getEvent } from '../lib/events';
import { countScans } from '../lib/scans';
import type { Event } from '../lib/types';

/** Event summary header plus tab navigation into scan/list/master/export sub-pages. */
export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  // Live query so the count updates immediately as scans are added, deleted
  // or the app is used across two tabs, rather than only once on mount.
  const count = useLiveQuery(() => (eventId ? countScans(eventId) : 0), [eventId]) ?? 0;

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId).then((e) => setEvent(e ?? null));
  }, [eventId]);

  if (!event) return <Spinner />;

  async function handleDelete() {
    if (!eventId || !event) return;
    if (!confirm(`Delete "${event.name}" and all its attendance records? This can't be undone.`)) return;
    await deleteEvent(eventId);
    navigate('/');
  }

  return (
    <div className="page event-shell">
      <header className="event-hero">
        <div>
          <p className="eyebrow">
            {new Date(`${event.date}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <h2 className="display">{event.name}</h2>
        </div>
        <p className="tally">
          <span className="tally-num">{String(count).padStart(2, '0')}</span>
          <span className="eyebrow">checked in</span>
        </p>
      </header>

      <Outlet />

      <button className="link-danger" onClick={handleDelete}>
        Delete event
      </button>

      <nav className="tab-bar" aria-label="Event sections">
        <NavLink to="" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Scan
        </NavLink>
        <NavLink to="master-list" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Students
        </NavLink>
        <NavLink to="export" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Export
        </NavLink>
      </nav>
    </div>
  );
}
