import {
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { parseJwt } from '../utils/jwt';
import { applyTheme, initTheme } from '../utils/theme';

const navigationByRole = {
  ADMIN: [
    {
      section: 'Operación',
      items: [
        { to: '/dashboard', label: 'Centro operativo', icon: LayoutDashboard },
        { to: '/planillas', label: 'Planillas', icon: ClipboardList },
        { to: '/planillas/new', label: 'Registrar planilla', icon: FilePlus2 },
      ],
    },
    {
      section: 'Supervisión',
      items: [
        { to: '/personas', label: 'Personas', icon: Users },
        { to: '/usuarios', label: 'Cuentas y vinculaciones', icon: ShieldCheck },
      ],
    },
    {
      section: 'Cuenta',
      items: [{ to: '/settings', label: 'Mi cuenta', icon: Settings }],
    },
  ],
  LIQUIDADOR: [
    {
      section: 'Operación',
      items: [
        { to: '/dashboard', label: 'Centro operativo', icon: LayoutDashboard },
        { to: '/planillas', label: 'Planillas', icon: ClipboardList },
        { to: '/planillas/new', label: 'Registrar planilla', icon: FilePlus2 },
      ],
    },
    {
      section: 'Directorio',
      items: [{ to: '/personas', label: 'Personas', icon: Users }],
    },
    {
      section: 'Cuenta',
      items: [{ to: '/settings', label: 'Mi cuenta', icon: Settings }],
    },
  ],
  CLIENT: [
    {
      section: 'Seguimiento',
      items: [{ to: '/planillas', label: 'Mis planillas', icon: ClipboardList }],
    },
    {
      section: 'Cuenta',
      items: [{ to: '/settings', label: 'Mi cuenta', icon: Settings }],
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

function UserAvatar({ email }) {
  const initials = email ? email.split('@')[0].slice(0, 2).toUpperCase() : '??';

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900 text-[11px] font-bold tracking-wide text-white ring-2 ring-emerald-900/20 dark:bg-amber-500 dark:text-zinc-950 dark:ring-amber-500/20"
      title={email}
    >
      {initials}
    </div>
  );
}

function Sidebar({ role, onNavigate }) {
  const sections = getNavigation(role);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex flex-col items-center">
        <div className="mx-auto flex h-36 w-full items-center justify-center">
          <img
            src="/logo-bascula-la-esperanza.png"
            alt="BASCULA LA ESPERANZA"
            className="h-full w-auto object-contain drop-shadow-sm"
          />
        </div>
        <div className="mt-1 h-px w-4/5 bg-gradient-to-r from-transparent via-stone-300/80 to-transparent dark:via-zinc-700/60" />
      </div>

      <nav className="mt-3 flex-1 space-y-4 nav-stagger">
        {sections.map((section) => (
          <div key={section.section}>
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-stone-400 dark:text-zinc-600">
              {section.section}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-emerald-900 text-white shadow-md shadow-emerald-900/20 dark:bg-amber-500/90 dark:text-zinc-950 dark:shadow-amber-500/15'
                          : 'text-zinc-600 hover:bg-stone-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                      }`
                    }
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
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
    if (profile.role === 'ADMIN') return 'Supervisión operativa y control';
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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF6F0] via-[#FDF8F0] to-[#F0F7F2] text-zinc-900 dark:from-[#0C0A09] dark:via-[#0C0A09] dark:to-[#0C0A09] dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-[#FAF6F0]/92 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-[#0C0A09]/92">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-2.5">
          <button
            className="rounded-lg border border-stone-300/80 bg-white/70 p-1.5 text-zinc-600 shadow-sm transition hover:bg-stone-100 lg:hidden dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400 dark:text-zinc-500">
              {currentItem?.label || 'Panel operativo'}
            </div>
            {headerContext && (
              <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-500">{headerContext}</div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden rounded-full bg-emerald-900/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900 sm:inline-flex dark:bg-amber-500/10 dark:text-amber-400">
              {profile?.role || user?.role || '-'}
            </span>
            <button
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-stone-200/60 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                applyTheme(next);
                setTheme(next);
              }}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-stone-200/60 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/login', { replace: true });
              }}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
            <UserAvatar email={profile?.email || user?.email} />
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="animate-fade-in fixed inset-0 z-40 bg-black/25 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {mobileOpen && (
        <aside
          className="fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto border-r border-stone-200/80 bg-[#FAF6F0] p-4 shadow-2xl lg:hidden dark:border-zinc-800 dark:bg-[#0C0A09]"
          style={{ animation: 'slide-in-left 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          <div className="mb-3 flex justify-end">
            <button
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-stone-200/60 dark:hover:bg-zinc-800"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú lateral"
            >
              <X size={18} />
            </button>
          </div>
          <Sidebar role={user?.role} onNavigate={() => setMobileOpen(false)} />
        </aside>
      )}

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside
          className="hidden self-start rounded-2xl border border-stone-200/60 bg-white/65 p-3.5 shadow-[0_8px_30px_rgba(120,113,108,0.08)] backdrop-blur-sm lg:block dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          style={{ position: 'sticky', top: '3.75rem' }}
        >
          <Sidebar role={user?.role} />
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
