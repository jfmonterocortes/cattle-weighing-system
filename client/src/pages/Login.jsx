import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';

function homeForRole(role) {
  if (role === 'CLIENT') return '/planillas';
  return '/dashboard';
}

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      onLogin?.(res.data.user || null);
      navigate(homeForRole(res.data?.user?.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center">
            <img src="/logo-bascula-la-esperanza.png" alt="BASCULA LA ESPERANZA" className="max-h-full max-w-full object-contain" />
          </div>
          <h2 className="mt-2 text-xl font-semibold">Iniciar sesión</h2>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="text-sm text-zinc-300">Correo</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              type="email"
              placeholder="admin@bascula.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">Contraseña</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <FeedbackBanner message={error} type='error' />

          <button className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
