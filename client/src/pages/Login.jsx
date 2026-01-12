import { useState } from "react";
import { api } from "../api";
// Optional icons
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
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-zinc-100 flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/25 via-fuchsia-600/20 to-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/35 p-7 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              Secure access
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Sign in
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Access your sheets and cattle records.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm text-zinc-300">Email</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 focus-within:border-zinc-600">
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
              <label className="text-sm text-zinc-300">Password</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 focus-within:border-zinc-600">
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
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="group w-full rounded-2xl bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-indigo-500/10 hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-xs text-zinc-500">
              Tip: try admin@bascula.com / Admin123!
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}