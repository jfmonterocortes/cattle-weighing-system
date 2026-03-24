import { KeyRound, Link2, PlusCircle, ShieldCheck, Users2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';
import PersonAutocomplete from '../components/PersonAutocomplete';

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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedRole, setAppliedRole] = useState('');
  const [usersReloadKey, setUsersReloadKey] = useState(0);
  const [linkRequestsReloadKey, setLinkRequestsReloadKey] = useState(0);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

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
    setEditingUserId(user.id);
    setEditingUserDraft({ email: user.email || '', role: user.role === 'ADMIN' ? 'CLIENT' : user.role, isActive: Boolean(user.isActive), liquidadorAlias: user.liquidadorAlias || '' });
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
      setFeedback({ type: 'success', message: `Link de reset generado: ${res.data.resetLink}` });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo generar el link de reset.' });
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

  return (
    <div className="space-y-6 stagger">
      <section className="overflow-hidden rounded-2xl bg-[#1C3A22] p-6 shadow-[0_8px_40px_rgba(28,58,34,0.30)] dark:bg-[#162d1b] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
              <Users2 size={13} />
              Cuentas y vinculaciones
            </div>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-white">Atiende primero la cola de vinculaciones y después el mantenimiento de cuentas.</h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Esta pantalla agrupa la supervisión de cuentas, la aprobación de solicitudes y las herramientas de soporte sin darle el mismo peso a todo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[500px]">
            <StatCard icon={ShieldCheck} label="Pendientes" value={pendingRequests.length} caption="Solicitudes esperando revisión." />
            <StatCard icon={Users2} label="Cuentas" value={users.length} caption={loading ? 'Actualizando listado...' : 'Cuentas visibles con los filtros actuales.'} />
            <StatCard icon={UserRound} label="Clientes" value={clientCount} caption="Cuentas CLIENT disponibles." />
            <StatCard icon={Link2} label="Liquidadores" value={operatorCount} caption="Cuentas LIQUIDADOR activas." />
          </div>
        </div>
      </section>

      <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} />

      <SectionShell eyebrow="Cola principal" title="Solicitudes de vinculación pendientes" description="Resuelve primero esta cola porque desbloquea la experiencia del cliente y reduce consultas de soporte.">
        <div className="space-y-3">
          {pendingRequests.length === 0 && <div className="rounded-xl border border-dashed border-stone-300/80 bg-stone-100/50 px-4 py-5 text-sm text-stone-600 dark:border-white/8 dark:bg-white/3 dark:text-white/40">No hay solicitudes pendientes en este momento.</div>}
          {pendingRequests.map((item) => (
            <div key={item.id} className="rounded-xl border border-stone-300/50 bg-white/60 px-4 py-4 dark:border-white/6 dark:bg-white/3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.user?.email || 'Cuenta'} {'->'} {item.person?.name || 'Persona'}</div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.notes || 'Sin notas adicionales.'}</div>
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

      <SectionShell eyebrow="Gestión de cuentas" title="Crear cuentas y revisar acceso operativo" description="Despues de la cola principal, crea o ajusta cuentas CLIENT y LIQUIDADOR sin tocar privilegios ADMIN.">
        <form onSubmit={createUser} className="grid gap-4 rounded-xl border border-stone-300/50 bg-white/50 p-4 dark:border-white/6 dark:bg-white/3">
          <div className="grid gap-4 md:grid-cols-2">
            <input className={inputClass} placeholder="Correo" value={createForm.email} onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))} />
            <input className={inputClass} type="password" placeholder="Contraseña" value={createForm.password} onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))} />
            <select className={inputClass} value={createForm.role} onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}>
              <option value="CLIENT">CLIENT</option>
              <option value="LIQUIDADOR">LIQUIDADOR</option>
            </select>
            {createForm.role === 'LIQUIDADOR' && <input className={inputClass} placeholder="Alias liquidador" value={createForm.liquidadorAlias} onChange={(event) => setCreateForm((prev) => ({ ...prev, liquidadorAlias: event.target.value }))} />}
          </div>

          <div>
            <PersonAutocomplete label="Vincular persona (opcional)" value={createForm.person} onSelect={(person) => setCreateForm((prev) => ({ ...prev, person }))} />
          </div>

          <div className="flex justify-end">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400" disabled={createLoading}>
              <PlusCircle size={16} />
              {createLoading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inputClass} placeholder="Buscar email o nombre" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            <select className={inputClass} value={roleInput} onChange={(event) => setRoleInput(event.target.value)}>
              <option value="">Todos los roles</option>
              <option value="LIQUIDADOR">LIQUIDADOR</option>
              <option value="CLIENT">CLIENT</option>
            </select>
          </div>
          <button type="button" onClick={applyFilters} className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70">Buscar cuentas</button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-zinc-200/80 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50/90 text-left text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-3 font-medium">Cuenta</th>
                <th className="px-3 py-3 font-medium">Rol</th>
                <th className="px-3 py-3 font-medium">Activa</th>
                <th className="px-3 py-3 font-medium">Persona</th>
                <th className="px-3 py-3 font-medium">Contacto</th>
                <th className="px-3 py-3 font-medium">Alias</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((currentUser) => {
                const editing = editingUserId === currentUser.id;
                return (
                  <tr key={currentUser.id} className="border-t border-zinc-200/80 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                    <td className="px-3 py-3">{editing ? <input className={inputClass} value={editingUserDraft.email} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, email: event.target.value }))} /> : currentUser.email}</td>
                    <td className="px-3 py-3">{currentUser.role === 'ADMIN' ? 'ADMIN' : editing ? <select className={inputClass} value={editingUserDraft.role} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, role: event.target.value }))}><option value="CLIENT">CLIENT</option><option value="LIQUIDADOR">LIQUIDADOR</option></select> : currentUser.role}</td>
                    <td className="px-3 py-3">{editing ? <input type="checkbox" checked={editingUserDraft.isActive} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, isActive: event.target.checked }))} /> : currentUser.isActive ? 'Si' : 'No'}</td>
                    <td className="px-3 py-3">{currentUser.person?.name || '-'}</td>
                    <td className="px-3 py-3">{currentUser.person?.phone || currentUser.person?.cedula || '-'}</td>
                    <td className="px-3 py-3">{editing ? <input className={inputClass} disabled={editingUserDraft.role !== 'LIQUIDADOR'} value={editingUserDraft.liquidadorAlias} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, liquidadorAlias: event.target.value }))} /> : currentUser.liquidadorAlias || '-'}</td>
                    <td className="px-3 py-3 text-right">
                      {currentUser.role === 'ADMIN' ? (
                        <span className="text-xs text-zinc-500">Protegido</span>
                      ) : editing ? (
                        <div className="flex justify-end gap-2">
                          <button className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" onClick={() => setEditingUserId(null)} type="button">Cancelar</button>
                          <button className="rounded-xl bg-emerald-900 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-900/15 transition hover:bg-emerald-800 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/10 dark:hover:bg-amber-400" onClick={() => saveEdit(currentUser.id)} type="button">Guardar</button>
                        </div>
                      ) : (
                        <button className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" onClick={() => startEdit(currentUser)} type="button">Editar</button>
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
        <SectionShell eyebrow="Herramienta secundaria" title="Vinculación manual" description="Usala cuando necesites corregir o completar una relación cuenta-persona fuera de la cola principal.">
          <div className="grid gap-4">
            <select className={inputClass} value={linking.userId} onChange={(event) => setLinking((prev) => ({ ...prev, userId: event.target.value }))}>
              <option value="">Seleccionar cuenta</option>
              {users.filter((currentUser) => currentUser.role !== 'ADMIN').map((currentUser) => <option key={currentUser.id} value={currentUser.id}>{currentUser.email} ({currentUser.role})</option>)}
            </select>
            <PersonAutocomplete label="Persona" value={linking.person} onSelect={(person) => setLinking((prev) => ({ ...prev, person }))} />
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" type="button" onClick={linkUser}>
              <Link2 size={16} />
              Vincular cuenta
            </button>
          </div>
        </SectionShell>

        <SectionShell eyebrow="Herramienta secundaria" title="Soporte de contraseñas" description="Mantiene disponibles el cambio manual y la generacion de enlaces, pero con menos peso visual que la cola principal.">
          <div className="space-y-4">
            <div className="grid gap-4">
              <select className={inputClass} value={manualPassword.userId} onChange={(event) => setManualPassword((prev) => ({ ...prev, userId: event.target.value }))}>
                <option value="">Seleccionar cuenta</option>
                {users.map((currentUser) => <option key={currentUser.id} value={currentUser.id}>{currentUser.email}</option>)}
              </select>
              <input className={inputClass} type="password" placeholder="Nueva contraseña manual" value={manualPassword.newPassword} onChange={(event) => setManualPassword((prev) => ({ ...prev, newPassword: event.target.value }))} />
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" type="button" onClick={submitManualPassword}>
                <KeyRound size={16} />
                Cambiar contraseña
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {users.map((currentUser) => (
                <button key={currentUser.id} className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" type="button" onClick={() => requestResetLink(currentUser.id)}>
                  Generar link: {currentUser.email}
                </button>
              ))}
            </div>
          </div>
        </SectionShell>
      </div>
    </div>
  );
}
