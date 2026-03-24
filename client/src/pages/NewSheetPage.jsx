import { ArrowRight, ChevronDown, ClipboardPenLine, PlusCircle, Settings2, UserRound, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';
import PersonAutocomplete from '../components/PersonAutocomplete';
import { getSession } from '../utils/authSession';

function SummaryCard({ icon, label, value }) {
  const CardIcon = icon;

  return (
    <div className="rounded-xl border border-white/12 bg-white/8 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">{label}</div>
          <div className="mt-2 text-sm font-semibold text-white">{value}</div>
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-[#1C3A22]">
          <CardIcon size={18} />
        </div>
      </div>
    </div>
  );
}

function toIsoDateTime(value) {
  if (!value) return undefined;
  // datetime-local values are parsed as local time by the browser; correct for
  // the timezone offset so the UTC ISO string represents the intended local time.
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const offsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offsetMs).toISOString();
}

export default function NewSheetPage() {
  const { user, activeRole } = getSession();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedFields, setAdvancedFields] = useState({
    date: '',
    pricePerHead: '',
    liquidadorAlias: '',
  });
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [sheetFeedback, setSheetFeedback] = useState({ type: '', message: '' });

  const isOperator = activeRole === 'ADMIN' || activeRole === 'LIQUIDADOR';

  if (!isOperator) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-5 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
        Tu rol no puede crear planillas.
      </div>
    );
  }

  const createPersonInline = async (name, kind) => {
    try {
      const res = await api.post('/people', { name });
      const created = res.data;
      if (kind === 'seller') setSeller(created);
      if (kind === 'buyer') setBuyer(created);
      setSheetFeedback({ type: 'success', message: `Persona creada: ${created.name}` });
      return created;
    } catch (error) {
      const message = error.response?.data?.message || 'No se pudo crear la persona.';
      setSheetFeedback({ type: 'error', message });
      throw error;
    }
  };

  const createSheet = async (event) => {
    event.preventDefault();
    setSheetFeedback({ type: '', message: '' });

    if (!seller?.id || !buyer?.id) {
      setSheetFeedback({ type: 'error', message: 'Debes seleccionar vendedor y comprador.' });
      return;
    }

    setCreatingSheet(true);
    try {
      const payload = {
        sellerId: seller.id,
        buyerId: buyer.id,
      };

      const isoDate = toIsoDateTime(advancedFields.date);
      if (isoDate) payload.date = isoDate;
      if (advancedFields.pricePerHead.trim()) payload.pricePerHead = Number(advancedFields.pricePerHead);
      if (advancedFields.liquidadorAlias.trim()) payload.liquidadorAlias = advancedFields.liquidadorAlias.trim();

      const res = await api.post('/sheets', payload);

      setSheetFeedback({ type: 'success', message: `Planilla creada: ${res.data.visibleNumber}.` });
      navigate(`/planillas/${res.data.id}`);
    } catch (error) {
      setSheetFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la planilla.' });
    } finally {
      setCreatingSheet(false);
    }
  };

  return (
    <div className="space-y-6 stagger">
      <section className="overflow-hidden rounded-2xl bg-[#1C3A22] p-6 shadow-[0_8px_40px_rgba(28,58,34,0.30)] dark:bg-[#162d1b] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
              <ClipboardPenLine size={13} />
              Registrar planilla
            </div>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-white">Selecciona vendedor y comprador para crear la planilla.</h1>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Completa los datos principales abajo. Si necesitas fecha, precio o alias distinto al predeterminado, están en los ajustes opcionales.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[460px]">
            <SummaryCard icon={UserRound} label="Vendedor" value={seller?.name || 'Pendiente'} />
            <SummaryCard icon={UsersRound} label="Comprador" value={buyer?.name || 'Pendiente'} />
            <SummaryCard icon={PlusCircle} label="Estado inicial" value="Pendiente" />
          </div>
        </div>
      </section>

      <form onSubmit={createSheet} className="rounded-2xl border border-stone-300/50 bg-stone-100/60 p-6 shadow-sm dark:border-white/6 dark:bg-white/3">
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/8">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800 dark:text-emerald-200">Parte vendedora</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Vendedor</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Busca una persona existente o crea una nueva.
              </p>
            </div>

            <PersonAutocomplete
              label="Vendedor"
              value={seller}
              onSelect={setSeller}
              onCreate={(name) => createPersonInline(name, 'seller')}
              onError={(message) => setSheetFeedback({ type: 'error', message })}
            />

            {seller?.id && (
              <div className="mt-4 rounded-lg border border-stone-300/60 bg-white/70 px-4 py-3 text-sm text-stone-700 dark:border-white/8 dark:bg-white/5 dark:text-white/60">
                Seleccionado: <span className="font-semibold">{seller.name}</span>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-5 dark:border-amber-500/20 dark:bg-amber-500/8">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800 dark:text-amber-200">Parte compradora</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Comprador</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Busca una persona existente o crea una nueva.
              </p>
            </div>

            <PersonAutocomplete
              label="Comprador"
              value={buyer}
              onSelect={setBuyer}
              onCreate={(name) => createPersonInline(name, 'buyer')}
              onError={(message) => setSheetFeedback({ type: 'error', message })}
            />

            {buyer?.id && (
              <div className="mt-4 rounded-lg border border-stone-300/60 bg-white/70 px-4 py-3 text-sm text-stone-700 dark:border-white/8 dark:bg-white/5 dark:text-white/60">
                Seleccionado: <span className="font-semibold">{buyer.name}</span>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <button
            type="button"
            id="advanced-toggle"
            aria-expanded={advancedOpen}
            aria-controls="advanced-fields"
            onClick={() => setAdvancedOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white dark:bg-amber-500 dark:text-zinc-950">
                <Settings2 size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Opciones avanzadas</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Fecha, precio o alias diferentes al predeterminado.
                </div>
              </div>
            </div>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`text-zinc-500 transition ${advancedOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {advancedOpen && (
            <div id="advanced-fields" className="mt-5 grid gap-4 lg:grid-cols-3">
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Fecha y hora</div>
                <input
                  type="datetime-local"
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                  value={advancedFields.date}
                  onChange={(event) => setAdvancedFields((prev) => ({ ...prev, date: event.target.value }))}
                />
              </label>

              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Precio por cabeza</div>
                <input
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                  type="number"
                  min="0"
                  placeholder="5000"
                  value={advancedFields.pricePerHead}
                  onChange={(event) => setAdvancedFields((prev) => ({ ...prev, pricePerHead: event.target.value }))}
                />
              </label>

              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Alias de liquidador</div>
                <input
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
                  placeholder="Iniciales o alias"
                  value={advancedFields.liquidadorAlias}
                  onChange={(event) => setAdvancedFields((prev) => ({ ...prev, liquidadorAlias: event.target.value }))}
                />
              </label>
            </div>
          )}
        </section>

        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300/90 bg-zinc-50/90 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400">
          Al guardar se abre el detalle de la planilla para continuar con las reses, el pago y la exportación.
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-zinc-200/80 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <FeedbackBanner message={sheetFeedback.message} type={sheetFeedback.type || 'info'} />
          </div>
          <button
            type="submit"
            disabled={creatingSheet}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
          >
            <span>{creatingSheet ? 'Creando...' : 'Registrar planilla'}</span>
            {!creatingSheet && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
