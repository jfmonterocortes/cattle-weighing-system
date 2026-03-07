import { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      onLogin?.(res.data.user || null);
    } catch {
      setError('Correo o contraseña inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-7 shadow-xl">
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-zinc-400">Accede a planillas y registros operativos.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="text-sm text-zinc-300">Correo</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="admin@bascula.com"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">Contraseña</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-500"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-700/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-zinc-200 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-xs text-zinc-500">Demo: admin@bascula.com / Admin123!</p>
        </form>
      </div>
    </div>
  );
}



