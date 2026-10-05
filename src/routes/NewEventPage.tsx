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
    <form className="page" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Attendance desk</p>
        <h2 className="display">New event</h2>
      </div>

      <label className="field">
        <span className="eyebrow">Event name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Robotics Fest 2026"
          required
          autoFocus
        />
      </label>

      <label className="field">
        <span className="eyebrow">Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label className="field">
        <span className="eyebrow">Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={saving || !name.trim()}>
        {saving ? 'Creating…' : 'Create event'}
      </button>
    </form>
  );
}
