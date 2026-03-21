import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';

const securityNotes = [
  'El token solo se usa para esta solicitud y no se guarda en el navegador.',
  'Al terminar, volverás a login para entrar con tu nueva contraseña.',
];

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
      setFeedback({ type: 'error', message: 'El enlace de restablecimiento no es válido.' });
      return;
    }

    if (!newPassword) {
      setFeedback({ type: 'error', message: 'Ingresa una nueva contraseña.' });
      return;
    }

    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setNewPassword('');
      navigate('/login?reset=success', { replace: true });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo restablecer la contraseña.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF6F0] via-[#FDF8F0] to-[#F0F7F2] px-4 py-8 text-zinc-900 dark:from-[#0C0A09] dark:via-[#0A0908] dark:to-[#0C0E0A] dark:text-zinc-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="stagger grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-emerald-200/50 bg-white/75 p-6 shadow-[0_18px_60px_rgba(16,185,129,0.08)] backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:shadow-[0_24px_72px_rgba(0,0,0,0.35)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/70 bg-emerald-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              <ShieldCheck size={14} />
              Restablecimiento seguro
            </div>

            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">Define una nueva contraseña con tranquilidad.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Este flujo está pensado para abrirse desde el enlace recibido por correo, aún si todavía no has iniciado sesión.
            </p>

            <div className="mt-6 space-y-3">
              {securityNotes.map((note) => (
                <div
                  key={note}
                  className="flex items-start gap-3 rounded-[1.35rem] border border-zinc-200/80 bg-white/80 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
                >
                  <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-white dark:bg-amber-500 dark:text-zinc-950">
                    <CheckCircle2 size={16} />
                  </div>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-stone-200/60 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-900/70 dark:shadow-[0_24px_72px_rgba(0,0,0,0.35)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">Nueva credencial</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Restablecer contraseña</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Ingresa una contraseña nueva para recuperar el acceso y continuar normalmente.
                </p>
              </div>

              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-900 text-white dark:bg-amber-500 dark:text-zinc-950">
                <KeyRound size={20} />
              </div>
            </div>

            <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} className="mb-4" />

            {invalidLink ? (
              <div className="space-y-4">
                <FeedbackBanner message="El enlace de restablecimiento no es válido o ya no está disponible." type="error" />
                <Link
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-950/80"
                  to="/login"
                >
                  <ArrowLeft size={16} />
                  Volver a iniciar sesión
                </Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-1.5">
                  <label htmlFor="reset-new-password" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Nueva contraseña</label>
                  <input
                    id="reset-new-password"
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                    type="password"
                    placeholder="Nueva contraseña"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
                    disabled={loading}
                    type="submit"
                  >
                    <span>{loading ? 'Actualizando...' : 'Actualizar contraseña'}</span>
                    {!loading && <CheckCircle2 size={16} />}
                  </button>

                  <Link
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-950/80"
                    to="/login"
                  >
                    <ArrowLeft size={16} />
                    Volver a login
                  </Link>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
