import { useEffect, useMemo, useState } from 'react';
import Login from './pages/Login';
import MySheets from './pages/MySheets';
import SheetDetail from './pages/SheetDetail';
import { parseJwt } from './utils/jwt';
import { applyTheme, initTheme } from './utils/theme';

export default function App() {
  const [view, setView] = useState('list');
  const [sheetId, setSheetId] = useState(null);
  const [theme, setTheme] = useState('dark');

  const token = localStorage.getItem('token');
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);

  useEffect(() => {
    setTheme(initTheme());
  }, []);

  if (!token) {
    return <Login onLogin={() => setView('list')} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Sistema de Pesaje de Ganado</h1>
            <p className="text-sm text-zinc-400">Operación de planillas, pagos, auditoría y exportes.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">Rol: {payload?.role || '-'}</span>
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
                window.location.reload();
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {view === 'detail' ? (
          <SheetDetail sheetId={sheetId} onBack={() => setView('list')} />
        ) : (
          <MySheets
            onOpen={(id) => {
              setSheetId(id);
              setView('detail');
            }}
          />
        )}
      </div>
    </div>
  );
}


