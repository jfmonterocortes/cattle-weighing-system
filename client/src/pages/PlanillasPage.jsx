import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getSession } from '../utils/authSession';

function parseFilters(input) {
  return {
    q: input.q || undefined,
    seller: input.seller || undefined,
    buyer: input.buyer || undefined,
    sellerPhone: input.sellerPhone || undefined,
    buyerPhone: input.buyerPhone || undefined,
    from: input.from || undefined,
    to: input.to || undefined,
    paymentStatus: input.paymentStatus || undefined,
    page: input.page || 1,
    pageSize: input.pageSize || 20,
  };
}

export default function PlanillasPage() {
  const { user } = getSession();
  const isAdmin = user?.role === 'ADMIN';

  const [filters, setFilters] = useState({
    q: '',
    seller: '',
    buyer: '',
    sellerPhone: '',
    buyerPhone: '',
    from: '',
    to: '',
    paymentStatus: '',
    page: 1,
    pageSize: 20,
  });

  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0, totalPages: 1, page: 1 });

  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.q.trim() ||
          filters.seller.trim() ||
          filters.buyer.trim() ||
          filters.sellerPhone.trim() ||
          filters.buyerPhone.trim() ||
          filters.from ||
          filters.to ||
          filters.paymentStatus
      ),
    [filters]
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const res = await api.get('/sheets', { params: parseFilters(filters) });
        if (!active) return;
        setState({
          loading: false,
          error: '',
          items: Array.isArray(res.data?.items) ? res.data.items : [],
          total: Number(res.data?.total || 0),
          totalPages: Number(res.data?.totalPages || 1),
          page: Number(res.data?.page || 1),
        });
      } catch (error) {
        if (!active) return;
        setState({ loading: false, error: error.response?.data?.message || 'No se pudieron cargar las planillas.', items: [], total: 0, totalPages: 1, page: 1 });
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      q: '',
      seller: '',
      buyer: '',
      sellerPhone: '',
      buyerPhone: '',
      from: '',
      to: '',
      paymentStatus: '',
      page: 1,
      pageSize: 20,
    });
  };

  const exportExcel = async () => {
    try {
      const res = await api.get('/exports/excel', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'planillas.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.response?.data?.message || 'No se pudo exportar Excel.' }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Planillas</h2>
        <p className="text-sm text-zinc-400">Búsqueda instantánea por nombre, teléfono, fecha y estado de pago.</p>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Buscar general" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value, page: 1 }))} />
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Vendedor" value={filters.seller} onChange={(e) => setFilters((p) => ({ ...p, seller: e.target.value, page: 1 }))} />
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Comprador" value={filters.buyer} onChange={(e) => setFilters((p) => ({ ...p, buyer: e.target.value, page: 1 }))} />
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Teléfono vendedor" value={filters.sellerPhone} onChange={(e) => setFilters((p) => ({ ...p, sellerPhone: e.target.value, page: 1 }))} />
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Teléfono comprador" value={filters.buyerPhone} onChange={(e) => setFilters((p) => ({ ...p, buyerPhone: e.target.value, page: 1 }))} />
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value, page: 1 }))} />
          <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value, page: 1 }))} />
          <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={filters.paymentStatus} onChange={(e) => setFilters((p) => ({ ...p, paymentStatus: e.target.value, page: 1 }))}>
            <option value="">Todos los pagos</option>
            <option value="paid">Pagadas</option>
            <option value="unpaid">Pendientes</option>
            <option value="paid_today">Pagadas hoy</option>
            <option value="paid_yesterday">Pagadas ayer</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={clearFilters} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">Limpiar filtros</button>
          {isAdmin && (
            <button onClick={exportExcel} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">Exportar Excel</button>
          )}
        </div>
      </div>

      {state.error && <div className="rounded-xl border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">{state.error}</div>}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="border-b border-zinc-800 px-5 py-3 text-sm text-zinc-400">{state.loading ? 'Cargando...' : `${state.items.length} planillas en página / ${state.total} totales`}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-400">
                <th className="px-4 py-2">Planilla</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2">Comprador</th>
                <th className="px-4 py-2">Liquidador</th>
                <th className="px-4 py-2">Pago</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {!state.loading && state.items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-zinc-500" colSpan={8}>
                    {hasFilters ? 'No hay planillas para tus filtros.' : user?.role === 'CLIENT' ? 'No tienes planillas accesibles para tu rol.' : 'No hay planillas registradas.'}
                  </td>
                </tr>
              )}
              {state.items.map((sheet) => (
                <tr key={sheet.id} className="border-t border-zinc-800 text-zinc-200">
                  <td className="px-4 py-3 font-medium">{sheet.visibleNumber}</td>
                  <td className="px-4 py-3">{new Date(sheet.date).toLocaleString()}</td>
                  <td className="px-4 py-3">{sheet.seller?.name}</td>
                  <td className="px-4 py-3">{sheet.buyer?.name}</td>
                  <td className="px-4 py-3">{sheet.liquidadorAliasSnapshot}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${sheet.isPaid ? 'bg-emerald-900/30 text-emerald-300' : 'bg-amber-900/30 text-amber-300'}`}>
                      {sheet.isPaid ? 'Pagada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{sheet.totalValue}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/planillas/${sheet.id}`} className="rounded-lg border border-zinc-700 px-3 py-1 text-xs">Ver detalle</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
          <div>Página {state.page} de {state.totalPages}</div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 disabled:opacity-50"
              disabled={state.page <= 1 || state.loading}
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 disabled:opacity-50"
              disabled={state.page >= state.totalPages || state.loading}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
