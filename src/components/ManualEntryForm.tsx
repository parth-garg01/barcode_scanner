import { type FormEvent, useState } from 'react';

interface Props {
  onSubmit: (regNo: string, name: string) => void;
}

/** Fallback for damaged, unreadable, or unrecognised barcodes. */
export default function ManualEntryForm({ onSubmit }: Props) {
  const [regNo, setRegNo] = useState('');
  const [name, setName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!regNo.trim()) return;
    onSubmit(regNo.trim(), name.trim());
    setRegNo('');
    setName('');
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <h3>Manual entry</h3>
      <input
        value={regNo}
        onChange={(e) => setRegNo(e.target.value)}
        placeholder="Registration number"
        aria-label="Registration number"
        required
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (if not in master list)"
        aria-label="Name"
      />
      <button type="submit" className="btn btn-block" disabled={!regNo.trim()}>
        Add attendee
      </button>
    </form>
  );
}
