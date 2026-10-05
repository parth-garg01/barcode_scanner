import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import AdminPage from './routes/AdminPage';
import JoinPage from './routes/JoinPage';
import Layout from './routes/Layout';
import ScanPage from './routes/ScanPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<JoinPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/e/:code" element={<ScanPage />} />
            {/* Old links from earlier versions go back to the start. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
