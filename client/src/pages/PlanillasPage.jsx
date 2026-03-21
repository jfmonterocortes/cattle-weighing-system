import { ArrowLeft, ArrowRight, CalendarDays, Download, FileStack, Filter, Search, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';
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

function SummaryCard({ icon, label, value, caption }) {
  const CardIcon = icon;

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-gradient-to-br from-white/95 to-zinc-50/80 p-4 shadow-sm dark:border-zinc-700/50 dark:from-zinc-800/70 dark:to-zinc-900/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">{label}</div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</div>
          <div className="mt-2 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">{caption}</div>
        </div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/90 text-white shadow-sm dark:bg-amber-500/90 dark:text-zinc-950">
          <CardIcon size={17} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{label}</div>
      {children}
    </label>
  );
}

function PaymentBadge({ isPaid }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        isPaid
          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100'
      }`}
    >
      {isPaid ? 'Pagada' : 'Pendiente'}
    </span>
  );
}

function ActionStateBadge({ role, userId, sheet }) {
  if (role === 'CLIENT') return null;

  if (role === 'ADMIN') {
    return (
      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900 dark:bg-sky-500/15 dark:text-sky-100">
        Gestión admin
      </span>
    );
  }

  const editableUntil = sheet.editableUntilByLiquidador ? new Date(sheet.editableUntilByLiquidador) : null;
  const isOwnEditableSheet =
    role === 'LIQUIDADOR' &&
    sheet.createdById === userId &&
    editableUntil instanceof Date &&
    !Number.isNaN(editableUntil.getTime()) &&
    new Date() <= editableUntil;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        isOwnEditableSheet
          ? 'bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100'
          : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
      }`}
    >
      {isOwnEditableSheet ? 'Edición abierta' : 'Solo lectura'}
    </span>
  );
}

function QueueSummaryItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value ?? '-'}</div>
    </div>
  );
}

function ClientStatusMetric({ label, value, caption }) {
  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-gradient-to-br from-white/90 to-zinc-50/80 p-4 shadow-sm dark:border-zinc-700/50 dark:from-zinc-800/60 dark:to-zinc-900/50">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</div>
      {caption && <div className="mt-1.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">{caption}</div>}
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10';

export default function PlanillasPage() {
  const { user } = getSession();
  const isAdmin = user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT';
  const isLiquidador = user?.role === 'LIQUIDADOR';
  const [clientHomeState, setClientHomeState] = useState({ loading: isClient, error: '', data: null });
  const [showClientAdvancedFilters, setShowClientAdvancedFilters] = useState(false);

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

  const paidCount = useMemo(() => state.items.filter((sheet) => sheet.isPaid).length, [state.items]);
  const unpaidCount = useMemo(() => state.items.filter((sheet) => !sheet.isPaid).length, [state.items]);
  const clientVisibleLatestDate = useMemo(() => {
    if (!isClient || state.items.length === 0) return null;
    const timestamps = state.items
      .map((sheet) => new Date(sheet.date))
      .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()))
      .map((value) => value.getTime());
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps));
  }, [isClient, state.items]);
  const clientAdvancedVisible =
    showClientAdvancedFilters ||
    Boolean(filters.seller.trim() || filters.buyer.trim() || filters.sellerPhone.trim() || filters.buyerPhone.trim());

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

        setState({
          loading: false,
          error: error.response?.data?.message || 'No se pudieron cargar las planillas.',
          items: [],
          total: 0,
          totalPages: 1,
          page: 1,
        });
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters]);

  useEffect(() => {
    if (!isClient) return undefined;

    let active = true;
    setClientHomeState({ loading: true, error: '', data: null });

    api
      .get('/settings')
      .then((res) => {
        if (!active) return;
        setClientHomeState({ loading: false, error: '', data: res.data });
      })
      .catch((error) => {
        if (!active) return;
        setClientHomeState({
          loading: false,
          error: error.response?.data?.message || 'No se pudo cargar el estado de tu cuenta.',
          data: null,
        });
      });

    return () => {
      active = false;
    };
  }, [isClient]);

  const clearFilters = () => {
    setShowClientAdvancedFilters(false);
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
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'planillas.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.response?.data?.message || 'No se pudo exportar Excel.' }));
    }
  };

  const clientProfile = clientHomeState.data?.profile;
  const clientLink = clientHomeState.data?.link;
  const clientLinked = Boolean(clientProfile?.personId);
  const clientPendingLink = clientLink?.latestRequest?.status === 'PENDING';
  const emptyStateMessage = hasFilters
    ? 'No hay planillas para tus filtros.'
    : isClient
      ? clientLinked
        ? 'Aun no tienes planillas registradas.'
        : clientPendingLink
          ? 'Tu solicitud de vinculación sigue en revisión. Veras tus planillas aqui cuando quede aprobada.'
          : 'Tu cuenta todavía no esta vinculada a una persona. Ve a Mi cuenta para solicitar la vinculación.'
      : 'No hay planillas registradas.';

  return (
    <div className="space-y-6 stagger">
      <section className="overflow-hidden rounded-[2rem] border border-stone-200/60 bg-gradient-to-br from-amber-50/80 via-white to-emerald-50/60 p-6 shadow-[0_22px_65px_rgba(120,53,15,0.06)] dark:border-zinc-800/60 dark:from-[#17120b] dark:via-zinc-900 dark:to-[#0d1812] dark:shadow-[0_28px_75px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500 dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:text-zinc-400">
              <FileStack size={13} />
              Centro de planillas
            </div>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {isClient ? 'Mis planillas con lectura más clara.' : 'Planillas listas para filtrar, revisar y exportar.'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              {isClient
                ? 'Consulta tu historial, revisa pagos pendientes y entra rápido al detalle de cada movimiento.'
                : 'Cruza vendedor, comprador, teléfono, fechas y estado de pago desde una sola vista con contexto inmediato.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[480px]">
            <SummaryCard
              icon={FileStack}
              label={isClient ? 'Mis planillas' : 'Totales'}
              value={state.total}
              caption={isClient ? 'Total de registros visibles para tu cuenta con los filtros activos.' : 'Resultados disponibles con los filtros actuales.'}
            />
            <SummaryCard
              icon={Wallet}
              label={isClient ? 'Pendientes' : 'En página'}
              value={isClient ? unpaidCount : state.items.length}
              caption={isClient ? 'Planillas de esta página que aún esperan pago.' : `Página ${state.page} de ${state.totalPages}`}
            />
            <SummaryCard
              icon={CalendarDays}
              label={isClient ? 'Pagadas' : 'Pagadas'}
              value={paidCount}
              caption={isClient ? 'Registros de esta página que ya fueron marcados como pagados.' : 'Registros marcados como pagados en esta página.'}
            />
            <SummaryCard
              icon={Search}
              label={isClient ? 'Último movimiento' : 'Pendientes'}
              value={isClient ? (clientVisibleLatestDate ? clientVisibleLatestDate.toLocaleDateString() : '-') : unpaidCount}
              caption={isClient ? 'Fecha más reciente dentro de lo que estás viendo ahora.' : 'Registros que aún requieren seguimiento de pago.'}
            />
          </div>
        </div>
      </section>

      {isClient && (
        <section className="rounded-2xl border border-zinc-200/60 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-zinc-700/50 dark:bg-zinc-900/80 dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    clientLinked
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200'
                      : clientPendingLink
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'
                        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  {clientLinked ? 'Cuenta vinculada' : clientPendingLink ? 'Solicitud pendiente' : 'Sin vinculación'}
                </span>

                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300/80 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
                >
                  Ir a Mi cuenta
                  <ArrowRight size={13} />
                </Link>
              </div>

              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {clientLinked
                  ? clientProfile?.person?.name || 'Cuenta vinculada'
                  : clientPendingLink
                    ? 'Vinculación en revisión'
                    : 'Cuenta sin vincular'}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {clientLinked
                  ? 'Tu historial y pagos aparecen abajo. Usa Mi cuenta para actualizar datos o seguridad.'
                  : clientPendingLink
                    ? 'Cuando el administrador apruebe tu solicitud, tus planillas aparecerán aquí.'
                    : 'Vincula tu cuenta desde Mi cuenta para ver tus planillas.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:w-[340px]">
              <ClientStatusMetric
                label="Persona"
                value={clientProfile?.person?.name || (clientPendingLink ? 'En revisión' : 'Pendiente')}
              />
              <ClientStatusMetric
                label="Pendientes"
                value={unpaidCount}
              />
              <ClientStatusMetric
                label="Último movimiento"
                value={clientVisibleLatestDate ? clientVisibleLatestDate.toLocaleDateString() : '-'}
              />
              <ClientStatusMetric
                label="Pagina"
                value={`${state.page}/${state.totalPages}`}
              />
            </div>
          </div>

          {clientLinked && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, paymentStatus: '', page: 1 }))}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  !filters.paymentStatus
                    ? 'bg-emerald-900 text-white dark:bg-amber-500 dark:text-zinc-950'
                    : 'border border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, paymentStatus: 'unpaid', page: 1 }))}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.paymentStatus === 'unpaid'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'border border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70'
                }`}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, paymentStatus: 'paid', page: 1 }))}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.paymentStatus === 'paid'
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'border border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70'
                }`}
              >
                Pagadas
              </button>
            </div>
          )}

          <FeedbackBanner message={clientHomeState.error} type="error" className="mt-4" />
        </section>
      )}

      <section className="rounded-[1.9rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
              <Filter size={14} />
              Filtros y búsqueda
            </div>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {isClient ? 'Busca dentro de tu historial sin llenar la pantalla de ruido.' : 'Encuentra la planilla correcta sin perder tiempo.'}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {isClient
                ? 'La búsqueda general, la fecha y el pago quedan primero. Los filtros por contrapartes siguen disponibles cuando realmente los necesites.'
                : 'Ajusta los criterios que necesites y limpia la vista en un clic cuando quieras volver al panorama general.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
            >
              Limpiar filtros
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
              >
                <Download size={16} />
                Exportar Excel
              </button>
            )}
          </div>
        </div>

        {isClient ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Búsqueda general">
                <input
                  className={inputClass}
                  placeholder="Buscar general"
                  value={filters.q}
                  onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value, page: 1 }))}
                />
              </Field>

              <Field label="Estado de pago">
                <select
                  className={inputClass}
                  value={filters.paymentStatus}
                  onChange={(event) => setFilters((prev) => ({ ...prev, paymentStatus: event.target.value, page: 1 }))}
                >
                  <option value="">Todos los estados de pago</option>
                  <option value="paid">Pagadas</option>
                  <option value="unpaid">Pendientes</option>
                  <option value="paid_today">Pagadas hoy</option>
                  <option value="paid_yesterday">Pagadas ayer</option>
                </select>
              </Field>

              <Field label="Desde">
                <input
                  className={inputClass}
                  type="date"
                  value={filters.from}
                  onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value, page: 1 }))}
                />
              </Field>

              <Field label="Hasta">
                <input
                  className={inputClass}
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value, page: 1 }))}
                />
              </Field>
            </div>

            <div className="rounded-[1.45rem] border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Filtros secundarios</div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Usa contrapartes o teléfonos solo cuando quieras ubicar una planilla muy puntual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClientAdvancedFilters((value) => !value)}
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
                >
                  {clientAdvancedVisible ? 'Ocultar filtros por contraparte' : 'Ver filtros por contraparte'}
                </button>
              </div>

              {clientAdvancedVisible && (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Vendedor">
                    <input
                      className={inputClass}
                      placeholder="Vendedor"
                      value={filters.seller}
                      onChange={(event) => setFilters((prev) => ({ ...prev, seller: event.target.value, page: 1 }))}
                    />
                  </Field>

                  <Field label="Comprador">
                    <input
                      className={inputClass}
                      placeholder="Comprador"
                      value={filters.buyer}
                      onChange={(event) => setFilters((prev) => ({ ...prev, buyer: event.target.value, page: 1 }))}
                    />
                  </Field>

                  <Field label="Teléfono vendedor">
                    <input
                      className={inputClass}
                      placeholder="Teléfono vendedor"
                      value={filters.sellerPhone}
                      onChange={(event) => setFilters((prev) => ({ ...prev, sellerPhone: event.target.value, page: 1 }))}
                    />
                  </Field>

                  <Field label="Teléfono comprador">
                    <input
                      className={inputClass}
                      placeholder="Teléfono comprador"
                      value={filters.buyerPhone}
                      onChange={(event) => setFilters((prev) => ({ ...prev, buyerPhone: event.target.value, page: 1 }))}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Búsqueda general">
              <input
                className={inputClass}
                placeholder="Buscar general"
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value, page: 1 }))}
              />
            </Field>

            <Field label="Vendedor">
              <input
                className={inputClass}
                placeholder="Vendedor"
                value={filters.seller}
                onChange={(event) => setFilters((prev) => ({ ...prev, seller: event.target.value, page: 1 }))}
              />
            </Field>

            <Field label="Comprador">
              <input
                className={inputClass}
                placeholder="Comprador"
                value={filters.buyer}
                onChange={(event) => setFilters((prev) => ({ ...prev, buyer: event.target.value, page: 1 }))}
              />
            </Field>

            <Field label="Teléfono vendedor">
              <input
                className={inputClass}
                placeholder="Teléfono vendedor"
                value={filters.sellerPhone}
                onChange={(event) => setFilters((prev) => ({ ...prev, sellerPhone: event.target.value, page: 1 }))}
              />
            </Field>

            <Field label="Teléfono comprador">
              <input
                className={inputClass}
                placeholder="Teléfono comprador"
                value={filters.buyerPhone}
                onChange={(event) => setFilters((prev) => ({ ...prev, buyerPhone: event.target.value, page: 1 }))}
              />
            </Field>

            <Field label="Desde">
              <input
                className={inputClass}
                type="date"
                value={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value, page: 1 }))}
              />
            </Field>

            <Field label="Hasta">
              <input
                className={inputClass}
                type="date"
                value={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value, page: 1 }))}
              />
            </Field>

            <Field label="Estado de pago">
              <select
                className={inputClass}
                value={filters.paymentStatus}
                onChange={(event) => setFilters((prev) => ({ ...prev, paymentStatus: event.target.value, page: 1 }))}
              >
                <option value="">Todos los estados de pago</option>
                <option value="paid">Pagadas</option>
                <option value="unpaid">Pendientes</option>
                <option value="paid_today">Pagadas hoy</option>
                <option value="paid_yesterday">Pagadas ayer</option>
              </select>
            </Field>
          </div>
        )}
      </section>

      <FeedbackBanner message={state.error} type="error" />

      <section className="overflow-hidden rounded-[1.9rem] border border-zinc-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-3 border-b border-zinc-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {state.loading ? 'Cargando planillas...' : isClient ? 'Tu historial listo para revisar.' : 'Resultados listos para revisar.'}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {state.loading
                ? 'Actualizando la tabla con tus filtros.'
                : isClient
                  ? `${state.items.length} planillas visibles en esta página / ${state.total} en total`
                  : `${state.items.length} planillas en página / ${state.total} totales`}
            </p>
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {isClient ? 'Empieza por las pendientes y entra al detalle cuando necesites validar el movimiento.' : 'Navega entre páginas y entra al detalle de cada registro.'}
          </div>
        </div>

        <div className="space-y-3 p-4">
          {!state.loading && state.items.length === 0 && (
            <div className="rounded-[1.4rem] border border-dashed border-zinc-300/90 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
              {emptyStateMessage}
            </div>
          )}

          {state.items.map((sheet) => (
            <article
              key={sheet.id}
              className="rounded-[1.55rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-950/70"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Planilla {sheet.visibleNumber}</h4>
                    <PaymentBadge isPaid={sheet.isPaid} />
                    {isClient && (
                      <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
                        {new Date(sheet.date).toLocaleDateString()}
                      </span>
                    )}
                    <ActionStateBadge role={user?.role} userId={user?.userId} sheet={sheet} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{sheet.seller?.name || 'Sin vendedor'}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">→</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{sheet.buyer?.name || 'Sin comprador'}</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <QueueSummaryItem label="Cabezas" value={sheet.headCount} />
                    <QueueSummaryItem label="Peso total" value={sheet.totalWeight} />
                    <QueueSummaryItem label="Valor total" value={sheet.totalValue} />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-500">
                    {!isClient && <span>{new Date(sheet.date).toLocaleString()}</span>}
                    {isClient && <span>Movimiento registrado el {new Date(sheet.date).toLocaleString()}</span>}
                    {!isClient && sheet.liquidadorAliasSnapshot && <span>Liquidador: {sheet.liquidadorAliasSnapshot}</span>}
                    {isLiquidador && sheet.editableUntilByLiquidador && (
                      <span>Ventana: hasta {new Date(sheet.editableUntilByLiquidador).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 xl:justify-end">
                  <Link
                    to={`/planillas/${sheet.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
                  >
                    Ver detalle
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200/80 px-4 py-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:text-zinc-400">
          <div>Pagina {state.page} de {state.totalPages}</div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
              disabled={state.page <= 1 || state.loading}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              <ArrowLeft size={14} />
              Anterior
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
              disabled={state.page >= state.totalPages || state.loading}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Siguiente
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
