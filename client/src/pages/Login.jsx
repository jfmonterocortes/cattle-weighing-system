import { ArrowRight, KeyRound, Scale, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';

const highlights = [
  {
    icon: Scale,
    title: 'Operacion ordenada',
    description: 'Captura, consulta y exporta cada planilla con una vista pensada para el trabajo diario.',
  },
  {
    icon: ShieldCheck,
    title: 'Acceso por rol',
    description: 'ADMIN, LIQUIDADOR y CLIENT reciben acceso segun la funcion que cumplen dentro de la operacion.',
  },
  {
    icon: Users,
    title: 'Seguimiento confiable',
    description: 'Vinculaciones, pagos y movimientos quedan visibles para mantener confianza y trazabilidad.',
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
      setError(err?.response?.data?.message || 'No fue posible iniciar sesion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 px-4 py-8 text-zinc-900 dark:from-[#140f08] dark:via-zinc-950 dark:to-[#0d1711] dark:text-zinc-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/80 bg-white/85 p-6 shadow-[0_20px_80px_rgba(120,53,15,0.12)] backdrop-blur xl:p-10 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-br from-amber-200/60 via-transparent to-emerald-200/40 dark:from-amber-500/10 dark:to-emerald-500/10" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                  <KeyRound size={14} />
                  Acceso seguro
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-zinc-200/80 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
                    <img src="/logo-bascula-la-esperanza.png" alt="BASCULA LA ESPERANZA" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">Bascula La Esperanza</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Acceso al centro operativo de la bascula.</h1>
                  </div>
                </div>

                <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                  Entra con la cuenta entregada por la operacion o por el administrador para revisar planillas, pagos y vinculaciones sin perder el ritmo del trabajo diario.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {highlights.map((item) => {
                  const HighlightIcon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[1.5rem] border border-zinc-200/80 bg-white/80 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-950/60"
                    >
                      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                        <HighlightIcon size={18} />
                      </div>
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">Inicio de sesion</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Ingresa con tu cuenta operativa</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Usa el correo y la contrasena asignados por la operacion para entrar al flujo que corresponde a tu rol.
              </p>
            </div>

            <FeedbackBanner
              message={resetSuccess ? 'Contrasena restablecida correctamente. Ya puedes iniciar sesion.' : ''}
              type="success"
              className="mb-4"
            />

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Correo</label>
                <input
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                  type="email"
                  placeholder="admin@bascula.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Contrasena</label>
                <input
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <FeedbackBanner message={error} type="error" />

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                disabled={loading}
              >
                <span>{loading ? 'Ingresando...' : 'Ingresar'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300/90 bg-zinc-50/90 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-400">
              Si ya recibiste un enlace de restablecimiento, abrelo desde tu correo para cambiar la contrasena sin entrar primero al sistema.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
