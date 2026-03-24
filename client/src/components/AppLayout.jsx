import {
  ChevronDown,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { parseJwt } from '../utils/jwt';
import { applyTheme, initTheme } from '../utils/theme';
import { formatRole } from '../utils/format';
import { getAvailableRoles, setActiveRole } from '../utils/authSession';

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
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C3A22] text-[11px] font-bold tracking-wide text-white ring-2 ring-[#1C3A22]/15 dark:bg-amber-500 dark:text-[#1C3A22] dark:ring-amber-500/20"
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
            className="h-full w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
          />
        </div>
        <div className="mt-1 h-px w-4/5 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      <nav className="mt-3 flex-1 space-y-4 nav-stagger">
        {sections.map((section) => (
          <div key={section.section}>
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">
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
                          ? 'bg-amber-500 text-[#1C3A22] shadow-md shadow-amber-500/20 font-semibold'
                          : 'text-white/60 hover:bg-white/8 hover:text-white/90'
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

  const [activeRole, setActiveRoleState] = useState(() => {
    if (!token) return null;
    const u = parseJwt(token);
    if (!u) return null;
    const stored = localStorage.getItem('activeRole');
    const available = getAvailableRoles(u.role);
    return stored && available.includes(stored) ? stored : u.role;
  });

  const availableRoles = useMemo(() => (user ? getAvailableRoles(user.role) : []), [user]);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef(null);

  const currentItem = useMemo(() => findCurrentItem(activeRole, location.pathname), [location.pathname, activeRole]);

  const headerContext = useMemo(() => {
    if (!profile) return '';
    if (activeRole === 'CLIENT' && profile.person?.name) return `Persona vinculada: ${profile.person.name}`;
    if (activeRole === 'LIQUIDADOR' && profile.liquidadorAlias) return `Alias operativo: ${profile.liquidadorAlias}`;
    if (activeRole === 'ADMIN') return 'Supervisión operativa y control';
    return profile.email || '';
  }, [profile, activeRole]);

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

  useEffect(() => {
    const handleOutside = (e) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target)) setRoleMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const switchRole = (newRole) => {
    setActiveRole(newRole);
    setActiveRoleState(newRole);
    setRoleMenuOpen(false);
    window.location.href = newRole === 'CLIENT' ? '/planillas' : '/dashboard';
  };

  return (
    <div className="min-h-screen bg-[#EDE4CA] text-zinc-900 dark:bg-[#0D1810] dark:text-zinc-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[#1C3A22] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:bg-amber-500 dark:focus:text-[#1C3A22]"
      >
        Saltar al contenido principal
      </a>
      <header className="sticky top-0 z-30 border-b border-stone-300/50 bg-[#EDE4CA]/92 backdrop-blur-xl dark:border-white/5 dark:bg-[#0D1810]/92">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-2.5">
          <button
            className="rounded-lg border border-stone-300/70 bg-stone-100/80 p-1.5 text-zinc-600 shadow-sm transition hover:bg-stone-200/80 lg:hidden dark:border-white/8 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
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
            {availableRoles.length > 1 ? (
              <div ref={roleMenuRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setRoleMenuOpen((v) => !v)}
                  aria-expanded={roleMenuOpen}
                  aria-haspopup="listbox"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1C3A22]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1C3A22] transition hover:bg-[#1C3A22]/20 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                >
                  {formatRole(activeRole)}
                  <ChevronDown size={11} aria-hidden="true" className={`transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {roleMenuOpen && (
                  <div
                    role="listbox"
                    aria-label="Cambiar rol activo"
                    className="absolute right-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {availableRoles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="option"
                        aria-selected={r === activeRole}
                        onMouseDown={(e) => { e.preventDefault(); switchRole(r); }}
                        className={`w-full px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition ${r === activeRole ? 'bg-[#1C3A22]/8 text-[#1C3A22] dark:bg-amber-500/10 dark:text-amber-400' : 'text-zinc-600 hover:bg-stone-50 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
                      >
                        {formatRole(r)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              activeRole !== 'CLIENT' && (
                <span className="hidden rounded-full bg-[#1C3A22]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1C3A22] sm:inline-flex dark:bg-amber-500/10 dark:text-amber-400">
                  {formatRole(activeRole)}
                </span>
              )
            )}
            <button
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-stone-300/50 hover:text-zinc-800 dark:text-zinc-500 dark:hover:bg-white/8 dark:hover:text-zinc-300"
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
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-stone-300/50 hover:text-zinc-800 dark:text-zinc-500 dark:hover:bg-white/8 dark:hover:text-zinc-300"
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
          className="fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto bg-[#1C3A22] p-4 shadow-2xl lg:hidden"
          style={{ animation: 'slide-in-left 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          <div className="mb-3 flex justify-end">
            <button
              className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú lateral"
            >
              <X size={18} />
            </button>
          </div>
          <Sidebar role={activeRole} onNavigate={() => setMobileOpen(false)} />
        </aside>
      )}

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside
          className="hidden self-start rounded-2xl bg-[#1C3A22] p-3.5 shadow-[0_8px_40px_rgba(28,58,34,0.28)] lg:block dark:bg-[#162d1b] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
          style={{ position: 'sticky', top: '3.75rem' }}
        >
          <Sidebar role={activeRole} />
        </aside>

        <main id="main-content" className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
