import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import AttendeeList from '../components/AttendeeList';
import BarcodeScanner from '../components/BarcodeScanner';
import ManualEntryForm from '../components/ManualEntryForm';
import Toast from '../components/Toast';
import { ApiError } from '../lib/api';
import { stubDate } from '../lib/dates';
import { successFeedback, warningFeedback } from '../lib/feedback';
import { addScan, DuplicateScanError, listScans, syncScans } from '../lib/scans';
import { forgetEvent, getJoinedEvent, getVolunteer } from '../lib/session';

/** How often to exchange scans with the sheet while the screen is open. */
const SYNC_INTERVAL_MS = 10_000;

// `at` keys the toast so a repeat of the same result still replays its entrance.
type Status = { tone: 'success' | 'warning' | 'error'; message: string; at: number } | null;

export default function ScanPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const event = getJoinedEvent(code);
  const volunteer = getVolunteer();
  const [status, setStatus] = useState<Status>(null);
  // null until the first sync attempt settles
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [closed, setClosed] = useState(!!event?.closed);
  // Live, so the count and list follow scans from this phone and from every sync.
  const scans = useLiveQuery(() => listScans(code), [code]) ?? [];
  const waiting = scans.filter((scan) => !scan.synced).length;

  const sync = useCallback(async () => {
    try {
      const { beaten, refused, closed: nowClosed } = await syncScans(code);
      setReachable(true);
      setClosed(nowClosed);
      // Once stopped, an old "Checked in" banner would suggest scanning still works.
      if (nowClosed) setStatus(null);
      if (refused) {
        warningFeedback();
        setStatus({ tone: 'error', message: `Scanning has been stopped: ${refused} scan${refused === 1 ? ' was' : 's were'} not recorded`, at: Date.now() });
      } else if (beaten.length) {
        // Scanned here while offline, but another volunteer's scan reached the sheet first.
        warningFeedback();
        const [first] = beaten;
        const others = beaten.length > 1 ? ` (and ${beaten.length - 1} more)` : '';
        setStatus({ tone: 'warning', message: `${first.regNo} was already scanned by ${first.volunteer}${others}`, at: Date.now() });
      }
    } catch (err) {
      setReachable(false);
      if (err instanceof ApiError) setStatus({ tone: 'error', message: err.message, at: Date.now() });
    }
  }, [code]);

  useEffect(() => {
    sync();
    const timer = setInterval(sync, SYNC_INTERVAL_MS);
    window.addEventListener('online', sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', sync);
    };
  }, [sync]);

  // Opened without joining (shared link, cleared storage): ask for the name first.
  if (!event || !volunteer) return <Navigate to={`/?code=${encodeURIComponent(code)}`} replace />;

  async function handleScan(regNo: string) {
    try {
      const scan = await addScan(code, regNo, volunteer);
      successFeedback();
      setStatus({ tone: 'success', message: `Checked in: ${scan.regNo}`, at: Date.now() });
      sync();
    } catch (err) {
      warningFeedback();
      if (err instanceof DuplicateScanError) {
        const by = err.existing.volunteer === volunteer ? '' : ` by ${err.existing.volunteer}`;
        setStatus({ tone: 'warning', message: `${err.existing.regNo} already scanned${by}`, at: Date.now() });
      } else {
        setStatus({ tone: 'error', message: 'Could not record that scan. Try again.', at: Date.now() });
      }
    }
  }

  function leave() {
    if (waiting && !confirm(`${waiting} scan${waiting === 1 ? ' has' : 's have'} not reached the sheet yet. Leave anyway? They stay on this phone and sync when you come back.`)) return;
    forgetEvent(code);
    navigate('/');
  }

  const syncNote =
    reachable === false
      ? `Offline: ${waiting} scan${waiting === 1 ? '' : 's'} saved on this phone, will sync when the connection returns`
      : waiting
        ? `Sending ${waiting} scan${waiting === 1 ? '' : 's'} to the sheet…`
        : reachable
          ? 'All scans are in the sheet'
          : 'Connecting…';

  return (
    <div className="page">
      <header className="event-hero">
        <div>
          <p className="eyebrow">
            {stubDate(event.date).full} · {volunteer}
          </p>
          <h2 className="display">{event.name}</h2>
        </div>
        <p className="tally">
          <span className="tally-num">{String(scans.length).padStart(2, '0')}</span>
          <span className="eyebrow">checked in</span>
        </p>
      </header>

      <div className="stack">
        <h3 className="visually-hidden">Scan attendees</h3>
        <div className="scan-stage">
          {/* A closed event turns the camera off: nothing scanned now would be accepted. */}
          {!closed && <BarcodeScanner onDecode={handleScan} />}
          <div className="scan-status" role="status" aria-live="polite">
            {status ? (
              <Toast key={status.at} tone={status.tone} message={status.message} />
            ) : (
              <p className="scan-hint">{closed ? 'Scanning is stopped for this event' : 'Line the barcode up inside the brackets'}</p>
            )}
          </div>
        </div>
        {closed && (
          <p className="note">
            The organiser has stopped scanning for this event, so no more ID cards can be checked in. This screen
            reopens by itself if scanning is turned back on.
          </p>
        )}
        <p className={`sync eyebrow${reachable === false ? ' sync-offline' : ''}`} role="status">
          {syncNote}
        </p>
        {!closed && (
          <details className="manual">
            <summary>Enter manually</summary>
            <ManualEntryForm onSubmit={handleScan} />
          </details>
        )}
        <AttendeeList scans={scans} />
      </div>

      <button type="button" className="link-quiet" onClick={leave}>
        Leave this event
      </button>
    </div>
  );
}
