import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import PlanillasPage from './pages/PlanillasPage';
import NewSheetPage from './pages/NewSheetPage';
import SheetDetailPage from './pages/SheetDetailPage';
import PersonasPage from './pages/PersonasPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import AppLayout from './components/AppLayout';
import { parseJwt } from './utils/jwt';

function getAuth() {
  const token = localStorage.getItem('token');
  const user = token ? parseJwt(token) : null;
  return { token, user };
}

function RequireAuth() {
  const { token } = getAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireRole({ roles }) {
  const { user } = getAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function RootRedirect() {
  const { token } = getAuth();
  return <Navigate to={token ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/planillas" element={<PlanillasPage />} />
            <Route path="/planillas/new" element={<NewSheetPage />} />
            <Route path="/planillas/:id" element={<SheetDetailPage />} />
            <Route path="/personas" element={<PersonasPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<RequireRole roles={['ADMIN']} />}>
              <Route path="/usuarios" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
