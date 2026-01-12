import { useEffect, useMemo, useState } from "react";
import Login from "./pages/Login";
import MySheets from "./pages/MySheets";
import SheetDetail from "./pages/SheetDetail";
import { parseJwt } from "./utils/jwt";
import { applyTheme, initTheme } from "./utils/theme";
import { Moon, Sun } from "lucide-react";

export default function App() {
  const [view, setView] = useState("list");
  const [sheetId, setSheetId] = useState(null);
  const [theme, setTheme] = useState("dark");

  const token = localStorage.getItem("token");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const rol = payload?.role ?? "—";

  useEffect(() => {
    const t = initTheme();
    setTheme(t);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  if (!token) return <Login onLogin={() => setView("list")} />;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Glow solo en dark */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden dark:block hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/25 via-fuchsia-600/20 to-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10">
        {/* Top bar */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Sistema de Pesaje de Ganado
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Planillas, reses, totales y promedios.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
              Rol: <span className="font-semibold dark:text-zinc-100">{rol}</span>
            </span>

            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/70 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
              title="Cambiar tema"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Claro" : "Oscuro"}
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("token");
                window.location.reload();
              }}
              className="rounded-xl border border-zinc-200 bg-white/70 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {view === "detail" ? (
          <SheetDetail sheetId={sheetId} onBack={() => setView("list")} />
        ) : (
          <MySheets
            onOpen={(id) => {
              setSheetId(id);
              setView("detail");
            }}
          />
        )}

      </div>
    </div>
  );
}
