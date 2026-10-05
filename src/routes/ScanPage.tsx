import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AttendeeList from '../components/AttendeeList';
import BarcodeScanner from '../components/BarcodeScanner';
import ManualEntryForm from '../components/ManualEntryForm';
import Toast from '../components/Toast';
import { successFeedback, warningFeedback } from '../lib/feedback';
import { addScan, DuplicateScanError, listScans } from '../lib/scans';
import type { Scan } from '../lib/types';

// `at` keys the toast so a repeat of the same result still replays its entrance.
type Status = { tone: 'success' | 'warning' | 'error'; message: string; at: number } | null;

export default function ScanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [scans, setScans] = useState<Scan[]>([]);
  const [status, setStatus] = useState<Status>(null);

  const refresh = useCallback(() => {
    if (eventId) listScans(eventId).then(setScans);
  }, [eventId]);

  useEffect(refresh, [refresh]);

  async function handleScan(regNo: string) {
    if (!eventId) return;
    try {
      const scan = await addScan(eventId, regNo);
      successFeedback();
      setStatus({ tone: 'success', message: `Checked in: ${scan.regNo}`, at: Date.now() });
      setScans((prev) => [scan, ...prev]);
    } catch (err) {
      warningFeedback();
      if (err instanceof DuplicateScanError) {
        setStatus({ tone: 'warning', message: `${err.existing.regNo} already checked in`, at: Date.now() });
      } else {
        setStatus({ tone: 'error', message: 'Could not record that scan. Try again.', at: Date.now() });
      }
    }
  }

  return (
    <div className="stack">
      <h3 className="visually-hidden">Scan attendees</h3>
      <div className="scan-stage">
        <BarcodeScanner onDecode={handleScan} />
        <div className="scan-status" role="status" aria-live="polite">
          {status ? (
            <Toast key={status.at} tone={status.tone} message={status.message} />
          ) : (
            <p className="scan-hint">Line the barcode up inside the brackets</p>
          )}
        </div>
      </div>
      <details className="manual">
        <summary>Enter manually</summary>
        <ManualEntryForm onSubmit={handleScan} />
      </details>
      <AttendeeList scans={scans} />
    </div>
  );
}
