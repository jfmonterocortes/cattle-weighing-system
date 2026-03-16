import { Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { parseJwt } from '../utils/jwt';
import { applyTheme, initTheme } from '../utils/theme';

const navigationByRole = {
  ADMIN: [
    {
      section: 'Operacion',
      items: [
        { to: '/dashboard', label: 'Centro operativo' },
        { to: '/planillas', label: 'Planillas' },
        { to: '/planillas/new', label: 'Registrar planilla' },
      ],
    },
    {
      section: 'Supervision',
      items: [
        { to: '/personas', label: 'Personas' },
        { to: '/usuarios', label: 'Cuentas y vinculaciones' },
      ],
    },
    {
      section: 'Cuenta',
      items: [{ to: '/settings', label: 'Mi cuenta' }],
    },
  ],
  LIQUIDADOR: [
    {
      section: 'Operacion',
      items: [
        { to: '/dashboard', label: 'Centro operativo' },
        { to: '/planillas', label: 'Planillas' },
        { to: '/planillas/new', label: 'Registrar planilla' },
      ],
    },
    {
      section: 'Directorio',
      items: [{ to: '/personas', label: 'Personas' }],
    },
    {
      section: 'Cuenta',
      items: [{ to: '/settings', label: 'Mi cuenta' }],
    },
  ],
  CLIENT: [
    {
      section: 'Seguimiento',
      items: [{ to: '/planillas', label: 'Mis planillas' }],
    },
    {
      section: 'Cuenta',
      items: [{ to: '/settings', label: 'Mi cuenta' }],
    },
  ],
};

function getNavigation(role) {
  return navigationByRole[role] || [];
}

function findCurrentItem(role, pathname) {
  const items = getNavigation(role)
    .flatMap((section) => section.items)
    .sort((left, right) => right.to.length - left.to.length);

  return items.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) || null;
}

function Sidebar({ role, onNavigate, mobile = false }) {
  const sections = getNavigation(role);

  return (
    <div>
      <div className={`mb-4 ${mobile ? '' : 'pb-4'}`}>
        <div className="mx-auto flex h-45 w-full items-center justify-center">
          <img src="/logo-bascula-la-esperanza.png" alt="BASCULA LA ESPERANZA" className="h-full w-auto object-contain" />
        </div>
      </div>

      <nav className="space-y-5">
        {sections.map((section) => (
          <div key={section.section}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{section.section}</div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2 text-sm ${
                      isActive ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => initTheme());
  const [profile, setProfile] = useState(null);

  const token = localStorage.getItem('token');
  const user = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const currentItem = useMemo(() => findCurrentItem(user?.role, location.pathname), [location.pathname, user?.role]);

  const headerContext = useMemo(() => {
    if (!profile) return '';
    if (profile.role === 'CLIENT' && profile.person?.name) return `Persona vinculada: ${profile.person.name}`;
    if (profile.role === 'LIQUIDADOR' && profile.liquidadorAlias) return `Alias operativo: ${profile.liquidadorAlias}`;
    if (profile.role === 'ADMIN') return 'Supervision operativa y control';
    return profile.email || '';
  }, [profile]);

  useEffect(() => {
    document.title = 'BASCULA LA ESPERANZA';
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const res = await api.get('/settings');
        if (!cancelled) {
          setProfile(res.data?.profile || null);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      }
    };

    if (user?.role) {
      loadProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="rounded-md border border-zinc-700 p-2 lg:hidden" onClick={() => setMobileOpen((value) => !value)}>
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

          <div className="min-w-0 flex-1 px-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              {currentItem?.label || 'Panel operativo'}
            </div>
            <div className="mt-1 truncate text-sm text-zinc-300">{profile?.email || user?.email || 'Cuenta activa'}</div>
            {headerContext && <div className="truncate text-xs text-zinc-500">{headerContext}</div>}
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">
              Rol: {profile?.role || user?.role || '-'}
            </span>
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
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[280px_1fr]">
        <aside className="hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 lg:block">
          <Sidebar role={user?.role} />
        </aside>

        {mobileOpen && (
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/95 p-3 lg:hidden">
            <Sidebar role={user?.role} onNavigate={() => setMobileOpen(false)} mobile />
          </aside>
        )}

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
