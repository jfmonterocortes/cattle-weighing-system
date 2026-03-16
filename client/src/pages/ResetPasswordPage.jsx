import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const invalidLink = !token;

  const submit = async (event) => {
    event.preventDefault();
    if (!token) {
      setFeedback({ type: 'error', message: 'El enlace de restablecimiento no es valido.' });
      return;
    }

    if (!newPassword) {
      setFeedback({ type: 'error', message: 'Ingresa una nueva contrasena.' });
      return;
    }

    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setNewPassword('');
      navigate('/login?reset=success', { replace: true });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo restablecer la contrasena.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xl font-semibold">Restablecer contrasena</h2>
        <p className="mt-2 text-sm text-zinc-400">Usa el enlace recibido para definir una nueva contrasena y volver a iniciar sesion.</p>

        <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} className="mt-4" />

        {invalidLink ? (
          <div className="mt-4 space-y-4">
            <FeedbackBanner message="El enlace de restablecimiento no es valido o ya no esta disponible." type="error" />
            <Link className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm" to="/login">
              Volver a iniciar sesion
            </Link>
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <div>
              <label className="text-sm text-zinc-300">Nueva contrasena</label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                type="password"
                placeholder="Nueva contrasena"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Actualizando...' : 'Actualizar contrasena'}
              </button>
              <Link className="text-sm text-zinc-400 underline-offset-4 hover:underline" to="/login">
                Volver a login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
