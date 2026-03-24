import { ArrowRight, KeyRound, Link2, Phone, ShieldCheck, SlidersHorizontal, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PersonAutocomplete from '../components/PersonAutocomplete';
import FeedbackBanner from '../components/FeedbackBanner';
import { getSession } from '../utils/authSession';

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

  const isAdmin = user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT';

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
      <section className="overflow-hidden rounded-2xl bg-[#1C3A22] p-6 shadow-[0_8px_40px_rgba(28,58,34,0.30)] dark:bg-[#162d1b] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
              <Sparkles size={13} />
              Mi cuenta
            </div>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-white">Administra tu cuenta sin perder el contexto operativo.</h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Este espacio queda para mantenimiento de cuenta, seguridad y vinculación. El seguimiento diario de planillas sigue concentrado en la vista principal.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusChip tone="info">Rol: {settings?.profile?.role || user?.role || '-'}</StatusChip>
              <StatusChip tone={linkedTone}>{linkedLabel}</StatusChip>
              <StatusChip tone={settings?.profile?.isActive === false ? 'warning' : 'success'}>
                {settings?.profile?.isActive === false ? 'Cuenta inactiva' : 'Cuenta activa'}
              </StatusChip>
            </div>
          </div>

            {settings?.profile && (
              <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
                <DetailCard label="Correo" value={settings.profile.email} />
                <DetailCard label="Persona vinculada" value={settings.profile.person ? settings.profile.person.name : 'Sin vinculo'} />
                <DetailCard label="Estado" value={settings.profile.isActive ? 'Activo' : 'Inactivo'} />
                <DetailCard label="Rol operativo" value={settings.profile.role} />
              </div>
            )}
          </div>

          {isClient && (
            <div className="mt-4 flex xl:mt-0 xl:justify-end">
              <Link
                to="/planillas"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/15"
              >
                Volver a mis planillas
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>

      <FeedbackBanner message={loadError} type="error" />
      <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} />

      {isAdmin && (
        <SectionCard
          icon={SlidersHorizontal}
          eyebrow="Parámetros globales"
          title="Configuración del sistema"
          description="Ajusta el precio base por cabeza sin salir del panel de administración."
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
            description="Actualiza teléfono y cédula cuando tu cuenta ya esté correctamente vinculada."
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
            description="Actualiza tu acceso con una nueva contraseña manteniendo la validación de la contraseña actual."
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
            eyebrow="Relacion con tu persona"
            title="Vinculación de cuenta"
            description="Busca una persona existente, revisa el estado de tu solicitud y mantén el proceso claro en todo momento."
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
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Cuenta vinculada con exito</p>
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
                        Seleccionada: <span className="font-semibold">{selectedPerson.name}</span> (ID {selectedPerson.id})
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
                  Estado actual: <span className="font-semibold">{clientLink.latestRequest.status}</span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {!isAdmin && !isClient && settings?.profile && (
        <SectionCard
          icon={UserRound}
          eyebrow="Perfil operativo"
          title="Resumen de cuenta"
          description="Tu panel ya muestra el estado principal de tu cuenta. Aquí mantendremos futuras opciones específicas de este rol."
          tone="blue"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Correo" value={settings.profile.email} />
            <DetailCard label="Rol" value={settings.profile.role} />
          </div>
        </SectionCard>
      )}
    </div>
  );
}
