import {
  ArrowRight,
  BadgeDollarSign,
  ClipboardList,
  FileStack,
  Link2,
  ShieldCheck,
  Tractor,
  UserCog,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';
import { getSession } from '../utils/authSession';
import { fmtCurrency, fmtNumber, fmtWeight } from '../utils/format';

function SummaryCard({ icon, label, value, tone = 'neutral' }) {
  const CardIcon = icon;
  const toneStyles = {
    neutral: 'border-zinc-200/80 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950/60',
    amber: 'border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10',
    emerald: 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    blue: 'border-sky-200/80 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10',
  };

  return (
    <div className={`rounded-[1.5rem] border p-4 shadow-sm ${toneStyles[tone] || toneStyles.neutral}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <CardIcon size={18} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ eyebrow, title, description, actions, children }) {
  return (
    <section className="rounded-[1.9rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function QuickAction({ to, label, caption, primary = false }) {
  return (
    <Link
      to={to}
      className={`rounded-[1.35rem] border px-4 py-4 transition ${
        primary
          ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-700 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
          : 'border-zinc-200 bg-white/80 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-950/80'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`text-sm font-semibold ${primary ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`}>{label}</div>
          <div className={`mt-1 text-sm ${primary ? 'text-zinc-100 dark:text-zinc-700' : 'text-zinc-600 dark:text-zinc-400'}`}>{caption}</div>
        </div>
        <ArrowRight size={16} className={primary ? 'text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'} />
      </div>
    </Link>
  );
}

function RecentSheetItem({ sheet }) {
  return (
    <div className="rounded-[1.35rem] border border-zinc-200/80 bg-white/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Planilla {sheet.visibleNumber}</div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                sheet.isPaid
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100'
              }`}
            >
              {sheet.isPaid ? 'Pagada' : 'Pendiente'}
            </span>
          </div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{sheet.seller?.name || 'Sin vendedor'}</span>
            <span className="mx-2 text-zinc-400 dark:text-zinc-500">{'->'}</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{sheet.buyer?.name || 'Sin comprador'}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-500">
            <span>Cabezas: {fmtNumber(sheet.headCount)}</span>
            <span>Peso: {fmtWeight(sheet.totalWeight)}</span>
            <span>Valor: {fmtCurrency(sheet.totalValue)}</span>
          </div>
        </div>

        <Link
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
          to={`/planillas/${sheet.id}`}
        >
          Ver detalle
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = getSession();
  const isAdmin = user?.role === 'ADMIN';

  const [state, setState] = useState({
    loading: true,
    error: '',
    total: 0,
    paid: 0,
    unpaid: 0,
    recent: [],
    pendingLinks: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));

      try {
        const requests = [
          api.get('/sheets', { params: { page: 1, pageSize: 1 } }),
          api.get('/sheets', { params: { paymentStatus: 'paid', page: 1, pageSize: 1 } }),
          api.get('/sheets', { params: { paymentStatus: 'unpaid', page: 1, pageSize: 1 } }),
          api.get('/sheets', { params: { page: 1, pageSize: 6 } }),
        ];

        if (isAdmin) {
          requests.push(api.get('/link-requests'));
        }

        const [all, paid, unpaid, recent, linkResponse] = await Promise.all(requests);
        if (cancelled) return;

        const pendingLinks = Array.isArray(linkResponse?.data)
          ? linkResponse.data.filter((item) => item.status === 'PENDING')
          : [];

        setState({
          loading: false,
          error: '',
          total: Number(all.data?.total || 0),
          paid: Number(paid.data?.total || 0),
          unpaid: Number(unpaid.data?.total || 0),
          recent: Array.isArray(recent.data?.items) ? recent.data.items : [],
          pendingLinks,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          loading: false,
          error: error.response?.data?.message || 'No se pudo cargar el centro operativo.',
          total: 0,
          paid: 0,
          unpaid: 0,
          recent: [],
          pendingLinks: [],
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const editableNowCount = useMemo(() => {
    if (user?.role !== 'LIQUIDADOR') return 0;

    return state.recent.filter((sheet) => {
      if (sheet.createdById !== user.userId || !sheet.editableUntilByLiquidador) return false;
      const editableUntil = new Date(sheet.editableUntilByLiquidador);
      return !Number.isNaN(editableUntil.getTime()) && new Date() <= editableUntil;
    }).length;
  }, [state.recent, user?.role, user?.userId]);

  const overviewCards = isAdmin
    ? [
        { icon: Link2, label: 'Solicitudes pendientes', value: fmtNumber(state.pendingLinks.length), tone: state.pendingLinks.length ? 'amber' : 'neutral' },
        { icon: Wallet, label: 'Pendientes de pago', value: fmtNumber(state.unpaid), tone: state.unpaid ? 'amber' : 'neutral' },
        { icon: BadgeDollarSign, label: 'Pagadas', value: fmtNumber(state.paid), tone: 'emerald' },
        { icon: FileStack, label: 'Planillas registradas', value: fmtNumber(state.total), tone: 'blue' },
      ]
    : [
        { icon: Wallet, label: 'Pendientes de pago', value: fmtNumber(state.unpaid), tone: state.unpaid ? 'amber' : 'neutral' },
        { icon: Tractor, label: 'Edicion abierta', value: fmtNumber(editableNowCount), tone: editableNowCount ? 'blue' : 'neutral' },
        { icon: ClipboardList, label: 'Planillas recientes', value: fmtNumber(state.recent.length), tone: 'neutral' },
        { icon: BadgeDollarSign, label: 'Pagadas', value: fmtNumber(state.paid), tone: 'emerald' },
      ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 shadow-[0_22px_65px_rgba(120,53,15,0.08)] dark:border-zinc-800 dark:from-[#17120b] dark:via-zinc-900 dark:to-[#0c1620] dark:shadow-[0_28px_75px_rgba(0,0,0,0.42)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200">
              <ClipboardList size={14} />
              Centro operativo
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {isAdmin ? 'Centro operativo' : 'Tu operacion del dia'}
            </h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[500px]">
            {overviewCards.map((card) => (
              <SummaryCard key={card.label} icon={card.icon} label={card.label} value={card.value} caption={card.caption} tone={card.tone} />
            ))}
          </div>
        </div>
      </section>

      <FeedbackBanner message={state.error} type="error" />

      <SectionCard
        eyebrow="Acciones principales"
        title={isAdmin ? 'Supervision y atencion' : 'Operacion del dia'}
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <QuickAction to="/planillas/new" label="Registrar planilla" caption="Nueva pesada" primary />
          <QuickAction to="/planillas" label="Revisar planillas" caption="Filtros, pagos y detalles" />
          {isAdmin ? (
            <QuickAction to="/usuarios" label="Cuentas y vinculaciones" caption="Solicitudes y accesos" />
          ) : (
            <QuickAction to="/personas" label="Personas" caption="Vendedores y compradores" />
          )}
        </div>
      </SectionCard>

      {isAdmin && (
        <SectionCard
          eyebrow="Cola de vinculaciones"
          title="Solicitudes pendientes"
          actions={
            <Link
              to="/usuarios"
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
            >
              Abrir cuentas y vinculaciones
              <ArrowRight size={16} />
            </Link>
          }
        >
          <div className="space-y-3">
            {!state.loading && state.pendingLinks.length === 0 && (
              <div className="rounded-[1.35rem] border border-dashed border-zinc-300/90 bg-zinc-50/80 px-4 py-5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
                No hay solicitudes pendientes en este momento.
              </div>
            )}

            {state.pendingLinks.slice(0, 4).map((request) => (
              <div
                key={request.id}
                className="rounded-[1.35rem] border border-zinc-200/80 bg-white/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {request.user?.email || 'Cuenta'} {'->'} {request.person?.name || 'Persona'}
                      </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{request.notes || 'Sin notas adicionales.'}</div>
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
                    {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : 'Pendiente'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        eyebrow="Actividad reciente"
        title="Planillas recientes"
      >
        <div className="space-y-3">
          {!state.loading && state.recent.length === 0 && (
            <div className="rounded-[1.35rem] border border-dashed border-zinc-300/90 bg-zinc-50/80 px-4 py-5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
              Aun no hay planillas recientes para mostrar.
            </div>
          )}

          {state.recent.map((sheet) => (
            <RecentSheetItem key={sheet.id} sheet={sheet} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
