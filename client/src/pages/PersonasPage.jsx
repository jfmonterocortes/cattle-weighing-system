import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { getSession } from '../utils/authSession';

function linkedBadge(person) {
  return person.user ? 'Vinculada' : 'Sin vínculo';
}

export default function PersonasPage() {
  const { user } = getSession();
  const isAdmin = user?.role === 'ADMIN';
  const isLiquidador = user?.role === 'LIQUIDADOR';

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0, totalPages: 1 });
  const [createForm, setCreateForm] = useState({ name: '', phone: '', cedula: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: '', phone: '', cedula: '' });

  const canAccess = isAdmin || isLiquidador;

  const load = async (override = {}) => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await api.get('/people', { params: { q: override.q ?? q, page: override.page ?? page, pageSize: 20 } });
      setState({
        loading: false,
        error: '',
        items: res.data.items || [],
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1,
      });
      setPage(res.data.page || 1);
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.message || 'No se pudieron cargar personas.', items: [], total: 0, totalPages: 1 });
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    const t = setTimeout(() => load({ page: 1 }), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!canAccess) return;
    load();
  }, [page]);

  const startEdit = (person) => {
    setEditingId(person.id);
    setDraft({ name: person.name || '', phone: person.phone || '', cedula: person.cedula || '' });
  };

  const saveEdit = async (personId) => {
    setFeedback({ type: '', message: '' });
    const payload = isAdmin ? draft : { phone: draft.phone, cedula: draft.cedula };
    try {
      await api.patch(`/people/${personId}`, payload);
      setFeedback({ type: 'success', message: 'Persona actualizada.' });
      setEditingId(null);
      await load();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar la persona.' });
    }
  };

  const createPerson = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    try {
      await api.post('/people', createForm);
      setCreateForm({ name: '', phone: '', cedula: '' });
      setFeedback({ type: 'success', message: 'Persona creada correctamente.' });
      await load({ page: 1 });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la persona.' });
    }
  };

  const feedbackClass = useMemo(() => (feedback.type === 'error' ? 'text-red-300' : feedback.type === 'success' ? 'text-emerald-300' : 'text-zinc-500'), [feedback.type]);

  if (!canAccess) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-300">Tu rol no tiene acceso al módulo de Personas.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Personas</h2>
        <p className="text-sm text-zinc-400">Listado operativo de vendedor/comprador y estado de vinculación con usuario.</p>
        <div className="mt-3 flex gap-2">
          <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono o cédula" />
          <button className="rounded-xl border border-zinc-700 px-3 py-2 text-sm" onClick={() => { setQ(''); setPage(1); }}>Limpiar</button>
        </div>
      </div>

      <form onSubmit={createPerson} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 grid gap-3 md:grid-cols-4">
        <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Nombre" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
        <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Teléfono" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
        <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Cédula" value={createForm.cedula} onChange={(e) => setCreateForm((p) => ({ ...p, cedula: e.target.value }))} />
        <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Crear persona</button>
      </form>

      {feedback.message && <div className={`text-sm ${feedbackClass}`}>{feedback.message}</div>}
      {state.error && <div className="rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">{state.error}</div>}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Cédula</th>
              <th className="px-3 py-2">Vinculación</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {state.loading && (
              <tr><td className="px-3 py-3 text-zinc-500" colSpan={6}>Cargando...</td></tr>
            )}
            {!state.loading && state.items.map((person) => {
              const editing = editingId === person.id;
              return (
                <tr key={person.id} className="border-b border-zinc-800/70 text-zinc-200">
                  <td className="px-3 py-2">{person.id}</td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <input className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" value={draft.name} disabled={!isAdmin} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
                    ) : (
                      person.name
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <input className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} />
                    ) : (
                      person.phone || '-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <input className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1" value={draft.cedula} onChange={(e) => setDraft((p) => ({ ...p, cedula: e.target.value }))} />
                    ) : (
                      person.cedula || '-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${person.user ? 'bg-emerald-900/30 text-emerald-300' : 'bg-zinc-800 text-zinc-300'}`}>{linkedBadge(person)}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editing ? (
                      <div className="flex justify-end gap-2">
                        <button className="rounded border border-zinc-700 px-2 py-1 text-xs" onClick={() => setEditingId(null)} type="button">Cancelar</button>
                        <button className="rounded bg-white px-2 py-1 text-xs font-semibold text-black" onClick={() => saveEdit(person.id)} type="button">Guardar</button>
                      </div>
                    ) : (
                      <button className="rounded border border-zinc-700 px-2 py-1 text-xs" onClick={() => startEdit(person)} type="button">Editar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div>{state.total} personas</div>
        <div className="flex gap-2">
          <button className="rounded border border-zinc-700 px-2 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <button className="rounded border border-zinc-700 px-2 py-1 disabled:opacity-50" disabled={page >= state.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}
