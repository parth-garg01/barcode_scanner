import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './routes/Layout';
import EventsListPage from './routes/EventsListPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<EventsListPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
