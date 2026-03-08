import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getSession } from '../utils/authSession';

export default function DashboardPage() {
  const { user } = getSession();
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0 });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [all, paid, unpaid] = await Promise.all([
          api.get('/sheets', { params: { page: 1, pageSize: 1 } }),
          api.get('/sheets', { params: { paymentStatus: 'paid', page: 1, pageSize: 1 } }),
          api.get('/sheets', { params: { paymentStatus: 'unpaid', page: 1, pageSize: 1 } }),
        ]);
        if (!active) return;
        setStats({ total: all.data.total || 0, paid: paid.data.total || 0, unpaid: unpaid.data.total || 0 });
      } catch {
        if (!active) return;
        setStats({ total: 0, paid: 0, unpaid: 0 });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(
    () => [
      { label: 'Planillas accesibles', value: stats.total },
      { label: 'Pagadas', value: stats.paid },
      { label: 'Pendientes', value: stats.unpaid },
    ],
    [stats]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-zinc-400">Resumen general para rol {user?.role || '-'}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs text-zinc-500">{card.label}</div>
            <div className="text-2xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-zinc-700 px-3 py-2" to="/planillas">
            Ver planillas
          </Link>
          {(user?.role === 'ADMIN' || user?.role === 'LIQUIDADOR') && (
            <Link className="rounded-lg border border-zinc-700 px-3 py-2" to="/planillas/new">
              Nueva planilla
            </Link>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'LIQUIDADOR') && (
            <Link className="rounded-lg border border-zinc-700 px-3 py-2" to="/personas">
              Gestionar personas
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
