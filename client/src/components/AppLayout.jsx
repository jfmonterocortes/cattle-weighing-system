import { Menu, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { parseJwt } from '../utils/jwt';
import { applyTheme, initTheme } from '../utils/theme';

const links = [
  { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'LIQUIDADOR', 'CLIENT'] },
  { to: '/planillas', label: 'Planillas', roles: ['ADMIN', 'LIQUIDADOR', 'CLIENT'] },
  { to: '/planillas/new', label: 'Nueva Planilla', roles: ['ADMIN', 'LIQUIDADOR'] },
  { to: '/personas', label: 'Personas', roles: ['ADMIN', 'LIQUIDADOR'] },
  { to: '/usuarios', label: 'Usuarios', roles: ['ADMIN'] },
  { to: '/settings', label: 'Settings', roles: ['ADMIN', 'LIQUIDADOR', 'CLIENT'] },
];

function Sidebar({ role, onNavigate }) {
  const visibleLinks = links.filter((item) => item.roles.includes(role));

  return (
    <nav className="space-y-1">
      {visibleLinks.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => initTheme());

  const token = localStorage.getItem('token');
  const user = useMemo(() => (token ? parseJwt(token) : null), [token]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="rounded-md border border-zinc-700 p-2 lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div>
              <h1 className="text-lg font-semibold">Cattle Weighing Management System</h1>
              <p className="text-xs text-zinc-400">{location.pathname}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">Rol: {user?.role || '-'}</span>
            <button
              className="rounded-lg border border-zinc-700 px-3 py-1 text-sm"
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                applyTheme(next);
                setTheme(next);
              }}
            >
              {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
            <button
              className="rounded-lg border border-zinc-700 px-3 py-1 text-sm"
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/login', { replace: true });
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside className="hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 lg:block">
          <Sidebar role={user?.role} />
        </aside>

        {mobileOpen && (
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/95 p-3 lg:hidden">
            <Sidebar role={user?.role} onNavigate={() => setMobileOpen(false)} />
          </aside>
        )}

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
