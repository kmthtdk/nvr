import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { LiveView } from './pages/LiveView';
import { Playback } from './pages/Playback';
import { DeviceManager } from './pages/DeviceManager';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<LiveView />} />
        <Route path="playback" element={<Playback />} />
        <Route path="devices" element={<DeviceManager />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
