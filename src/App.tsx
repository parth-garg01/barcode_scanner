import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Spinner from './components/Spinner';
import Layout from './routes/Layout';
import EventsListPage from './routes/EventsListPage';
import NewEventPage from './routes/NewEventPage';
import EventDetailPage from './routes/EventDetailPage';
import ScanPage from './routes/ScanPage';

// These two pull in the xlsx library, which is sizeable and only needed once
// an organiser actually opens the master list or export tab.
const MasterListPage = lazy(() => import('./routes/MasterListPage'));
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
                <Route path="master-list" element={<MasterListPage />} />
                <Route path="export" element={<ExportPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}
