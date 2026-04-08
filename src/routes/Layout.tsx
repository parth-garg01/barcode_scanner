import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span aria-hidden="true">📋</span>
        <h1>ScanMark</h1>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
