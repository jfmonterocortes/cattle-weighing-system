import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';

const inputClass =
  'w-full rounded-xl border border-stone-300/80 bg-white/80 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/12 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-amber-500 dark:focus:ring-amber-500/10 dark:placeholder:text-white/25';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', { email: form.email, password: form.password });
      navigate('/login?registered=1', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message;
      setError(msg || 'No fue posible crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EDE4CA] px-4 py-8 text-zinc-900 dark:bg-[#0D1810] dark:text-zinc-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <div className="w-full">
          <section className="rounded-[1.75rem] border border-stone-300/60 bg-[#F5EDD6] p-6 shadow-[0_18px_50px_rgba(28,58,34,0.10)] dark:border-white/6 dark:bg-[#162d1b]">
            <div className="mb-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 transition hover:text-stone-700 dark:text-white/40 dark:hover:text-white/70"
              >
                <ArrowLeft size={13} aria-hidden="true" />
                Volver al inicio de sesión
              </Link>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#1C3A22]/15 bg-[#1C3A22]/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#1C3A22] dark:border-white/10 dark:bg-white/5 dark:text-white/50">
                <KeyRound size={11} />
                Nueva cuenta
              </div>

              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Crea tu cuenta</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-white/50">
                Una vez creada, el administrador vinculará tu cuenta con tus registros.
              </p>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-white/40">
                  Correo electrónico
                </label>
                <input
                  id="reg-email"
                  className={inputClass}
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-white/40">
                  Contraseña
                </label>
                <input
                  id="reg-password"
                  className={inputClass}
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                  autoComplete="new-password"
                />
                <p className="text-[11px] leading-5 text-stone-400 dark:text-white/30">
                  Mínimo 8 caracteres, una mayúscula, una minúscula y un número.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-white/40">
                  Confirmar contraseña
                </label>
                <input
                  id="reg-confirm"
                  className={inputClass}
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={set('confirm')}
                  required
                  autoComplete="new-password"
                />
              </div>

              <FeedbackBanner message={error} type="error" />

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C3A22] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1C3A22]/20 transition-all hover:bg-[#234d2c] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-[#1C3A22] dark:shadow-amber-500/15 dark:hover:bg-amber-400"
                disabled={loading}
              >
                <span>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</span>
                {!loading && <ArrowRight size={16} aria-hidden="true" />}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
