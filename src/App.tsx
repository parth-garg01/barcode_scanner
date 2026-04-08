import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './routes/Layout';
import EventsListPage from './routes/EventsListPage';
import NewEventPage from './routes/NewEventPage';
import EventDetailPage from './routes/EventDetailPage';
import ScanPage from './routes/ScanPage';
import MasterListPage from './routes/MasterListPage';
import ExportPage from './routes/ExportPage';

export default function App() {
  return (
    <HashRouter>
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
    </HashRouter>
  );
}
