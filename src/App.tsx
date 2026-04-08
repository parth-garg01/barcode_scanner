import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './routes/Layout';
import EventsListPage from './routes/EventsListPage';
import NewEventPage from './routes/NewEventPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<EventsListPage />} />
          <Route path="/events/new" element={<NewEventPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
