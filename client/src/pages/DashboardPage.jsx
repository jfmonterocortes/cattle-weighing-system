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

function SummaryCard({ icon, label, value, caption, tone = 'neutral' }) {
  const CardIcon = icon;
  // Cards sit inside the dark forest green hero — use glass/white style
  const toneStyles = {
    neutral: 'border-white/12 bg-white/8',
    amber:   'border-amber-400/25 bg-amber-500/10',
    emerald: 'border-white/12 bg-white/8',
    blue:    'border-sky-400/20 bg-sky-500/8',
  };
  const iconStyles = {
    neutral: 'bg-white/15 text-white',
    amber:   'bg-amber-500 text-[#1C3A22]',
    emerald: 'bg-white/15 text-white',
    blue:    'bg-sky-500/80 text-white',
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneStyles[tone] || toneStyles.neutral}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">{label}</div>
          <div className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white">{value}</div>
          <div className="mt-2 text-sm text-white/50">{caption}</div>
        </div>
        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles[tone] || iconStyles.neutral}`}>
          <CardIcon size={17} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ eyebrow, title, description, actions, children }) {
  return (
    <section className="rounded-2xl border border-stone-300/50 bg-stone-100/60 p-5 shadow-[0_4px_20px_rgba(28,58,34,0.06)] dark:border-white/6 dark:bg-white/3 dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
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

function QuickAction({ to, label, caption, primary = false }) {
  return (
    <Link
      to={to}
      className={`rounded-xl border px-4 py-4 transition-all duration-200 ${
        primary
          ? 'border-[#1C3A22] bg-[#1C3A22] text-white shadow-md shadow-[#1C3A22]/15 hover:bg-[#234d2c] dark:border-amber-500 dark:bg-amber-500 dark:text-[#1C3A22] dark:shadow-amber-500/15 dark:hover:bg-amber-400'
          : 'border-stone-300/60 bg-white/60 hover:border-stone-400/50 hover:bg-white/80 dark:border-white/8 dark:bg-white/4 dark:hover:bg-white/8'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`text-sm font-semibold ${primary ? 'text-white dark:text-[#1C3A22]' : 'text-zinc-900 dark:text-zinc-100'}`}>{label}</div>
          <div className={`mt-1 text-sm ${primary ? 'text-white/70 dark:text-[#1C3A22]/70' : 'text-stone-600 dark:text-white/45'}`}>{caption}</div>
        </div>
        <ArrowRight size={16} aria-hidden="true" className={primary ? 'text-white/80 dark:text-[#1C3A22]' : 'text-stone-400 dark:text-white/35'} />
      </div>
    </Link>
  );
}

function RecentSheetItem({ sheet }) {
  return (
    <div className="rounded-xl border border-stone-300/50 bg-white/55 px-4 py-4 dark:border-white/6 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Planilla {sheet.visibleNumber}</div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                sheet.isPaid
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-500/12 dark:text-amber-300'
              }`}
            >
              {sheet.isPaid ? 'Pagada' : 'Pendiente'}
            </span>
          </div>
          <div className="mt-2 text-sm text-stone-700 dark:text-white/60">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{sheet.seller?.name || 'Sin vendedor'}</span>
            <span className="mx-2 text-stone-400 dark:text-white/25">→</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{sheet.buyer?.name || 'Sin comprador'}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs text-stone-500 dark:text-white/35">
            <span>Cabezas: {sheet.headCount ?? '-'}</span>
            <span>Peso total: {sheet.totalWeight ?? '-'}</span>
            <span>Valor: {sheet.totalValue ?? '-'}</span>
          </div>
        </div>

        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-stone-300/70 bg-white/60 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400/60 hover:bg-white/90 dark:border-white/8 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
          to={`/planillas/${sheet.id}`}
        >
          Ver detalle
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, activeRole } = getSession();
  const isAdmin = activeRole === 'ADMIN';

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
    if (activeRole !== 'LIQUIDADOR') return 0;
    return state.recent.filter((sheet) => sheet.createdById === user?.userId && !sheet.lockedByLiquidador).length;
  }, [state.recent, activeRole, user?.userId]);

  const overviewCards = isAdmin
    ? [
        {
          icon: Link2,
          label: 'Solicitudes pendientes',
          value: state.pendingLinks.length,
          caption: 'Vinculaciones por aprobar.',
          tone: state.pendingLinks.length ? 'amber' : 'neutral',
        },
        {
          icon: Wallet,
          label: 'Pendientes de pago',
          value: state.unpaid,
          caption: 'Sin pago registrado.',
          tone: state.unpaid ? 'amber' : 'neutral',
        },
        {
          icon: BadgeDollarSign,
          label: 'Pagadas',
          value: state.paid,
          caption: 'Con pago confirmado.',
          tone: 'emerald',
        },
        {
          icon: FileStack,
          label: 'Planillas registradas',
          value: state.total,
          caption: 'Total en el sistema.',
          tone: 'blue',
        },
      ]
    : [
        {
          icon: Wallet,
          label: 'Pendientes de pago',
          value: state.unpaid,
          caption: 'Sin pago registrado.',
          tone: state.unpaid ? 'amber' : 'neutral',
        },
        {
          icon: Tractor,
          label: 'Edición abierta',
          value: editableNowCount,
          caption: 'Sin cerrar.',
          tone: editableNowCount ? 'blue' : 'neutral',
        },
        {
          icon: ClipboardList,
          label: 'Planillas recientes',
          value: state.recent.length,
          caption: 'Cargadas en esta vista.',
          tone: 'neutral',
        },
        {
          icon: BadgeDollarSign,
          label: 'Pagadas',
          value: state.paid,
          caption: 'Con pago confirmado.',
          tone: 'emerald',
        },
      ];

  return (
    <div className="space-y-6 stagger">
      <section className="overflow-hidden rounded-2xl border border-[#1C3A22] bg-[#1C3A22] p-6 shadow-[0_8px_40px_rgba(28,58,34,0.30)] dark:border-[#162d1b] dark:bg-[#162d1b] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
              <ClipboardList size={13} />
              Centro operativo
            </div>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-white">
              {isAdmin ? 'Planillas, pagos y solicitudes de vinculación.' : 'Planillas abiertas y estado de pagos.'}
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              {isAdmin
                ? 'Revisa las solicitudes pendientes, el estado de pagos y entra rápido a lo que requiere atención.'
                : 'Registra nuevas planillas, revisa las que siguen abiertas y retoma el trabajo pendiente.'}
            </p>
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
        title="Acciones rápidas"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <QuickAction to="/planillas/new" label="Registrar planilla" caption="Nueva pesada con vendedor y comprador." primary />
          <QuickAction to="/planillas" label="Ver planillas" caption="Filtra, busca y revisa pagos." />
          {isAdmin ? (
            <QuickAction to="/usuarios" label="Cuentas y vinculaciones" caption="Gestiona cuentas y solicitudes." />
          ) : (
            <QuickAction to="/personas" label="Personas" caption="Vendedores y compradores." />
          )}
        </div>
      </SectionCard>

      {isAdmin && (
        <SectionCard
          eyebrow="Cola de vinculaciones"
          title="Solicitudes de vinculación pendientes"
          actions={
            <Link
              to="/usuarios"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300/70 bg-white/60 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400/60 hover:bg-white/90 dark:border-white/8 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            >
              Ver cuentas
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        >
          <div className="space-y-3">
            {!state.loading && state.pendingLinks.length === 0 && (
              <div className="rounded-xl border border-dashed border-stone-300/80 bg-stone-100/50 px-4 py-5 text-sm text-stone-600 dark:border-white/8 dark:bg-white/3 dark:text-white/40">
                Sin solicitudes pendientes.
              </div>
            )}

            {state.pendingLinks.slice(0, 4).map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-stone-300/50 bg-white/55 px-4 py-4 dark:border-white/6 dark:bg-white/3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {request.user?.email || 'Cuenta'} → {request.person?.name || 'Persona'}
                    </div>
                    <div className="mt-1 text-sm text-stone-600 dark:text-white/45">{request.notes || 'Sin notas adicionales.'}</div>
                  </div>
                  <div className="font-mono text-xs uppercase tracking-[0.16em] text-stone-400 dark:text-white/30">
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
            <div className="rounded-xl border border-dashed border-stone-300/80 bg-stone-100/50 px-4 py-5 text-sm text-stone-600 dark:border-white/8 dark:bg-white/3 dark:text-white/40">
              Sin planillas registradas.
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
