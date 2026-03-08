import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getSession } from '../utils/authSession';

export default function DashboardPage() {
  const { user } = getSession();
  const isAdmin = user?.role === 'ADMIN';

  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0, recent: [] });
  const [pendingLinks, setPendingLinks] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [all, paid, unpaid, recent] = await Promise.all([
          api.get('/sheets', { params: { page: 1, pageSize: 1 } }),
          api.get('/sheets', { params: { paymentStatus: 'paid', page: 1, pageSize: 1 } }),
          api.get('/sheets', { params: { paymentStatus: 'unpaid', page: 1, pageSize: 1 } }),
          api.get('/sheets', { params: { page: 1, pageSize: 5 } }),
        ]);

        if (!active) return;
        setStats({
          total: all.data.total || 0,
          paid: paid.data.total || 0,
          unpaid: unpaid.data.total || 0,
          recent: recent.data.items || [],
        });

        if (isAdmin) {
          const req = await api.get('/link-requests', { params: { status: 'PENDING' } });
          if (!active) return;
          setPendingLinks(Array.isArray(req.data) ? req.data.filter((x) => x.status === 'PENDING').length : 0);
        }
      } catch {
        if (!active) return;
        setStats({ total: 0, paid: 0, unpaid: 0, recent: [] });
        setPendingLinks(0);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const cards = useMemo(
    () => [
      { label: 'Planillas registradas', value: stats.total },
      { label: 'Planillas pagadas', value: stats.paid },
      { label: 'Planillas pendientes', value: stats.unpaid },
      ...(isAdmin ? [{ label: 'Solicitudes de vinculación pendientes', value: pendingLinks }] : []),
    ],
    [stats, pendingLinks, isAdmin]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Panel Operativo</h2>
        <p className="text-sm text-zinc-400">BASCULA LA ESPERANZA</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs text-zinc-500">{card.label}</div>
            <div className="text-2xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Acciones rápidas</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-zinc-700 px-3 py-2" to="/planillas">Ver planillas</Link>
          <Link className="rounded-lg border border-zinc-700 px-3 py-2" to="/planillas/new">Nueva planilla</Link>
          <Link className="rounded-lg border border-zinc-700 px-3 py-2" to="/personas">Gestionar personas</Link>
          {isAdmin && <Link className="rounded-lg border border-zinc-700 px-3 py-2" to="/usuarios">Gestionar usuarios</Link>}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Planillas recientes</h3>
        <div className="space-y-2 text-sm">
          {stats.recent.length === 0 && <div className="text-zinc-500">Sin registros recientes.</div>}
          {stats.recent.map((sheet) => (
            <div key={sheet.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <div>
                <div className="font-medium">{sheet.visibleNumber}</div>
                <div className="text-xs text-zinc-500">{sheet.seller?.name} → {sheet.buyer?.name}</div>
              </div>
              <Link className="rounded border border-zinc-700 px-2 py-1 text-xs" to={`/planillas/${sheet.id}`}>Abrir</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
