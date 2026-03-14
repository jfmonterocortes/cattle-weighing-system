import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import PersonAutocomplete from '../components/PersonAutocomplete';
import FeedbackBanner from '../components/FeedbackBanner';
import { getSession } from '../utils/authSession';

const ONE_TIME_MSG =
  'Tu solicitud de vinculación ya fue utilizada. Si necesitas hacer una corrección, por favor comunícate con atención al cliente o con el administrador.';

export default function SettingsPage() {
  const { user } = getSession();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken') || '';

  const [settings, setSettings] = useState(null);
  const [clientLink, setClientLink] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [priceInput, setPriceInput] = useState('5000');
  const [tokenResetPassword, setTokenResetPassword] = useState('');
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

  const submitResetByToken = async () => {
    if (!resetToken || !tokenResetPassword) {
      setFeedback({ type: 'error', message: 'Completa el token y la nueva contraseña.' });
      return;
    }

    try {
      await api.post('/auth/reset-password', { token: resetToken, newPassword: tokenResetPassword });
      setFeedback({ type: 'success', message: 'Contraseña actualizada correctamente con token.' });
      setTokenResetPassword('');
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo restablecer la contraseña.' });
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Configuración</h2>
        <p className="text-sm text-zinc-400">Perfil y ajustes de cuenta.</p>
      </div>

      <FeedbackBanner message={loadError} type="error" />
      <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} />

      {settings?.profile && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-lg font-semibold">Perfil</h3>
          <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
            <div>
              <span className="text-zinc-500">Email:</span> {settings.profile.email}
            </div>
            <div>
              <span className="text-zinc-500">Rol:</span> {settings.profile.role}
            </div>
            <div>
              <span className="text-zinc-500">Estado:</span> {settings.profile.isActive ? 'Activo' : 'Inactivo'}
            </div>
            <div>
              <span className="text-zinc-500">Persona vinculada:</span> {settings.profile.person ? settings.profile.person.name : 'Sin vínculo'}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-lg font-semibold">Configuración del sistema</h3>
          <p className="text-sm text-zinc-400">Precio global por cabeza.</p>
          <div className="mt-3 flex gap-2">
            <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={priceInput} onChange={(event) => setPriceInput(event.target.value)} />
            <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black" onClick={updateGlobalPrice}>
              Guardar
            </button>
          </div>
        </div>
      )}

      {isClient && (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-lg font-semibold">Datos de contacto</h3>
            {!clientLinked && (
              <FeedbackBanner
                type="warning"
                className="mt-3"
                message="Debes vincular tu cuenta a una persona antes de actualizar teléfono o cédula."
              />
            )}
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-60"
                placeholder="Teléfono"
                value={clientProfileForm.phone}
                disabled={!clientLinked}
                onChange={(event) => setClientProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-60"
                placeholder="Cédula"
                value={clientProfileForm.cedula}
                disabled={!clientLinked}
                onChange={(event) => setClientProfileForm((prev) => ({ ...prev, cedula: event.target.value }))}
              />
            </div>
            <button
              type="button"
              className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm disabled:opacity-60"
              onClick={submitClientProfile}
              disabled={!clientLinked}
            >
              Guardar datos
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-lg font-semibold">Cambiar contraseña</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                type="password"
                placeholder="Contraseña actual"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              />
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                type="password"
                placeholder="Nueva contraseña"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              />
            </div>
            <button type="button" className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm" onClick={submitOwnPassword}>
              Actualizar contraseña
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-lg font-semibold">Vinculación de cuenta</h3>
            {clientLink?.linkedPerson && (
              <FeedbackBanner type="success" className="mb-3" message={`Cuenta vinculada con: ${clientLink.linkedPerson.name}`} />
            )}

            {clientLink?.used && <FeedbackBanner type="warning" className="mb-3" message={ONE_TIME_MSG} />}

            {!clientLink?.used && !clientLink?.linkedPerson && (
              <div className="space-y-3">
                <PersonAutocomplete label="Buscar persona existente" value={selectedPerson} onSelect={setSelectedPerson} />
                {selectedPerson?.id && <div className="text-xs text-zinc-400">Seleccionada: {selectedPerson.name} (ID {selectedPerson.id})</div>}
                <button type="button" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm" onClick={submitLinkRequest}>
                  Enviar solicitud
                </button>
              </div>
            )}

            {clientLink?.latestRequest && (
              <div className="mt-4 text-sm text-zinc-300">
                Estado actual: <span className="font-semibold">{clientLink.latestRequest.status}</span>
              </div>
            )}
          </div>
        </>
      )}

      {resetToken && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-lg font-semibold">Restablecer contraseña</h3>
          <p className="text-sm text-zinc-400">Token detectado en la URL. Ingresa tu nueva contraseña.</p>
          <div className="mt-3 flex gap-2">
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              type="password"
              placeholder="Nueva contraseña"
              value={tokenResetPassword}
              onChange={(event) => setTokenResetPassword(event.target.value)}
            />
            <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black" onClick={submitResetByToken}>
              Actualizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
