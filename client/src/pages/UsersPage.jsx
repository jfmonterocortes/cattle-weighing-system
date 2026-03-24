import { KeyRound, Link2, PlusCircle, ShieldCheck, Users2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';
import PersonAutocomplete from '../components/PersonAutocomplete';
import { formatRole } from '../utils/format';
import { getSession } from '../utils/authSession';

function SectionShell({ eyebrow, title, description, children, actions }) {
  return (
    <section className="rounded-2xl border border-stone-300/50 bg-stone-100/60 p-5 shadow-sm dark:border-white/6 dark:bg-white/3 dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-white/35">{eyebrow}</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-white/45">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatCard({ icon, label, value, caption }) {
  const CardIcon = icon;
  return (
    <div className="rounded-xl border border-white/12 bg-white/8 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">{label}</div>
          <div className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white">{value}</div>
          <div className="mt-2 text-sm text-white/50">{caption}</div>
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-[#1C3A22]">
          <CardIcon size={18} />
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10';

export default function UsersPage() {
  const { activeRole } = getSession();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedRole, setAppliedRole] = useState('');
  const [usersReloadKey, setUsersReloadKey] = useState(0);
  const [linkRequestsReloadKey, setLinkRequestsReloadKey] = useState(0);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [confirmSuspendId, setConfirmSuspendId] = useState(null);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserDraft, setEditingUserDraft] = useState({ email: '', role: 'CLIENT', isActive: true, liquidadorAlias: '' });
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'CLIENT', liquidadorAlias: '', person: null });
  const [createLoading, setCreateLoading] = useState(false);
  const [manualPassword, setManualPassword] = useState({ userId: '', newPassword: '' });
  const [linking, setLinking] = useState({ userId: '', person: null });
  const [linkRequests, setLinkRequests] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/users', { params: { limit: 100, q: appliedSearch.trim() || undefined, role: appliedRole || undefined } })
      .then((res) => {
        if (!cancelled) setUsers(res.data || []);
      })
      .catch((error) => {
        if (!cancelled) {
          setUsers([]);
          setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudieron cargar las cuentas.' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedRole, appliedSearch, usersReloadKey]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/link-requests')
      .then((res) => {
        if (!cancelled) setLinkRequests(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setLinkRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [linkRequestsReloadKey]);

  const reloadUsers = () => setUsersReloadKey((value) => value + 1);
  const reloadLinkRequests = () => setLinkRequestsReloadKey((value) => value + 1);
  const applyFilters = () => {
    setAppliedSearch(searchInput);
    setAppliedRole(roleInput);
    reloadUsers();
  };

  const createUser = async (event) => {
    event.preventDefault();
    if (!createForm.email || !createForm.password) {
      setFeedback({ type: 'error', message: 'Correo y contraseña son obligatorios.' });
      return;
    }
    setCreateLoading(true);
    try {
      const res = await api.post('/auth/register-managed', {
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        liquidadorAlias: createForm.role === 'LIQUIDADOR' ? createForm.liquidadorAlias || undefined : undefined,
      });
      if (createForm.person?.id) await api.patch(`/users/${res.data.id}/person-link`, { personId: createForm.person.id });
      setCreateForm({ email: '', password: '', role: 'CLIENT', liquidadorAlias: '', person: null });
      setFeedback({ type: 'success', message: 'Cuenta creada correctamente.' });
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la cuenta.' });
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (user) => {
    if (user.role === 'ADMIN') return;
    setEditingUserId(user.id);
    setEditingUserDraft({ email: user.email || '', role: user.role, isActive: Boolean(user.isActive), liquidadorAlias: user.liquidadorAlias || '' });
  };

  const saveEdit = async (userId) => {
    try {
      await api.patch(`/users/${userId}`, {
        email: editingUserDraft.email,
        role: editingUserDraft.role,
        isActive: editingUserDraft.isActive,
        liquidadorAlias: editingUserDraft.role === 'LIQUIDADOR' ? editingUserDraft.liquidadorAlias || null : null,
      });
      setEditingUserId(null);
      setFeedback({ type: 'success', message: 'Cuenta actualizada.' });
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar la cuenta.' });
    }
  };

  const toggleSuspend = async (userId, isActive) => {
    try {
      await api.patch(`/users/${userId}`, { isActive });
      setConfirmSuspendId(null);
      setFeedback({ type: 'success', message: isActive ? 'Cuenta activada.' : 'Cuenta suspendida.' });
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar la cuenta.' });
    }
  };

  const promoteToLiquidador = async (userId) => {
    try {
      await api.patch(`/users/${userId}`, { role: 'LIQUIDADOR' });
      setFeedback({ type: 'success', message: 'Cuenta promovida a Liquidador.' });
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo promover la cuenta.' });
    }
  };

  const demoteToClient = async (userId) => {
    try {
      await api.patch(`/users/${userId}`, { role: 'CLIENT' });
      setFeedback({ type: 'success', message: 'Cuenta convertida a Cliente.' });
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo convertir la cuenta.' });
    }
  };

  const linkUser = async () => {
    if (!linking.userId || !linking.person?.id) {
      setFeedback({ type: 'error', message: 'Selecciona una cuenta y una persona.' });
      return;
    }
    try {
      await api.patch(`/users/${linking.userId}/person-link`, { personId: linking.person.id });
      setLinking({ userId: '', person: null });
      setFeedback({ type: 'success', message: 'Cuenta vinculada correctamente.' });
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo vincular la cuenta.' });
    }
  };

  const requestResetLink = async (userId) => {
    try {
      const res = await api.post(`/users/${userId}/password-reset-link`);
      navigator.clipboard.writeText(res.data.resetLink).catch(() => {});
      setFeedback({ type: 'success', message: 'Enlace de restablecimiento copiado al portapapeles.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo generar el enlace de restablecimiento.' });
    }
  };

  const submitManualPassword = async () => {
    if (!manualPassword.userId || !manualPassword.newPassword) {
      setFeedback({ type: 'error', message: 'Selecciona una cuenta y una nueva contraseña.' });
      return;
    }
    try {
      await api.patch(`/users/${manualPassword.userId}/password`, { newPassword: manualPassword.newPassword });
      setManualPassword({ userId: '', newPassword: '' });
      setFeedback({ type: 'success', message: 'Contraseña actualizada manualmente.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo cambiar la contraseña.' });
    }
  };

  const reviewRequest = async (id, status) => {
    try {
      await api.patch(`/link-requests/${id}/review`, { status });
      setFeedback({ type: 'success', message: `Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}.` });
      reloadLinkRequests();
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo revisar la solicitud.' });
    }
  };

  const pendingRequests = useMemo(() => linkRequests.filter((item) => item.status === 'PENDING'), [linkRequests]);
  const clientCount = users.filter((user) => user.role === 'CLIENT').length;
  const operatorCount = users.filter((user) => user.role === 'LIQUIDADOR').length;

  if (activeRole !== 'ADMIN') {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-5 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
        Tu rol actual no tiene acceso a esta sección.
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <section className="overflow-hidden rounded-2xl bg-[#1C3A22] p-6 shadow-[0_8px_40px_rgba(28,58,34,0.30)] dark:bg-[#162d1b] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
              <Users2 size={13} />
              Cuentas y vinculaciones
            </div>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-white">Cuentas y vinculaciones</h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Aprueba solicitudes, gestiona cuentas y usa las herramientas de soporte.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[500px]">
            <StatCard icon={ShieldCheck} label="Pendientes" value={pendingRequests.length} caption="Solicitudes por revisar." />
            <StatCard icon={Users2} label="Cuentas" value={users.length} caption={loading ? 'Cargando...' : 'Con los filtros actuales.'} />
            <StatCard icon={UserRound} label="Clientes" value={clientCount} caption="Cuentas de cliente." />
            <StatCard icon={Link2} label="Liquidadores" value={operatorCount} caption="Cuentas de liquidador." />
          </div>
        </div>
      </section>

      <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} />

      <SectionShell eyebrow="Vinculaciones" title="Solicitudes pendientes">
        <div className="space-y-3">
          {pendingRequests.length === 0 && <div className="rounded-xl border border-dashed border-stone-300/80 bg-stone-100/50 px-4 py-5 text-sm text-stone-600 dark:border-white/8 dark:bg-white/3 dark:text-white/40">Sin solicitudes pendientes.</div>}
          {pendingRequests.map((item) => (
            <div key={item.id} className="rounded-xl border border-stone-300/50 bg-white/60 px-4 py-4 dark:border-white/6 dark:bg-white/3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.user?.email || 'Cuenta'} {'->'} {item.person?.name || 'Persona'}</div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.notes || 'Sin notas.'}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => reviewRequest(item.id, 'APPROVED')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">Aprobar</button>
                  <button type="button" onClick={() => reviewRequest(item.id, 'REJECTED')} className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10">Rechazar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Cuentas" title="Gestión de cuentas">
        <form onSubmit={createUser} className="grid gap-4 rounded-xl border border-stone-300/50 bg-white/50 p-4 dark:border-white/6 dark:bg-white/3">
          <div className="grid gap-4 md:grid-cols-2">
            <input className={inputClass} placeholder="Correo" value={createForm.email} onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))} />
            <input className={inputClass} type="password" placeholder="Contraseña" value={createForm.password} onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))} />
            <select className={inputClass} value={createForm.role} onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}>
              <option value="CLIENT">Cliente</option>
              <option value="LIQUIDADOR">Liquidador</option>
            </select>
            {createForm.role === 'LIQUIDADOR' && <input className={inputClass} placeholder="Alias liquidador" value={createForm.liquidadorAlias} onChange={(event) => setCreateForm((prev) => ({ ...prev, liquidadorAlias: event.target.value }))} />}
          </div>

          <div>
            <PersonAutocomplete label="Vincular persona (opcional)" value={createForm.person} onSelect={(person) => setCreateForm((prev) => ({ ...prev, person }))} />
          </div>

          <div className="flex justify-end">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400" disabled={createLoading}>
              <PlusCircle size={16} aria-hidden="true" />
              {createLoading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inputClass} placeholder="Buscar email o nombre" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            <select className={inputClass} value={roleInput} onChange={(event) => setRoleInput(event.target.value)}>
              <option value="">Todos los roles</option>
              <option value="LIQUIDADOR">Liquidador</option>
              <option value="CLIENT">Cliente</option>
            </select>
          </div>
          <button type="button" onClick={applyFilters} className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70">Buscar cuentas</button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-zinc-200/80 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50/90 text-left text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">Cuenta</th>
                <th scope="col" className="px-3 py-3 font-medium">Rol</th>
                <th scope="col" className="px-3 py-3 font-medium">Activa</th>
                <th scope="col" className="px-3 py-3 font-medium">Persona</th>
                <th scope="col" className="px-3 py-3 font-medium">Contacto</th>
                <th scope="col" className="px-3 py-3 font-medium">Alias</th>
                <th scope="col" className="sr-only px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((currentUser) => {
                const editing = editingUserId === currentUser.id;
                return (
                  <tr key={currentUser.id} className="border-t border-zinc-200/80 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                    <td className="px-3 py-3">{editing ? <input aria-label={`Email de ${currentUser.email}`} className={inputClass} value={editingUserDraft.email} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, email: event.target.value }))} /> : currentUser.email}</td>
                    <td className="px-3 py-3">{currentUser.role === 'ADMIN' ? formatRole('ADMIN') : editing ? <select aria-label={`Rol de ${currentUser.email}`} className={inputClass} value={editingUserDraft.role} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, role: event.target.value }))}><option value="CLIENT">Cliente</option><option value="LIQUIDADOR">Liquidador</option></select> : formatRole(currentUser.role)}</td>
                    <td className="px-3 py-3">{editing ? <input type="checkbox" aria-label={`Cuenta activa: ${currentUser.email}`} checked={editingUserDraft.isActive} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, isActive: event.target.checked }))} /> : currentUser.isActive ? 'Si' : 'No'}</td>
                    <td className="px-3 py-3">{currentUser.person?.name || '-'}</td>
                    <td className="px-3 py-3">{currentUser.person?.phone || currentUser.person?.cedula || '-'}</td>
                    <td className="px-3 py-3">{editing ? <input aria-label={`Alias liquidador de ${currentUser.email}`} className={inputClass} disabled={editingUserDraft.role !== 'LIQUIDADOR'} value={editingUserDraft.liquidadorAlias} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, liquidadorAlias: event.target.value }))} /> : currentUser.liquidadorAlias || '-'}</td>
                    <td className="px-3 py-3 text-right">
                      {currentUser.role === 'ADMIN' ? (
                        <span className="text-xs text-zinc-500">Protegido</span>
                      ) : editing ? (
                        <div className="flex justify-end gap-2">
                          <button className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" onClick={() => setEditingUserId(null)} type="button">Cancelar</button>
                          <button className="rounded-xl bg-emerald-900 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-900/15 transition hover:bg-emerald-800 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/10 dark:hover:bg-amber-400" onClick={() => saveEdit(currentUser.id)} type="button">Guardar</button>
                        </div>
                      ) : confirmSuspendId === currentUser.id ? (
                        <div className="flex justify-end items-center gap-2">
                          <span className="text-xs text-zinc-500">¿Confirmar?</span>
                          <button type="button" onClick={() => toggleSuspend(currentUser.id, false)} className="rounded-2xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700">Sí, suspender</button>
                          <button type="button" onClick={() => setConfirmSuspendId(null)} className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {currentUser.role === 'CLIENT' && (
                            <button type="button" onClick={() => promoteToLiquidador(currentUser.id)} className="rounded-2xl border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-500/10">Promover</button>
                          )}
                          {currentUser.role === 'LIQUIDADOR' && (
                            <button type="button" onClick={() => demoteToClient(currentUser.id)} className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/70">Degradar</button>
                          )}
                          {currentUser.isActive ? (
                            <button type="button" onClick={() => setConfirmSuspendId(currentUser.id)} className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Suspender</button>
                          ) : (
                            <button type="button" onClick={() => toggleSuspend(currentUser.id, true)} className="rounded-2xl border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10">Activar</button>
                          )}
                          <button className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" onClick={() => startEdit(currentUser)} type="button">Editar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionShell>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionShell eyebrow="Herramientas" title="Vinculación manual">
          <div className="grid gap-4">
            <select className={inputClass} value={linking.userId} onChange={(event) => setLinking((prev) => ({ ...prev, userId: event.target.value }))}>
              <option value="">Seleccionar cuenta</option>
              {users.filter((currentUser) => currentUser.role !== 'ADMIN').map((currentUser) => <option key={currentUser.id} value={currentUser.id}>{currentUser.email} ({formatRole(currentUser.role)})</option>)}
            </select>
            <PersonAutocomplete label="Persona" value={linking.person} onSelect={(person) => setLinking((prev) => ({ ...prev, person }))} />
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" type="button" onClick={linkUser}>
              <Link2 size={16} aria-hidden="true" />
              Vincular cuenta
            </button>
          </div>
        </SectionShell>

        <SectionShell eyebrow="Herramientas" title="Soporte de contraseñas">
          <div className="space-y-4">
            <div className="grid gap-4">
              <select className={inputClass} value={manualPassword.userId} onChange={(event) => setManualPassword((prev) => ({ ...prev, userId: event.target.value }))}>
                <option value="">Seleccionar cuenta</option>
                {users.map((currentUser) => <option key={currentUser.id} value={currentUser.id}>{currentUser.email}</option>)}
              </select>
              <input className={inputClass} type="password" placeholder="Nueva contraseña manual" value={manualPassword.newPassword} onChange={(event) => setManualPassword((prev) => ({ ...prev, newPassword: event.target.value }))} />
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" type="button" onClick={submitManualPassword}>
                <KeyRound size={16} aria-hidden="true" />
                Cambiar contraseña
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {users.map((currentUser) => (
                <button key={currentUser.id} className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" type="button" onClick={() => requestResetLink(currentUser.id)}>
                  Enlace de reset: {currentUser.email}
                </button>
              ))}
            </div>
          </div>
        </SectionShell>
      </div>
    </div>
  );
}
