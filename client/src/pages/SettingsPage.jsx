import { ArrowRight, KeyRound, Link2, Phone, ShieldCheck, SlidersHorizontal, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PersonAutocomplete from '../components/PersonAutocomplete';
import FeedbackBanner from '../components/FeedbackBanner';
import { getSession } from '../utils/authSession';
import { formatRole } from '../utils/format';

const ONE_TIME_MSG =
  'Tu solicitud de vinculación ya fue utilizada. Si necesitas hacer una corrección, por favor comunícate con atención al cliente o con el administrador.';

const toneStyles = {
  amber: {
    shell: 'border-amber-200/80 bg-white/90 shadow-[0_18px_50px_rgba(146,64,14,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_22px_60px_rgba(0,0,0,0.38)]',
    icon: 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-100',
    eyebrow: 'text-amber-800 dark:text-amber-200',
  },
  emerald: {
    shell: 'border-emerald-200/80 bg-white/90 shadow-[0_18px_50px_rgba(5,150,105,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_22px_60px_rgba(0,0,0,0.38)]',
    icon: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-100',
    eyebrow: 'text-emerald-800 dark:text-emerald-200',
  },
  blue: {
    shell: 'border-sky-200/80 bg-white/90 shadow-[0_18px_50px_rgba(2,132,199,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_22px_60px_rgba(0,0,0,0.38)]',
    icon: 'bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-100',
    eyebrow: 'text-sky-800 dark:text-sky-200',
  },
};

function StatusChip({ children, tone = 'neutral' }) {
  // Chips render inside dark forest hero — use glass styles
  const byTone = {
    neutral: 'border-white/15 bg-white/10 text-white/80',
    success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    warning: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    info:    'border-sky-400/20 bg-sky-500/12 text-sky-200',
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${byTone[tone] || byTone.neutral}`}>
      {children}
    </span>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/8 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SectionCard({ icon, eyebrow, title, description, tone = 'amber', className = '', children }) {
  const palette = toneStyles[tone] || toneStyles.amber;
  const SectionIcon = icon;

  return (
    <section className={`rounded-[1.85rem] border p-6 ${palette.shell} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-medium uppercase tracking-[0.22em] ${palette.eyebrow}`}>{eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>
        <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${palette.icon}`}>
          <SectionIcon size={20} />
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { user } = getSession();
  const [settings, setSettings] = useState(null);
  const [clientLink, setClientLink] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [priceInput, setPriceInput] = useState('5000');
  const [clientProfileForm, setClientProfileForm] = useState({ phone: '', cedula: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const { activeRole } = getSession();
  const isAdmin = activeRole === 'ADMIN';
  const isClient = activeRole === 'CLIENT';

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadError('');

      try {
        const res = await api.get('/settings');
        if (cancelled) return;

        setSettings(res.data);
        setPriceInput(String(res.data?.defaultPricePerHead || 5000));
        setClientProfileForm({
          phone: res.data?.profile?.person?.phone || '',
          cedula: res.data?.profile?.person?.cedula || '',
        });
      } catch (error) {
        if (cancelled) return;

        setSettings(null);
        setClientLink(null);
        setLoadError(error.response?.data?.message || 'No se pudo cargar configuración.');
        return;
      }

      if (!isClient) {
        if (!cancelled) {
          setClientLink(null);
        }
        return;
      }

      try {
        const linkRes = await api.get('/link-requests/me');
        if (cancelled) return;
        setClientLink(linkRes.data);
      } catch (error) {
        if (cancelled) return;
        setClientLink(null);
        setLoadError(error.response?.data?.message || 'No se pudo cargar estado de vinculación.');
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isClient, reloadKey]);

  const reloadSettings = () => {
    setReloadKey((value) => value + 1);
  };

  const updateGlobalPrice = async () => {
    try {
      await api.patch('/settings', { defaultPricePerHead: Number(priceInput) });
      setFeedback({ type: 'success', message: 'Precio global actualizado.' });
      reloadSettings();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar el precio global.' });
    }
  };

  const submitLinkRequest = async () => {
    if (!selectedPerson?.id) {
      setFeedback({ type: 'error', message: 'Selecciona una persona para solicitar vinculación.' });
      return;
    }

    try {
      await api.post('/link-requests', { personId: selectedPerson.id, notes: 'Solicitud enviada desde Configuración' });
      setFeedback({ type: 'success', message: 'Solicitud de vinculación enviada.' });
      setSelectedPerson(null);
      reloadSettings();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo enviar la solicitud.' });
    }
  };

  const submitClientProfile = async () => {
    try {
      await api.patch('/settings/profile', {
        phone: clientProfileForm.phone,
        cedula: clientProfileForm.cedula,
      });
      setFeedback({ type: 'success', message: 'Teléfono y cédula actualizados.' });
      reloadSettings();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar el perfil.' });
    }
  };

  const submitOwnPassword = async () => {
    try {
      await api.patch('/settings/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setFeedback({ type: 'success', message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar la contraseña.' });
    }
  };

  const clientLinked = Boolean(settings?.profile?.personId);
  const linkedTone = clientLinked ? 'success' : isClient ? 'warning' : 'info';
  const linkedLabel = clientLinked ? 'Cuenta vinculada' : isClient ? 'Cuenta por vincular' : 'Acceso operativo';

  return (
    <div className="space-y-6 stagger">
      <section className="relative overflow-hidden rounded-2xl bg-[#1C3A22] shadow-[0_8px_40px_rgba(28,58,34,0.30)] dark:bg-[#162d1b] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        {/* Amber left accent bar */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-amber-400/70 via-amber-500/50 to-transparent" />

        {/* Background decorations */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/6 blur-[60px]" />
        <svg className="pointer-events-none absolute right-0 top-0 h-full w-56 opacity-[0.025]" aria-hidden="true">
          <defs>
            <pattern id="dots-account" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-account)" />
        </svg>

        {/* Top: monogram + content + button */}
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center xl:p-8">
          {/* Monogram */}
          <div className="shrink-0">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-500/70 bg-white/4">
              <span className="font-display text-2xl font-bold text-amber-400">
                {(settings?.profile?.person?.name || settings?.profile?.email || 'C')[0].toUpperCase()}
              </span>
              <div className={`absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full border-2 border-[#1C3A22] ${settings?.profile?.isActive !== false ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
            </div>
          </div>

          {/* Identity text */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.26em] text-white/45">
                <Sparkles size={10} />
                Mi cuenta
              </div>
              {!isClient && <StatusChip tone="info">{formatRole(settings?.profile?.role || user?.role)}</StatusChip>}
            </div>
            <h1 className="mt-2.5 font-display text-3xl font-semibold tracking-tight text-white xl:text-4xl">Mi cuenta</h1>
            <p className="mt-1 text-sm text-white/50">Actualiza tu contraseña, datos de contacto y vinculación.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip tone={linkedTone}>{linkedLabel}</StatusChip>
              <StatusChip tone={settings?.profile?.isActive === false ? 'warning' : 'success'}>
                {settings?.profile?.isActive === false ? 'Cuenta inactiva' : 'Cuenta activa'}
              </StatusChip>
            </div>
          </div>

          {/* Back button */}
          {isClient && (
            <Link
              to="/planillas"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/15 bg-white/6 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/12 hover:text-white/90"
            >
              Volver a mis planillas
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Bottom strip */}
        {settings?.profile && (
          <div className={`relative grid divide-y divide-white/10 border-t border-white/10 bg-black/25 sm:divide-x sm:divide-y-0 ${!isClient ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <div className="px-6 py-4 xl:px-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Correo</div>
              <div className="mt-1.5 truncate text-sm font-semibold text-white">{settings.profile.email}</div>
            </div>
            <div className="px-6 py-4 xl:px-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Persona vinculada</div>
              <div className="mt-1.5 text-sm font-semibold text-white">{settings.profile.person ? settings.profile.person.name : 'Sin vínculo'}</div>
            </div>
            <div className="px-6 py-4 xl:px-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Estado</div>
              <div className={`mt-1.5 text-sm font-semibold ${settings.profile.isActive ? 'text-emerald-300' : 'text-amber-300'}`}>
                {settings.profile.isActive ? 'Activo' : 'Inactivo'}
              </div>
            </div>
            {!isClient && (
              <div className="px-6 py-4 xl:px-8">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Rol operativo</div>
                <div className="mt-1.5 text-sm font-semibold text-white">{formatRole(settings.profile.role)}</div>
              </div>
            )}
          </div>
        )}
      </section>

      <FeedbackBanner message={loadError} type="error" />
      <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} />

      {isAdmin && (
        <SectionCard
          icon={SlidersHorizontal}
          eyebrow="Configuración"
          title="Precio base por cabeza"
          tone="amber"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label htmlFor="global-price" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Precio global por cabeza</label>
              <input
                id="global-price"
                className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                type="number"
                min="0"
                value={priceInput}
                onChange={(event) => setPriceInput(event.target.value)}
              />
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
              onClick={updateGlobalPrice}
            >
              Guardar
            </button>
          </div>
        </SectionCard>
      )}

      {isClient && (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            icon={Phone}
            eyebrow="Datos personales"
            title="Datos de contacto"
            description="Solo disponible cuando la cuenta esté vinculada."
            tone="emerald"
          >
            {!clientLinked && (
              <FeedbackBanner
                type="warning"
                className="mb-4"
                message="Debes vincular tu cuenta a una persona antes de actualizar teléfono o cédula."
              />
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                placeholder="Teléfono"
                value={clientProfileForm.phone}
                disabled={!clientLinked}
                onChange={(event) => setClientProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <input
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                placeholder="Cédula"
                value={clientProfileForm.cedula}
                disabled={!clientLinked}
                onChange={(event) => setClientProfileForm((prev) => ({ ...prev, cedula: event.target.value }))}
              />
            </div>

            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
              onClick={submitClientProfile}
              disabled={!clientLinked}
            >
              Guardar datos
            </button>
          </SectionCard>

          <SectionCard
            icon={KeyRound}
            eyebrow="Seguridad"
            title="Cambiar contraseña"
            description="Ingresa la contraseña actual y la nueva para actualizarla."
            tone="blue"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                type="password"
                placeholder="Contraseña actual"
                aria-label="Contraseña actual"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              />
              <input
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                type="password"
                placeholder="Nueva contraseña"
                aria-label="Nueva contraseña"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              />
            </div>

            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 sm:w-auto dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
              onClick={submitOwnPassword}
            >
              Actualizar contraseña
            </button>
          </SectionCard>

          <SectionCard
            icon={Link2}
            eyebrow="Vinculación"
            title="Vincular cuenta"
            description="Busca tu nombre en el directorio y solicita la vinculación."
            tone="amber"
            className="xl:col-span-2"
          >
            <div className="space-y-4">
              {clientLink?.linkedPerson && (
                <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Cuenta vinculada</p>
                      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{clientLink.linkedPerson.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {clientLink?.used && <FeedbackBanner type="warning" message={ONE_TIME_MSG} />}

              {!clientLink?.used && !clientLink?.linkedPerson && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div className="space-y-3">
                    <PersonAutocomplete label="Buscar persona existente" value={selectedPerson} onSelect={setSelectedPerson} minQueryLength={3} />
                    {selectedPerson?.id && (
                      <div className="rounded-[1.25rem] border border-zinc-200 bg-white/80 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200">
                        Seleccionada: <span className="font-semibold">{selectedPerson.name}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
                    onClick={submitLinkRequest}
                  >
                    Enviar solicitud
                  </button>
                </div>
              )}

              {clientLink?.latestRequest && (
                <div className="rounded-[1.25rem] border border-zinc-200 bg-white/80 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200">
                  Estado actual: <span className="font-semibold">{{ PENDING: 'Pendiente de revisión', APPROVED: 'Aprobada', REJECTED: 'Rechazada' }[clientLink.latestRequest.status] ?? clientLink.latestRequest.status}</span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {!isAdmin && !isClient && settings?.profile && (
        <SectionCard
          icon={UserRound}
          eyebrow="Mi cuenta"
          title="Resumen de cuenta"
          tone="blue"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Correo" value={settings.profile.email} />
            {!isClient && <DetailCard label="Rol" value={formatRole(settings.profile.role)} />}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
