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
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-500">
              {section.section}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2 text-sm ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                        : 'text-zinc-700 hover:bg-stone-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800'
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
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-emerald-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-100/92 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md border border-stone-300 bg-white/80 p-2 text-zinc-700 shadow-sm lg:hidden dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100"
              onClick={() => setMobileOpen((value) => !value)}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

          <div className="min-w-0 flex-1 px-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-500">
              {currentItem?.label || 'Panel operativo'}
            </div>
            <div className="mt-1 truncate text-sm text-zinc-700 dark:text-zinc-300">{profile?.email || user?.email || 'Cuenta activa'}</div>
            {headerContext && <div className="truncate text-xs text-zinc-500 dark:text-zinc-500">{headerContext}</div>}
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-stone-300 bg-white/80 px-3 py-1 text-xs text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200">
              Rol: {profile?.role || user?.role || '-'}
            </span>
            <button
              className="rounded-lg border border-stone-300 bg-white/80 px-3 py-1 text-sm text-zinc-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                applyTheme(next);
                setTheme(next);
              }}
            >
              {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
            <button
              className="rounded-lg border border-stone-300 bg-white/80 px-3 py-1 text-sm text-zinc-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
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
        <aside className="hidden rounded-[1.5rem] border border-stone-200/80 bg-white/78 p-4 shadow-[0_18px_45px_rgba(120,113,108,0.12)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-[0_22px_55px_rgba(0,0,0,0.34)] lg:block">
          <Sidebar role={user?.role} />
        </aside>

        {mobileOpen && (
          <aside className="rounded-[1.5rem] border border-stone-200/80 bg-white/92 p-3 shadow-[0_18px_45px_rgba(120,113,108,0.16)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-[0_22px_55px_rgba(0,0,0,0.38)] lg:hidden">
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
