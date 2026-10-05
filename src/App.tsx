import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Spinner from './components/Spinner';
import Layout from './routes/Layout';
import EventsListPage from './routes/EventsListPage';
import NewEventPage from './routes/NewEventPage';
import EventDetailPage from './routes/EventDetailPage';
import ScanPage from './routes/ScanPage';

// This pulls in the xlsx library, which is sizeable and only needed once
// an organiser actually opens the export tab.
const ExportPage = lazy(() => import('./routes/ExportPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<EventsListPage />} />
              <Route path="/events/new" element={<NewEventPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />}>
                <Route index element={<ScanPage />} />
                <Route path="export" element={<ExportPage />} />
              </Route>
              {/* Old links (for example the removed Students tab) go back to the events list. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}
