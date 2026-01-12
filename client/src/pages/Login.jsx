import { useState } from "react";
import { api } from "../api";
import { Lock, Mail } from "lucide-react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      onLogin();
    } catch {
      setError("Correo o contraseña inválidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#070A10] dark:text-zinc-100 flex items-center justify-center px-4">
      {/* Glow solo en dark */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden dark:block hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/25 via-fuchsia-600/20 to-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-zinc-200 bg-white/80 p-7 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/35 dark:shadow-2xl dark:shadow-black/40">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
              Acceso seguro
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Iniciar sesión
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Accede a tus planillas y registros de reses.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Correo</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60 dark:focus-within:border-zinc-600">
                <Mail size={16} className="text-zinc-400" />
                <input
                  className="w-full bg-transparent outline-none text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bascula.com"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Contraseña</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60 dark:focus-within:border-zinc-600">
                <Lock size={16} className="text-zinc-400" />
                <input
                  className="w-full bg-transparent outline-none text-sm"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-xs text-zinc-500">
              Tip: admin@bascula.com / Admin123!
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
