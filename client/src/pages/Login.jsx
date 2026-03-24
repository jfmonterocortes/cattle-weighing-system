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
    <div className="min-h-screen bg-[#EDE4CA] px-4 py-8 text-zinc-900 dark:bg-[#0D1810] dark:text-zinc-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="stagger grid w-full gap-5 lg:grid-cols-[1.15fr_0.85fr]">

          {/* ── Brand panel (dark forest green) ── */}
          <section className="relative overflow-hidden rounded-[1.75rem] bg-[#1C3A22] p-6 shadow-[0_24px_80px_rgba(28,58,34,0.4)] xl:p-10">
            {/* Soft radial highlights */}
            <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-white/[0.04] blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-10 h-60 w-60 rounded-full bg-amber-500/8 blur-3xl" />

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
                  <KeyRound size={13} />
                  Acceso seguro
                </div>

                <div className="flex flex-col gap-4">
                  <div className="mx-auto flex h-44 w-full items-center justify-center">
                    <img
                      src="/logo-bascula-la-esperanza.png"
                      alt="BASCULA LA ESPERANZA"
                      className="h-full w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/35">Bascula La Esperanza</p>
                    <h1 className="mt-3 font-display text-4xl font-light leading-[1.2] tracking-tight text-white sm:text-5xl">
                      Tu reporte de ganado, más claro y más fácil de seguir.
                    </h1>
                  </div>
                </div>

                <p className="max-w-2xl text-sm leading-7 text-white/55">
                  Entra para revisar planillas, pesos, movimientos y pagos desde una vista pensada para consultar tu información sin complicaciones.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Lo que puedes consultar</div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {operationalSignals.map((item) => {
                    const HighlightIcon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="group rounded-xl border border-white/8 bg-white/5 p-4 transition-all duration-300 hover:bg-white/10"
                      >
                        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-[#1C3A22] transition-transform duration-300 group-hover:scale-110">
                          <HighlightIcon size={16} />
                        </div>
                        <h2 className="text-sm font-semibold text-white/90">{item.title}</h2>
                        <p className="mt-1.5 text-[13px] leading-6 text-white/50">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ── Login form panel (parchment) ── */}
          <section className="rounded-[1.75rem] border border-stone-300/60 bg-[#F5EDD6] p-6 shadow-[0_18px_50px_rgba(28,58,34,0.10)] dark:border-white/6 dark:bg-[#162d1b]">
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-stone-500 dark:text-white/35">Inicio de sesión</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Ingresa para ver tu información</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-white/50">
                Usa tu correo y tu contraseña para revisar tus reportes, movimientos y pagos registrados.
              </p>
            </div>

            <div className="mb-5 rounded-xl border border-stone-300/70 bg-stone-200/50 p-4 text-[13px] leading-6 text-stone-700 dark:border-white/8 dark:bg-white/5 dark:text-white/50">
              Si necesitas ayuda con el acceso o con tus datos, comunícate con la báscula para recibir soporte.
            </div>

            <FeedbackBanner
              message={resetSuccess ? 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' : ''}
              type="success"
              className="mb-4"
            />

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-white/40">Correo</label>
                <input
                  id="login-email"
                  className="w-full rounded-xl border border-stone-300/80 bg-white/80 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/12 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-amber-500 dark:focus:ring-amber-500/10 dark:placeholder:text-white/25"
                  type="email"
                  placeholder="admin@bascula.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-white/40">Contraseña</label>
                <input
                  id="login-password"
                  className="w-full rounded-xl border border-stone-300/80 bg-white/80 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/12 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-amber-500 dark:focus:ring-amber-500/10 dark:placeholder:text-white/25"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <FeedbackBanner message={error} type="error" />

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C3A22] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1C3A22]/20 transition-all hover:bg-[#234d2c] hover:shadow-[#1C3A22]/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-[#1C3A22] dark:shadow-amber-500/15 dark:hover:bg-amber-400"
                disabled={loading}
              >
                <span>{loading ? 'Ingresando...' : 'Ingresar'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-dashed border-stone-300/80 bg-stone-100/50 p-4 text-[13px] leading-6 text-stone-500 dark:border-white/8 dark:bg-white/4 dark:text-white/35">
              Si ya recibiste un enlace de restablecimiento, ábrelo desde tu correo para cambiar la contraseña sin entrar primero al sistema.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
