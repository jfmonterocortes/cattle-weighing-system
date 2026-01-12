import { useMemo, useState } from "react";
import Login from "./pages/Login";
import MySheets from "./pages/MySheets";
import SheetDetail from "./pages/SheetDetail";
import { parseJwt } from "./utils/jwt";

export default function App() {
  const [view, setView] = useState("list");
  const [sheetId, setSheetId] = useState(null);

  const token = localStorage.getItem("token");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const role = payload?.role ?? "—";

  if (!token) return <Login onLogin={() => setView("list")} />;

  return (
    <div className="min-h-screen bg-[#070A10] text-zinc-100">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/25 via-fuchsia-600/20 to-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10">
        {/* Top bar */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Cattle Weighing System
            </h1>
            <p className="text-sm text-zinc-400">
              Weighing sheets, cattle records, totals & averages.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300">
              Role: <span className="font-semibold text-zinc-100">{role}</span>
            </span>

            <button
              onClick={() => {
                localStorage.removeItem("token");
                window.location.reload();
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-sm hover:bg-zinc-900"
            >
              Logout
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

        <div className="mt-10 text-xs text-zinc-500">
          Built with React + Tailwind + Express + Prisma + PostgreSQL
        </div>
      </div>
    </div>
  );
}
