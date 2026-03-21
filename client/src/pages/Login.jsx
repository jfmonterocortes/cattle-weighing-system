import { ArrowRight, ClipboardList, KeyRound, Scale, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';

const operationalSignals = [
  {
    icon: ClipboardList,
    title: 'Planillas a la mano',
    description: 'Consulta tus planillas y entra rápido al detalle de cada movimiento.',
  },
  {
    icon: Scale,
    title: 'Control del ganado',
    description: 'Lleva seguimiento del pesaje y del historial registrado para tu ganado.',
  },
  {
    icon: Wallet,
    title: 'Pagos y movimientos',
    description: 'Revisa el estado de pago y mantén claridad sobre cada reporte registrado.',
  },
];

function homeForRole(role) {
  if (role === 'CLIENT') return '/planillas';
  return '/dashboard';
}

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resetSuccess = searchParams.get('reset') === 'success';

  const submit = async (event) => {
    event.preventDefault();
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
    <div className="min-h-screen bg-gradient-to-br from-[#FAF6F0] via-[#FDF8F0] to-[#F0F7F2] px-4 py-8 text-zinc-900 dark:from-[#0C0A09] dark:via-[#0A0908] dark:to-[#0C0E0A] dark:text-zinc-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="stagger grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/60 bg-white/80 p-6 shadow-[0_20px_80px_rgba(120,53,15,0.08)] backdrop-blur xl:p-10 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-amber-100/50 via-transparent to-emerald-100/30 dark:from-amber-500/8 dark:to-emerald-500/8" />
            <div className="absolute -right-16 top-24 h-56 w-56 rounded-full bg-amber-200/20 blur-3xl dark:bg-amber-400/5" />
            <div className="absolute -left-8 bottom-20 h-40 w-40 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-400/5" />

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-100/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-900 dark:border-amber-400/15 dark:bg-amber-400/8 dark:text-amber-200">
                  <KeyRound size={13} />
                  Acceso seguro
                </div>

                <div className="flex flex-col gap-4">
                  <div className="mx-auto flex h-48 w-full items-center justify-center">
                    <img src="/logo-bascula-la-esperanza.png" alt="BASCULA LA ESPERANZA" className="h-full w-auto object-contain drop-shadow-sm" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-stone-400 dark:text-zinc-500">Bascula La Esperanza</p>
                    <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl">Tu reporte de ganado, más claro y más fácil de seguir.</h1>
                  </div>
                </div>

                <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  Entra para revisar planillas, pesos, movimientos y pagos desde una vista pensada para consultar tu información sin complicaciones.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200/60 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/40">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400 dark:text-zinc-600">Lo que puedes consultar</div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {operationalSignals.map((item) => {
                    const HighlightIcon = item.icon;

                    return (
                      <div
                        key={item.title}
                        className="group rounded-xl border border-stone-200/60 bg-white/70 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800/60 dark:bg-zinc-950/50"
                      >
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white transition-transform duration-300 group-hover:scale-110 dark:bg-amber-500 dark:text-zinc-950">
                          <HighlightIcon size={17} />
                        </div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h2>
                        <p className="mt-1.5 text-[13px] leading-6 text-zinc-500 dark:text-zinc-400">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-stone-200/60 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-stone-400 dark:text-zinc-500">Inicio de sesión</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Ingresa para ver tu información</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Usa tu correo y tu contraseña para revisar tus reportes, movimientos y pagos registrados.
              </p>
            </div>

            <div className="mb-5 rounded-xl border border-sky-200/60 bg-sky-50/60 p-4 text-[13px] leading-6 text-sky-900 dark:border-sky-500/15 dark:bg-sky-500/8 dark:text-sky-200">
              Si necesitas ayuda con el acceso o con tus datos, comunícate con la báscula para recibir soporte.
            </div>

            <FeedbackBanner
              message={resetSuccess ? 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' : ''}
              type="success"
              className="mb-4"
            />

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Correo</label>
                <input
                  id="login-email"
                  className="w-full rounded-xl border border-stone-300/80 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                  type="email"
                  placeholder="admin@bascula.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Contraseña</label>
                <input
                  id="login-password"
                  className="w-full rounded-xl border border-stone-300/80 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <FeedbackBanner message={error} type="error" />

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-800 hover:shadow-emerald-900/25 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
                disabled={loading}
              >
                <span>{loading ? 'Ingresando...' : 'Ingresar'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-dashed border-stone-300/70 bg-stone-50/60 p-4 text-[13px] leading-6 text-zinc-500 dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:text-zinc-400">
              Si ya recibiste un enlace de restablecimiento, ábrelo desde tu correo para cambiar la contraseña sin entrar primero al sistema.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
