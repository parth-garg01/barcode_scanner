import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AttendeeList from '../components/AttendeeList';
import BarcodeScanner from '../components/BarcodeScanner';
import ManualEntryForm from '../components/ManualEntryForm';
import Toast from '../components/Toast';
import { successFeedback, warningFeedback } from '../lib/feedback';
import { addScan, DuplicateScanError, listScans } from '../lib/scans';
import { countStudents } from '../lib/students';
import type { Scan } from '../lib/types';

type Status = { tone: 'success' | 'warning' | 'error'; message: string } | null;

export default function ScanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [scans, setScans] = useState<Scan[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [hasMasterList, setHasMasterList] = useState(true);

  const refresh = useCallback(() => {
    if (eventId) listScans(eventId).then(setScans);
  }, [eventId]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    countStudents().then((n) => setHasMasterList(n > 0));
  }, []);

  async function handleScan(regNo: string, manualName?: string) {
    if (!eventId) return;
    try {
      const scan = await addScan(eventId, regNo, manualName ? { name: manualName } : undefined);
      successFeedback();
      setStatus({ tone: 'success', message: `Checked in: ${scan.name || scan.regNo}` });
      setScans((prev) => [scan, ...prev]);
    } catch (err) {
      warningFeedback();
      if (err instanceof DuplicateScanError) {
        setStatus({ tone: 'warning', message: `${err.existing.regNo} already checked in` });
      } else {
        setStatus({ tone: 'error', message: 'Could not record that scan. Try again.' });
      }
    }
  }

  return (
    <div className="stack">
      <h2>Scan attendees</h2>
      {!hasMasterList && (
        <p className="muted">
          No master student list uploaded yet, scans will only capture the registration number until
          you add one or fill details in manually.
        </p>
      )}
      {status && <Toast tone={status.tone} message={status.message} />}
      <BarcodeScanner onDecode={(text) => handleScan(text)} />
      <ManualEntryForm onSubmit={(regNo, name) => handleScan(regNo, name)} />
      <AttendeeList scans={scans} />
    </div>
  );
}
