import { useRef, useState } from 'react';
import { readSpreadsheetRows } from '../lib/parse/readSpreadsheet';
import { rowsToStudents } from '../lib/parse/masterList';
import { upsertStudents } from '../lib/students';

/** One-time upload of the registration-number -> student details master list. */
export default function MasterListPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus(null);
    try {
      const rows = await readSpreadsheetRows(file);
      const { students, skipped } = rowsToStudents(rows);
      const saved = await upsertStudents(students);
      setStatus(
        `Imported ${saved} student${saved === 1 ? '' : 's'}.` +
          (skipped ? ` Skipped ${skipped} row${skipped === 1 ? '' : 's'} missing a registration number or name.` : ''),
      );
    } catch {
      setStatus('Could not read that file. Use a CSV or XLSX export with a header row.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="stack">
      <h2>Master student list</h2>
      <p className="muted">
        Upload a CSV or Excel file with columns for registration number, name, department, contact
        number and blood group. Future scans of a known ID will auto-fill these details.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        aria-label="Upload master student list"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {busy && <p className="muted">Importing…</p>}
      {status && <p role="status">{status}</p>}
    </div>
  );
}
