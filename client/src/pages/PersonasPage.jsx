import { Phone, Search, UserRound, Users2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';
import { getSession } from '../utils/authSession';

function SectionShell({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[1.9rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">{eyebrow}</div>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const inputClass =
  'w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10';

export default function PersonasPage() {
  const { user } = getSession();
  const isAdmin = user?.role === 'ADMIN';
  const isLiquidador = user?.role === 'LIQUIDADOR';
  const canAccess = isAdmin || isLiquidador;

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0, totalPages: 1 });
  const [createForm, setCreateForm] = useState({ name: '', phone: '', cedula: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: '', phone: '', cedula: '' });

  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      api
        .get('/people', { params: { q: q.trim() || undefined, page, pageSize: 20 } })
        .then((res) => {
          if (cancelled) return;
          setState({
            loading: false,
            error: '',
            items: res.data.items || [],
            total: res.data.total || 0,
            totalPages: res.data.totalPages || 1,
          });
        })
        .catch((error) => {
          if (cancelled) return;
          setState({ loading: false, error: error.response?.data?.message || 'No se pudieron cargar personas.', items: [], total: 0, totalPages: 1 });
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canAccess, page, q, reloadKey]);

  const reloadPeoplePage = () => setReloadKey((value) => value + 1);

  const startEdit = (person) => {
    setEditingId(person.id);
    setDraft({ name: person.name || '', phone: person.phone || '', cedula: person.cedula || '' });
  };

  const saveEdit = async (personId) => {
    const payload = isAdmin ? draft : { phone: draft.phone, cedula: draft.cedula };
    try {
      await api.patch(`/people/${personId}`, payload);
      setEditingId(null);
      setFeedback({ type: 'success', message: 'Persona actualizada.' });
      reloadPeoplePage();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar la persona.' });
    }
  };

  const createPerson = async (event) => {
    event.preventDefault();
    try {
      await api.post('/people', createForm);
      setCreateForm({ name: '', phone: '', cedula: '' });
      setFeedback({ type: 'success', message: 'Persona creada correctamente.' });
      if (page !== 1) setPage(1);
      else reloadPeoplePage();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la persona.' });
    }
  };

  const linkedCount = useMemo(() => state.items.filter((person) => Boolean(person.user)).length, [state.items]);

  if (!canAccess) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-5 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
        Tu rol no tiene acceso al directorio de personas.
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <section className="overflow-hidden rounded-[2rem] border border-stone-200/60 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/60 p-6 shadow-[0_22px_65px_rgba(16,185,129,0.06)] dark:border-zinc-800/60 dark:from-[#0d1812] dark:via-zinc-900 dark:to-[#18120b] dark:shadow-[0_28px_75px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500 dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:text-zinc-400">
              <Users2 size={13} />
              Directorio operativo
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Gestiona el directorio de vendedores y compradores con la vinculación a la vista.</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Las personas son la base de las planillas y de la visibilidad para clientes. Mantener este directorio claro evita errores de captura y problemas de enlace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
            <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Personas en página</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{state.items.length}</div>
            </div>
            <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Con cuenta vinculada</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{linkedCount}</div>
            </div>
          </div>
        </div>
      </section>

      <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} />
      <FeedbackBanner message={state.error} type="error" />

      <SectionShell eyebrow="Búsqueda y permisos" title="Busca rápido y edita según tu rol" description={isAdmin ? 'Como ADMIN puedes crear personas y editar nombre, teléfono y cédula.' : 'Como LIQUIDADOR puedes usar el directorio y corregir contacto o cédula sin cambiar el nombre base.'}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="flex gap-3">
            <div className="relative w-full">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input className={`${inputClass} pl-11`} value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Buscar por nombre, teléfono o cédula" />
            </div>
          </div>
          <button type="button" className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" onClick={() => { setQ(''); setPage(1); }}>
            Limpiar búsqueda
          </button>
        </div>
      </SectionShell>

      <SectionShell eyebrow="Alta de persona" title="Agregar un nuevo actor al directorio" description="Crea rápidamente la persona cuando no exista todavía en el flujo operativo.">
        <form onSubmit={createPerson} className="grid gap-4 md:grid-cols-4">
          <input className={inputClass} placeholder="Nombre" value={createForm.name} onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input className={inputClass} placeholder="Teléfono" value={createForm.phone} onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <input className={inputClass} placeholder="Cédula" value={createForm.cedula} onChange={(event) => setCreateForm((prev) => ({ ...prev, cedula: event.target.value }))} />
          <button className="rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400">Crear persona</button>
        </form>
      </SectionShell>

      <SectionShell eyebrow="Listado" title="Personas del directorio" description="Consulta vínculos, contacto y datos base sin perder la vista de las personas más importantes para las planillas.">
        <div className="overflow-x-auto rounded-[1.5rem] border border-zinc-200/80 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50/90 text-left text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-3 font-medium">Nombre</th>
                <th className="px-3 py-3 font-medium">Teléfono</th>
                <th className="px-3 py-3 font-medium">Cédula</th>
                <th className="px-3 py-3 font-medium">Vinculación</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {state.loading && <tr><td className="px-3 py-6 text-zinc-500 dark:text-zinc-400" colSpan={5}>Cargando...</td></tr>}
              {!state.loading && state.items.map((person) => {
                const editing = editingId === person.id;
                return (
                  <tr key={person.id} className="border-t border-zinc-200/80 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                    <td className="px-3 py-3">{editing ? <input className={inputClass} value={draft.name} disabled={!isAdmin} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} /> : person.name}</td>
                    <td className="px-3 py-3">{editing ? <input className={inputClass} value={draft.phone} onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))} /> : person.phone || '-'}</td>
                    <td className="px-3 py-3">{editing ? <input className={inputClass} value={draft.cedula} onChange={(event) => setDraft((prev) => ({ ...prev, cedula: event.target.value }))} /> : person.cedula || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${person.user ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'}`}>
                        {person.user ? 'Vinculada' : 'Sin vinculo'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {editing ? (
                        <div className="flex justify-end gap-2">
                          <button className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" onClick={() => setEditingId(null)} type="button">Cancelar</button>
                          <button className="rounded-xl bg-emerald-900 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-900/15 transition hover:bg-emerald-800 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/10 dark:hover:bg-amber-400" onClick={() => saveEdit(person.id)} type="button">Guardar</button>
                        </div>
                      ) : (
                        <button className="rounded-2xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70" onClick={() => startEdit(person)} type="button">Editar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <div>{state.total} personas totales</div>
          <div className="flex gap-2">
            <button type="button" className="rounded-2xl border border-zinc-300 px-3 py-2 disabled:opacity-50 dark:border-zinc-700" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>
            <button type="button" className="rounded-2xl border border-zinc-300 px-3 py-2 disabled:opacity-50 dark:border-zinc-700" disabled={page >= state.totalPages} onClick={() => setPage((value) => value + 1)}>Siguiente</button>
          </div>
        </div>
      </SectionShell>
    </div>
  );
}
