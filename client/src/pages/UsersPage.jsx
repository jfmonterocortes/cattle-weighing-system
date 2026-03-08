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
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserDraft, setEditingUserDraft] = useState({ email: '', role: 'CLIENT', isActive: true, liquidadorAlias: '' });

  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'CLIENT', liquidadorAlias: '', person: null });
  const [createLoading, setCreateLoading] = useState(false);

  const [manualPassword, setManualPassword] = useState({ userId: '', newPassword: '' });

  const [linking, setLinking] = useState({ userId: '', person: null });

  const [linkRequests, setLinkRequests] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { limit: 100, q: search.trim() || undefined, role: role || undefined } });
      setUsers(res.data || []);
    } catch (error) {
      setUsers([]);
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudieron cargar usuarios.' });
    } finally {
      setLoading(false);
    }
  };

  const loadLinkRequests = async () => {
    try {
      const res = await api.get('/link-requests');
      setLinkRequests(res.data || []);
    } catch {
      setLinkRequests([]);
    }
  };

  useEffect(() => {
    loadUsers();
    loadLinkRequests();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
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
      await loadUsers();
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
      await loadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar usuario.' });
    }
  };

  const linkUser = async () => {
    if (!linking.userId || !linking.person?.id) {
      setFeedback({ type: 'error', message: 'Selecciona usuario y persona.' });
      return;
    }

    try {
      await api.patch(`/users/${linking.userId}/person-link`, { personId: linking.person.id });
      setFeedback({ type: 'success', message: 'Usuario vinculado correctamente.' });
      setLinking({ userId: '', person: null });
      await loadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo vincular usuario.' });
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
      setFeedback({ type: 'error', message: 'Selecciona usuario y nueva contraseña.' });
      return;
    }
    try {
      await api.patch(`/users/${manualPassword.userId}/password`, { newPassword: manualPassword.newPassword });
      setFeedback({ type: 'success', message: 'Contraseña actualizada manualmente.' });
      setManualPassword({ userId: '', newPassword: '' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo cambiar contraseña.' });
    }
  };

  const reviewRequest = async (id, status) => {
    try {
      await api.patch(`/link-requests/${id}/review`, { status });
      setFeedback({ type: 'success', message: `Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}.` });
      await loadLinkRequests();
      await loadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo revisar solicitud.' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Usuarios (ADMIN)</h2>
        <p className="text-sm text-zinc-400">Crear y administrar CLIENT/LIQUIDADOR. No se permite crear ni asignar ADMIN.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Buscar email o nombre" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Todos los roles</option>
            <option value="LIQUIDADOR">LIQUIDADOR</option>
            <option value="CLIENT">CLIENT</option>
          </select>
          <button type="button" onClick={loadUsers} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">Buscar</button>
          <div className="self-center text-xs text-zinc-500">{loading ? 'Cargando...' : `${users.length} usuarios`}</div>
        </div>
      </div>

      <form onSubmit={createUser} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 grid gap-3 md:grid-cols-2">
        <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" type="password" placeholder="Contraseña" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
        <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}>
          <option value="CLIENT">CLIENT</option>
          <option value="LIQUIDADOR">LIQUIDADOR</option>
        </select>
        {createForm.role === 'LIQUIDADOR' && (
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Alias liquidador" value={createForm.liquidadorAlias} onChange={(e) => setCreateForm((p) => ({ ...p, liquidadorAlias: e.target.value }))} />
        )}

        <div className="md:col-span-2">
          <PersonAutocomplete label="Vincular persona (opcional)" value={createForm.person} onSelect={(person) => setCreateForm((p) => ({ ...p, person }))} />
        </div>

        <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60 md:col-span-2" disabled={createLoading}>
          {createLoading ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Vincular usuario con persona</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={linking.userId} onChange={(e) => setLinking((p) => ({ ...p, userId: e.target.value }))}>
            <option value="">Seleccionar usuario</option>
            {users.filter((u) => u.role !== 'ADMIN').map((u) => (
              <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
            ))}
          </select>
          <div className="md:col-span-2">
            <PersonAutocomplete label="Persona" value={linking.person} onSelect={(person) => setLinking((p) => ({ ...p, person }))} />
          </div>
        </div>
        <button className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm" type="button" onClick={linkUser}>Vincular</button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Reset de contraseña</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={manualPassword.userId} onChange={(e) => setManualPassword((p) => ({ ...p, userId: e.target.value }))}>
            <option value="">Seleccionar usuario</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" type="password" placeholder="Nueva contraseña manual" value={manualPassword.newPassword} onChange={(e) => setManualPassword((p) => ({ ...p, newPassword: e.target.value }))} />
          <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm" type="button" onClick={submitManualPassword}>Cambiar manualmente</button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {users.map((u) => (
            <button key={u.id} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs" type="button" onClick={() => requestResetLink(u.id)}>
              Generar link reset: {u.email}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 overflow-x-auto">
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
            {users.map((u) => {
              const editing = editingUserId === u.id;
              return (
                <tr key={u.id} className="border-b border-zinc-800/70 text-zinc-200">
                  <td className="px-2 py-2">{u.id}</td>
                  <td className="px-2 py-2">{editing ? <input className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingUserDraft.email} onChange={(e) => setEditingUserDraft((p) => ({ ...p, email: e.target.value }))} /> : u.email}</td>
                  <td className="px-2 py-2">
                    {u.role === 'ADMIN' ? (
                      'ADMIN'
                    ) : editing ? (
                      <select className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingUserDraft.role} onChange={(e) => setEditingUserDraft((p) => ({ ...p, role: e.target.value }))}>
                        <option value="CLIENT">CLIENT</option>
                        <option value="LIQUIDADOR">LIQUIDADOR</option>
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td className="px-2 py-2">{editing ? <input type="checkbox" checked={editingUserDraft.isActive} onChange={(e) => setEditingUserDraft((p) => ({ ...p, isActive: e.target.checked }))} /> : u.isActive ? 'Sí' : 'No'}</td>
                  <td className="px-2 py-2">{u.personId || '-'}</td>
                  <td className="px-2 py-2">{u.person?.name || '-'}</td>
                  <td className="px-2 py-2">{u.person?.phone || '-'}</td>
                  <td className="px-2 py-2">{u.person?.cedula || '-'}</td>
                  <td className="px-2 py-2">{editing ? <input className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" disabled={editingUserDraft.role !== 'LIQUIDADOR'} value={editingUserDraft.liquidadorAlias} onChange={(e) => setEditingUserDraft((p) => ({ ...p, liquidadorAlias: e.target.value }))} /> : u.liquidadorAlias || '-'}</td>
                  <td className="px-2 py-2 text-right">
                    {u.role === 'ADMIN' ? (
                      <span className="text-xs text-zinc-500">Protegido</span>
                    ) : editing ? (
                      <div className="flex justify-end gap-2">
                        <button className="rounded border border-zinc-700 px-2 py-1 text-xs" onClick={() => setEditingUserId(null)} type="button">Cancelar</button>
                        <button className="rounded bg-white px-2 py-1 text-xs font-semibold text-black" onClick={() => saveEdit(u.id)} type="button">Guardar</button>
                      </div>
                    ) : (
                      <button className="rounded border border-zinc-700 px-2 py-1 text-xs" onClick={() => startEdit(u)} type="button">Editar</button>
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
              <div className="text-sm text-zinc-200">{item.user.email} → {item.person.name} ({item.status})</div>
              <div className="text-xs text-zinc-500">{item.notes || 'Sin notas'}</div>
              {item.status === 'PENDING' && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => reviewRequest(item.id, 'APPROVED')} className="rounded-lg bg-emerald-300 px-3 py-1 text-xs font-semibold text-black">Aprobar</button>
                  <button type="button" onClick={() => reviewRequest(item.id, 'REJECTED')} className="rounded-lg bg-red-300 px-3 py-1 text-xs font-semibold text-black">Rechazar</button>
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
