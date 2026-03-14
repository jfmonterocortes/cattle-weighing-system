import { useEffect, useState } from 'react';
import { api } from '../api';
import PersonAutocomplete from '../components/PersonAutocomplete';

function feedbackClass(type) {
  if (type === 'error') return 'text-red-300';
  if (type === 'success') return 'text-emerald-300';
  return 'text-zinc-500';
}

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
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/users', {
          params: {
            limit: 100,
            q: appliedSearch.trim() || undefined,
            role: appliedRole || undefined,
          },
        });
        if (cancelled) return;
        setUsers(res.data || []);
      } catch (error) {
        if (cancelled) return;
        setUsers([]);
        setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudieron cargar los usuarios.' });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [appliedRole, appliedSearch, usersReloadKey]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/link-requests');
        if (cancelled) return;
        setLinkRequests(res.data || []);
      } catch {
        if (!cancelled) {
          setLinkRequests([]);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [linkRequestsReloadKey]);

  const reloadUsers = () => {
    setUsersReloadKey((value) => value + 1);
  };

  const reloadLinkRequests = () => {
    setLinkRequestsReloadKey((value) => value + 1);
  };

  const applyFilters = () => {
    setAppliedSearch(searchInput);
    setAppliedRole(roleInput);
    reloadUsers();
  };

  const createUser = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });
    if (!createForm.email || !createForm.password) {
      setFeedback({ type: 'error', message: 'Correo y contraseña son obligatorios.' });
      return;
    }

    setCreateLoading(true);
    try {
      const createPayload = {
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        liquidadorAlias: createForm.role === 'LIQUIDADOR' ? createForm.liquidadorAlias || undefined : undefined,
      };

      const res = await api.post('/auth/register-managed', createPayload);

      if (createForm.person?.id) {
        await api.patch(`/users/${res.data.id}/person-link`, { personId: createForm.person.id });
      }

      setFeedback({ type: 'success', message: 'Usuario creado correctamente.' });
      setCreateForm({ email: '', password: '', role: 'CLIENT', liquidadorAlias: '', person: null });
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear el usuario.' });
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditingUserDraft({
      email: user.email || '',
      role: user.role === 'ADMIN' ? 'CLIENT' : user.role,
      isActive: Boolean(user.isActive),
      liquidadorAlias: user.liquidadorAlias || '',
    });
  };

  const saveEdit = async (userId) => {
    setFeedback({ type: '', message: '' });
    try {
      await api.patch(`/users/${userId}`, {
        email: editingUserDraft.email,
        role: editingUserDraft.role,
        isActive: editingUserDraft.isActive,
        liquidadorAlias: editingUserDraft.role === 'LIQUIDADOR' ? editingUserDraft.liquidadorAlias || null : null,
      });
      setFeedback({ type: 'success', message: 'Usuario actualizado.' });
      setEditingUserId(null);
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar el usuario.' });
    }
  };

  const linkUser = async () => {
    if (!linking.userId || !linking.person?.id) {
      setFeedback({ type: 'error', message: 'Selecciona un usuario y una persona.' });
      return;
    }

    try {
      await api.patch(`/users/${linking.userId}/person-link`, { personId: linking.person.id });
      setFeedback({ type: 'success', message: 'Usuario vinculado correctamente.' });
      setLinking({ userId: '', person: null });
      reloadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo vincular el usuario.' });
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
      setFeedback({ type: 'error', message: 'Selecciona un usuario y una nueva contraseña.' });
      return;
    }
    try {
      await api.patch(`/users/${manualPassword.userId}/password`, { newPassword: manualPassword.newPassword });
      setFeedback({ type: 'success', message: 'Contraseña actualizada manualmente.' });
      setManualPassword({ userId: '', newPassword: '' });
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Usuarios (ADMIN)</h2>
        <p className="text-sm text-zinc-400">Crear y administrar CLIENT/LIQUIDADOR. No se permite crear ni asignar ADMIN.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Buscar email o nombre" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={roleInput} onChange={(event) => setRoleInput(event.target.value)}>
            <option value="">Todos los roles</option>
            <option value="LIQUIDADOR">LIQUIDADOR</option>
            <option value="CLIENT">CLIENT</option>
          </select>
          <button type="button" onClick={applyFilters} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">
            Buscar
          </button>
          <div className="self-center text-xs text-zinc-500">{loading ? 'Cargando...' : `${users.length} usuarios`}</div>
        </div>
      </div>

      <form onSubmit={createUser} className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:grid-cols-2">
        <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Email" value={createForm.email} onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))} />
        <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" type="password" placeholder="Contraseña" value={createForm.password} onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))} />
        <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={createForm.role} onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}>
          <option value="CLIENT">CLIENT</option>
          <option value="LIQUIDADOR">LIQUIDADOR</option>
        </select>
        {createForm.role === 'LIQUIDADOR' && (
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Alias liquidador" value={createForm.liquidadorAlias} onChange={(event) => setCreateForm((prev) => ({ ...prev, liquidadorAlias: event.target.value }))} />
        )}

        <div className="md:col-span-2">
          <PersonAutocomplete label="Vincular persona (opcional)" value={createForm.person} onSelect={(person) => setCreateForm((prev) => ({ ...prev, person }))} />
        </div>

        <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60 md:col-span-2" disabled={createLoading}>
          {createLoading ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Vincular usuario con persona</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={linking.userId} onChange={(event) => setLinking((prev) => ({ ...prev, userId: event.target.value }))}>
            <option value="">Seleccionar usuario</option>
            {users
              .filter((currentUser) => currentUser.role !== 'ADMIN')
              .map((currentUser) => (
                <option key={currentUser.id} value={currentUser.id}>
                  {currentUser.email} ({currentUser.role})
                </option>
              ))}
          </select>
          <div className="md:col-span-2">
            <PersonAutocomplete label="Persona" value={linking.person} onSelect={(person) => setLinking((prev) => ({ ...prev, person }))} />
          </div>
        </div>
        <button className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm" type="button" onClick={linkUser}>
          Vincular
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Reset de contraseña</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={manualPassword.userId} onChange={(event) => setManualPassword((prev) => ({ ...prev, userId: event.target.value }))}>
            <option value="">Seleccionar usuario</option>
            {users.map((currentUser) => (
              <option key={currentUser.id} value={currentUser.id}>
                {currentUser.email}
              </option>
            ))}
          </select>
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" type="password" placeholder="Nueva contraseña manual" value={manualPassword.newPassword} onChange={(event) => setManualPassword((prev) => ({ ...prev, newPassword: event.target.value }))} />
          <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm" type="button" onClick={submitManualPassword}>
            Cambiar manualmente
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {users.map((currentUser) => (
            <button key={currentUser.id} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs" type="button" onClick={() => requestResetLink(currentUser.id)}>
              Generar link reset: {currentUser.email}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Rol</th>
              <th className="px-2 py-2">Activo</th>
              <th className="px-2 py-2">Person ID</th>
              <th className="px-2 py-2">Persona</th>
              <th className="px-2 py-2">Teléfono</th>
              <th className="px-2 py-2">Cédula</th>
              <th className="px-2 py-2">Alias</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((currentUser) => {
              const editing = editingUserId === currentUser.id;
              return (
                <tr key={currentUser.id} className="border-b border-zinc-800/70 text-zinc-200">
                  <td className="px-2 py-2">{currentUser.id}</td>
                  <td className="px-2 py-2">
                    {editing ? <input className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingUserDraft.email} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, email: event.target.value }))} /> : currentUser.email}
                  </td>
                  <td className="px-2 py-2">
                    {currentUser.role === 'ADMIN' ? (
                      'ADMIN'
                    ) : editing ? (
                      <select className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingUserDraft.role} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, role: event.target.value }))}>
                        <option value="CLIENT">CLIENT</option>
                        <option value="LIQUIDADOR">LIQUIDADOR</option>
                      </select>
                    ) : (
                      currentUser.role
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editing ? <input type="checkbox" checked={editingUserDraft.isActive} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, isActive: event.target.checked }))} /> : currentUser.isActive ? 'Sí' : 'No'}
                  </td>
                  <td className="px-2 py-2">{currentUser.personId || '-'}</td>
                  <td className="px-2 py-2">{currentUser.person?.name || '-'}</td>
                  <td className="px-2 py-2">{currentUser.person?.phone || '-'}</td>
                  <td className="px-2 py-2">{currentUser.person?.cedula || '-'}</td>
                  <td className="px-2 py-2">
                    {editing ? (
                      <input className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" disabled={editingUserDraft.role !== 'LIQUIDADOR'} value={editingUserDraft.liquidadorAlias} onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, liquidadorAlias: event.target.value }))} />
                    ) : (
                      currentUser.liquidadorAlias || '-'
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {currentUser.role === 'ADMIN' ? (
                      <span className="text-xs text-zinc-500">Protegido</span>
                    ) : editing ? (
                      <div className="flex justify-end gap-2">
                        <button className="rounded border border-zinc-700 px-2 py-1 text-xs" onClick={() => setEditingUserId(null)} type="button">
                          Cancelar
                        </button>
                        <button className="rounded bg-white px-2 py-1 text-xs font-semibold text-black" onClick={() => saveEdit(currentUser.id)} type="button">
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <button className="rounded border border-zinc-700 px-2 py-1 text-xs" onClick={() => startEdit(currentUser)} type="button">
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Solicitudes de vinculación</h3>
        <div className="mt-3 space-y-2">
          {linkRequests.length === 0 && <div className="text-sm text-zinc-500">Sin solicitudes.</div>}
          {linkRequests.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
              <div className="text-sm text-zinc-200">
                {item.user.email} → {item.person.name} ({item.status})
              </div>
              <div className="text-xs text-zinc-500">{item.notes || 'Sin notas'}</div>
              {item.status === 'PENDING' && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => reviewRequest(item.id, 'APPROVED')} className="rounded-lg bg-emerald-300 px-3 py-1 text-xs font-semibold text-black">
                    Aprobar
                  </button>
                  <button type="button" onClick={() => reviewRequest(item.id, 'REJECTED')} className="rounded-lg bg-red-300 px-3 py-1 text-xs font-semibold text-black">
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {feedback.message && <div className={`text-sm ${feedbackClass(feedback.type)}`}>{feedback.message}</div>}
    </div>
  );
}
