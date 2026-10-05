import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { listEvents } from '../lib/events';
import type { Event } from '../lib/types';

/** Splits an ISO date (yyyy-mm-dd) into the pieces printed on a ticket stub. */
function stubDate(iso: string) {
  const date = new Date(`${iso}T00:00`);
  return {
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    month: date.toLocaleDateString(undefined, { month: 'short' }),
    rest: date.toLocaleDateString(undefined, { weekday: 'long' }),
  };
}

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

  return (
    <div className="page">
      <div>
        <p className="eyebrow">Attendance desk</p>
        <h2 className="display">Events</h2>
      </div>

      {events === null && <Spinner />}
      {events?.length === 0 && (
        <p className="empty">No events yet. Create one to start scanning attendees.</p>
      )}

      {!!events?.length && (
        <ul className="stubs">
          {events.map((event) => {
            const { day, month, rest } = stubDate(event.date);
            return (
              <li key={event.id}>
                <Link to={`/events/${event.id}`} className="stub">
                  <span className="stub-date">
                    <b>{day}</b>
                    <span>{month}</span>
                  </span>
                  <span className="stub-body">
                    <strong>{event.name}</strong>
                    <span>{event.description || rest}</span>
                  </span>
                  <span className="stub-go" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link to="/events/new" className="btn btn-primary btn-block">
        New event
      </Link>
    </div>
  );
}
