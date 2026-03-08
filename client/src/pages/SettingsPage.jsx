import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import PersonAutocomplete from '../components/PersonAutocomplete';
import { getSession } from '../utils/authSession';

const ONE_TIME_MSG =
  'Tu solicitud de vinculación ya fue utilizada. Si necesitas hacer una corrección, por favor comunícate con atención al cliente o con el administrador.';

function feedbackClass(type) {
  if (type === 'error') return 'text-red-300';
  if (type === 'success') return 'text-emerald-300';
  return 'text-zinc-500';
}

export default function SettingsPage() {
  const { user } = getSession();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken') || '';

  const [settings, setSettings] = useState(null);
  const [clientLink, setClientLink] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [priceInput, setPriceInput] = useState('5000');
  const [resetPassword, setResetPassword] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const isAdmin = user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT';

  const load = async () => {
    setFeedback({ type: '', message: '' });
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
      setPriceInput(String(res.data?.defaultPricePerHead || 5000));
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo cargar configuración.' });
    }

    if (isClient) {
      try {
        const linkRes = await api.get('/link-requests/me');
        setClientLink(linkRes.data);
      } catch (error) {
        setClientLink(null);
        setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo cargar estado de vinculación.' });
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateGlobalPrice = async () => {
    try {
      await api.patch('/settings', { defaultPricePerHead: Number(priceInput) });
      setFeedback({ type: 'success', message: 'Precio global actualizado.' });
      await load();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar precio global.' });
    }
  };

  const submitLinkRequest = async () => {
    if (!selectedPerson?.id) {
      setFeedback({ type: 'error', message: 'Selecciona una persona para solicitar vinculación.' });
      return;
    }

    try {
      await api.post('/link-requests', { personId: selectedPerson.id, notes: 'Solicitud enviada desde Settings' });
      setFeedback({ type: 'success', message: 'Solicitud de vinculación enviada.' });
      setSelectedPerson(null);
      await load();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo enviar la solicitud.' });
    }
  };

  const submitResetByToken = async () => {
    if (!resetToken || !resetPassword) {
      setFeedback({ type: 'error', message: 'Completa token y nueva contraseña.' });
      return;
    }
    try {
      await api.post('/auth/reset-password', { token: resetToken, newPassword: resetPassword });
      setFeedback({ type: 'success', message: 'Contraseña actualizada correctamente con token.' });
      setResetPassword('');
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo restablecer la contraseña.' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-zinc-400">Configuración de perfil y ajustes por rol.</p>
      </div>

      {settings?.profile && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-lg font-semibold">Perfil</h3>
          <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
            <div><span className="text-zinc-500">Email:</span> {settings.profile.email}</div>
            <div><span className="text-zinc-500">Rol:</span> {settings.profile.role}</div>
            <div><span className="text-zinc-500">Estado:</span> {settings.profile.isActive ? 'Activo' : 'Inactivo'}</div>
            <div><span className="text-zinc-500">Persona vinculada:</span> {settings.profile.person ? settings.profile.person.name : 'Sin vínculo'}</div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-lg font-semibold">Configuración del sistema</h3>
          <p className="text-sm text-zinc-400">Precio global por cabeza.</p>
          <div className="mt-3 flex gap-2">
            <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black" onClick={updateGlobalPrice}>Guardar</button>
          </div>
        </div>
      )}

      {isClient && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-lg font-semibold">Vinculación de cuenta</h3>
          {clientLink?.linkedPerson && (
            <div className="mb-3 rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              Cuenta vinculada con: {clientLink.linkedPerson.name}
            </div>
          )}

          {clientLink?.used && (
            <div className="mb-3 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">{ONE_TIME_MSG}</div>
          )}

          {!clientLink?.used && !clientLink?.linkedPerson && (
            <div className="space-y-3">
              <PersonAutocomplete label="Buscar persona existente" value={selectedPerson} onSelect={setSelectedPerson} />
              {selectedPerson?.id && <div className="text-xs text-zinc-400">Seleccionada: {selectedPerson.name} (ID {selectedPerson.id})</div>}
              <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm" onClick={submitLinkRequest}>Enviar solicitud</button>
            </div>
          )}

          {clientLink?.latestRequest && (
            <div className="mt-4 text-sm text-zinc-300">
              Estado actual: <span className="font-semibold">{clientLink.latestRequest.status}</span>
            </div>
          )}
        </div>
      )}

      {resetToken && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-lg font-semibold">Restablecer contraseña</h3>
          <p className="text-sm text-zinc-400">Token detectado en URL. Ingresa tu nueva contraseña.</p>
          <div className="mt-3 flex gap-2">
            <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" type="password" placeholder="Nueva contraseña" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black" onClick={submitResetByToken}>Actualizar</button>
          </div>
        </div>
      )}

      {feedback.message && <div className={`text-sm ${feedbackClass(feedback.type)}`}>{feedback.message}</div>}
    </div>
  );
}
