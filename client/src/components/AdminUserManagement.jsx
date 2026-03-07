import { useEffect, useState } from 'react';
import { api } from '../api';

function feedbackClass(type) {
  if (type === 'error') return 'text-red-300';
  if (type === 'success') return 'text-emerald-300';
  return 'text-zinc-400';
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserDraft, setEditingUserDraft] = useState({
    email: '',
    role: 'CLIENT',
    isActive: true,
    liquidadorAlias: '',
  });
  const [editingPersonDraft, setEditingPersonDraft] = useState({ name: '', phone: '', cedula: '' });
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: {
          limit: 100,
          q: search.trim() || undefined,
          role: role || undefined,
        },
      });
      setUsers(res.data || []);
    } catch (error) {
      setUsers([]);
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudieron cargar usuarios.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditingUserDraft({
      email: user.email || '',
      role: user.role || 'CLIENT',
      isActive: Boolean(user.isActive),
      liquidadorAlias: user.liquidadorAlias || '',
    });
    setEditingPersonDraft({
      name: user.person?.name || '',
      phone: user.person?.phone || '',
      cedula: user.person?.cedula || '',
    });
    setFeedback({ type: '', message: '' });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setFeedback({ type: '', message: '' });
  };

  const saveEdit = async (user) => {
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.patch(`/users/${user.id}`, {
        email: editingUserDraft.email,
        role: editingUserDraft.role,
        isActive: editingUserDraft.isActive,
        liquidadorAlias: editingUserDraft.liquidadorAlias || null,
      });

      if (user.person?.id) {
        await api.patch(`/people/${user.person.id}`, {
          name: editingPersonDraft.name,
          phone: editingPersonDraft.phone,
          cedula: editingPersonDraft.cedula,
        });
      }

      setFeedback({ type: 'success', message: `Usuario ${user.id} actualizado.` });
      setEditingUserId(null);
      await loadUsers();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar usuario/persona.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="text-lg font-semibold text-zinc-100">Gestion de usuarios/clientes</h3>
      <p className="text-sm text-zinc-400">Listado completo y editable de cuenta + persona vinculada.</p>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <input
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          placeholder="Buscar por email o nombre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="LIQUIDADOR">LIQUIDADOR</option>
          <option value="CLIENT">CLIENT</option>
        </select>
        <button type="button" onClick={loadUsers} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">
          Aplicar filtros
        </button>
        <div className="self-center text-xs text-zinc-500">{loading ? 'Cargando...' : `${users.length} usuarios`}</div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              <th className="px-2 py-2">User ID</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Rol</th>
              <th className="px-2 py-2">Activo</th>
              <th className="px-2 py-2">Person ID</th>
              <th className="px-2 py-2">Nombre persona</th>
              <th className="px-2 py-2">Telefono</th>
              <th className="px-2 py-2">Cedula</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const editing = editingUserId === user.id;

              return (
                <tr key={user.id} className="border-b border-zinc-800/70 text-zinc-200 align-top">
                  <td className="px-2 py-2">{user.id}</td>
                  <td className="px-2 py-2">
                    {editing ? (
                      <input className="w-52 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingUserDraft.email} onChange={(e) => setEditingUserDraft((p) => ({ ...p, email: e.target.value }))} />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editing ? (
                      <select className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingUserDraft.role} onChange={(e) => setEditingUserDraft((p) => ({ ...p, role: e.target.value }))}>
                        <option value="ADMIN">ADMIN</option>
                        <option value="LIQUIDADOR">LIQUIDADOR</option>
                        <option value="CLIENT">CLIENT</option>
                      </select>
                    ) : (
                      user.role
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editing ? (
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={editingUserDraft.isActive} onChange={(e) => setEditingUserDraft((p) => ({ ...p, isActive: e.target.checked }))} />
                        <span>{editingUserDraft.isActive ? 'SI' : 'NO'}</span>
                      </label>
                    ) : user.isActive ? 'SI' : 'NO'}
                  </td>
                  <td className="px-2 py-2">{user.personId || '-'}</td>
                  <td className="px-2 py-2">
                    {editing && user.person ? (
                      <input className="w-40 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingPersonDraft.name} onChange={(e) => setEditingPersonDraft((p) => ({ ...p, name: e.target.value }))} />
                    ) : (
                      user.person?.name || '-'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editing && user.person ? (
                      <input className="w-32 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingPersonDraft.phone} onChange={(e) => setEditingPersonDraft((p) => ({ ...p, phone: e.target.value }))} />
                    ) : (
                      user.person?.phone || '-'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editing && user.person ? (
                      <input className="w-32 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={editingPersonDraft.cedula} onChange={(e) => setEditingPersonDraft((p) => ({ ...p, cedula: e.target.value }))} />
                    ) : (
                      user.person?.cedula || '-'
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {editing ? (
                      <div className="flex justify-end gap-2">
                        <button type="button" className="rounded-md border border-zinc-700 px-2 py-1 text-xs" onClick={cancelEdit}>
                          Cancelar
                        </button>
                        <button type="button" className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black disabled:opacity-60" disabled={saving} onClick={() => saveEdit(user)}>
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="rounded-md border border-zinc-700 px-2 py-1 text-xs" onClick={() => startEdit(user)}>
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

      <div className={`mt-3 text-sm ${feedbackClass(feedback.type)}`}>{feedback.message}</div>
    </div>
  );
}
