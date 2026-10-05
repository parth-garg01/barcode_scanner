import { type FormEvent, useState } from 'react';

interface Props {
  onSubmit: (regNo: string) => void;
}

/** Fallback for damaged, unreadable, or unrecognised barcodes. */
export default function ManualEntryForm({ onSubmit }: Props) {
  const [regNo, setRegNo] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!regNo.trim()) return;
    onSubmit(regNo.trim());
    setRegNo('');
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <input
        value={regNo}
        onChange={(e) => setRegNo(e.target.value)}
        placeholder="Registration number"
        aria-label="Registration number"
        required
      />
      <button type="submit" className="btn btn-block" disabled={!regNo.trim()}>
        Add attendee
      </button>
    </form>
  );
}
