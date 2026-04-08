import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../lib/events';

export default function NewEventPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const event = await createEvent({ name, date, description });
    navigate(`/events/${event.id}`);
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <h2>New event</h2>

      <label className="stack" style={{ gap: 'var(--space-1)' }}>
        <span>Event name</span>
        <input
          className="card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Robotics Fest 2026"
          required
          autoFocus
        />
      </label>

      <label className="stack" style={{ gap: 'var(--space-1)' }}>
        <span>Date</span>
        <input className="card" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label className="stack" style={{ gap: 'var(--space-1)' }}>
        <span>Description (optional)</span>
        <textarea
          className="card"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={saving || !name.trim()}>
        {saving ? 'Creating…' : 'Create event'}
      </button>
    </form>
  );
}
