import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { listEvents } from '../lib/events';
import type { Event } from '../lib/types';

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Events</h2>
        <Link to="/events/new" className="btn btn-primary">
          + New event
        </Link>
      </div>

      {events === null && <Spinner />}
      {events?.length === 0 && (
        <p className="muted">No events yet. Create one to start scanning attendees.</p>
      )}

      <div className="stack">
        {events?.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>{event.name}</h3>
                <span className="muted">{event.date}</span>
              </div>
              <span aria-hidden="true">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
