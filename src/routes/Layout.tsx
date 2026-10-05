import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="wordmark" aria-label="ScanMark, all events">
          <span className="barcode-mark" aria-hidden="true" />
          <h1>ScanMark</h1>
        </Link>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
