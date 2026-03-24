import { ArrowLeft, ChevronDown, Download, GripVertical, History, PencilLine, Save, UserRound, Wallet, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';
import PersonAutocomplete from '../components/PersonAutocomplete';
import { getSession } from '../utils/authSession';

const CATEGORY_OPTIONS = ['TERNERA', 'TERNERO', 'NOVILLA', 'NOVILLO', 'BUFALA', 'BUFALO', 'VACA', 'TORO', 'OTHER'];
const SEX_OPTIONS = ['MACHO', 'HEMBRA'];

const CATEGORY_TO_TYPE_SEX = {
  TERNERA: { type: 'TERNERO', sex: 'HEMBRA' },
  TERNERO: { type: 'TERNERO', sex: 'MACHO'  },
  NOVILLA: { type: 'NOVILLO', sex: 'HEMBRA' },
  NOVILLO: { type: 'NOVILLO', sex: 'MACHO'  },
  BUFALA:  { type: 'BUFALO',  sex: 'HEMBRA' },
  BUFALO:  { type: 'BUFALO',  sex: 'MACHO'  },
  VACA:    { type: 'VACA',    sex: 'HEMBRA' },
  TORO:    { type: 'TORO',    sex: 'MACHO'  },
};

// Returns the category key for the dropdown (e.g. 'NOVILLO', 'VACA', 'OTHER').
function rowSelectCategory(row) {
  if (row.type === 'OTHER') return 'OTHER';
  const entry = Object.entries(CATEGORY_TO_TYPE_SEX).find(
    ([, v]) => v.type === row.type && v.sex === row.sex,
  );
  return entry ? entry[0] : `${row.type} ${row.sex}`;
}

// Returns the user-facing display label for a row (custom spec text for OTHER rows).
function rowDisplaySpec(row) {
  if (row.type === 'OTHER') return row.customSpecification || 'OTRO';
  return rowSelectCategory(row);
}
const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10';

function canEdit(role, sheet, userId) {
  if (role === 'ADMIN') return true;
  if (role === 'LIQUIDADOR' && sheet.createdById === userId && !sheet.lockedByLiquidador) return true;
  return false;
}

function toNumericOrNull(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateTimeInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function formatAuditAction(action) {
  const labels = {
    PLANILLA_CREATED: 'Planilla creada',
    PLANILLA_UPDATED: 'Encabezado actualizado',
    ROW_CREATED: 'Fila agregada',
    ROW_UPDATED: 'Fila actualizada',
    ROW_DELETED: 'Fila eliminada',
    ROWS_REORDERED: 'Filas reordenadas',
    PAYMENT_STATUS_CHANGED: 'Estado de pago actualizado',
  };
  return labels[action] || action || 'Movimiento registrado';
}

async function fetchNextCattleNumber(sheetId) {
  const res = await api.get(`/sheets/${sheetId}/rows/next-number`);
  return res.data.cattleNumber;
}

function Shell({ eyebrow, title, description, actions, className = '', children }) {
  return (
    <section className={`rounded-2xl border border-stone-300/50 bg-stone-100/60 p-5 shadow-sm dark:border-white/6 dark:bg-white/3 dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">{eyebrow}</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
          {description && <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, caption, variant = 'glass' }) {
  const isGlass = variant === 'glass';
  return (
    <div className={`rounded-xl border p-4 ${isGlass ? 'border-white/12 bg-white/8' : 'border-stone-300/50 bg-white/70 shadow-sm dark:border-white/8 dark:bg-white/5'}`}>
      <div className={`text-xs font-medium uppercase tracking-[0.18em] ${isGlass ? 'text-white/55' : 'text-zinc-500 dark:text-zinc-400'}`}>{label}</div>
      <div className={`mt-2 font-mono text-xl font-semibold ${isGlass ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>{value}</div>
      {caption && <div className={`mt-2 text-sm ${isGlass ? 'text-white/50' : 'text-zinc-500 dark:text-zinc-400'}`}>{caption}</div>}
    </div>
  );
}

function PartyCard({ icon, label, name, detail }) {
  const IconComponent = icon;
  return (
    <div className="rounded-xl border border-stone-300/50 bg-white/60 p-4 shadow-sm dark:border-white/6 dark:bg-white/3">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1C3A22] text-white dark:bg-amber-500 dark:text-[#1C3A22]">
          <IconComponent size={18} />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{label}</div>
          <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{name}</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function PaymentChip({ isPaid }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100'}`}>
      {isPaid ? 'Pagada' : 'Pendiente'}
    </span>
  );
}

export default function SheetDetailPage() {
  const { id } = useParams();
  const sheetId = Number(id);
  const { user, activeRole } = getSession();
  const role = activeRole;
  const userId = user?.userId;
  const isClient = role === 'CLIENT';

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [savingRow, setSavingRow] = useState(false);
  const [savingRowIds, setSavingRowIds] = useState(new Set());
  const [editingHeader, setEditingHeader] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [draftRow, setDraftRow] = useState({ category: 'TERNERO', customSpecification: '', sex: 'MACHO', weight: '', cattleNumber: '', letters: '' });
  const [sessionDefaults, setSessionDefaults] = useState({ category: 'TERNERO', customSpecification: '', sex: 'MACHO', lastNumericCattleNumber: null });
  const [headerDraft, setHeaderDraft] = useState({ seller: null, buyer: null, date: '', pricePerHead: '', liquidadorAliasSnapshot: '' });
  const [lockingSheet, setLockingSheet] = useState(false);
  const [lockConfirm, setLockConfirm] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(sheetId)) return;
    let cancelled = false;
    api
      .get(`/sheets/${sheetId}`)
      .then((res) => {
        if (cancelled) return;
        setSheet(res.data);
        setHeaderDraft({
          seller: res.data.seller,
          buyer: res.data.buyer,
          date: toDateTimeInputValue(res.data.date),
          pricePerHead: String(res.data.pricePerHead ?? ''),
          liquidadorAliasSnapshot: res.data.liquidadorAliasSnapshot || '',
        });
        const numericRows = (res.data.rows || []).map((row) => toNumericOrNull(row.cattleNumber)).filter((value) => Number.isFinite(value));
        setSessionDefaults((prev) => ({ ...prev, lastNumericCattleNumber: numericRows.length ? Math.max(...numericRows) : null }));
        setLoadError('');
      })
      .catch((error) => {
        if (!cancelled) {
          setSheet(null);
          setLoadError(error.response?.data?.message || 'No se pudo cargar la planilla.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, sheetId]);

  useEffect(() => {
    if (!sheet?.id) return;
    const localNext = Number.isFinite(sessionDefaults.lastNumericCattleNumber) ? String(sessionDefaults.lastNumericCattleNumber + 1) : '';
    // Only apply category/spec/sex defaults; never overwrite cattleNumber mid-edit.
    setDraftRow((prev) => ({
      ...prev,
      category: sessionDefaults.category,
      customSpecification: sessionDefaults.customSpecification,
      sex: sessionDefaults.sex,
    }));
    if (localNext) {
      setDraftRow((prev) => ({ ...prev, cattleNumber: localNext }));
      return;
    }
    let cancelled = false;
    fetchNextCattleNumber(sheetId).then((cattleNumber) => {
      if (!cancelled) setDraftRow((prev) => ({ ...prev, cattleNumber }));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionDefaults.lastNumericCattleNumber, sheet?.id, sheetId]); // category/spec/sex intentionally excluded to avoid mid-edit clobber

  const reloadDetail = () => setReloadKey((value) => value + 1);
  const editable = sheet ? canEdit(role, sheet, userId) : false;

  const handleLockSheet = async () => {
    setLockingSheet(true);
    setFeedback({ type: '', message: '' });
    try {
      await api.post(`/sheets/${sheetId}/lock`);
      setLockConfirm(false);
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo cerrar la planilla.' });
    } finally {
      setLockingSheet(false);
    }
  };
  const groupedStats = useMemo(() => sheet?.computed?.totalsByTypeSex || [], [sheet]);
  const paymentLogs = sheet?.paymentLogs || [];
  const auditLogs = sheet?.auditLogs || [];
  const paymentHeaderDetail = isClient
    ? 'Consulta el estado actual de esta planilla.'
    : `Creada por: ${sheet?.createdBy?.email || 'Sin dato'}`;

  const headerStateLabel = role === 'ADMIN' ? 'Control admin' : editable ? 'Edición abierta' : role === 'CLIENT' ? '' : 'Solo lectura';

  const addRow = async (event) => {
    event.preventDefault();
    setSavingRow(true);
    setFeedback({ type: '', message: '' });
    const basePayload = { category: draftRow.category, weight: Math.trunc(Number(draftRow.weight || 0)), cattleNumber: draftRow.cattleNumber || '1', letters: draftRow.letters || null };
    const rowPayload = draftRow.category === 'OTHER'
      ? { ...basePayload, customSpecification: draftRow.customSpecification, sex: draftRow.sex }
      : basePayload;
    try {
      await api.post(`/sheets/${sheetId}/rows`, rowPayload);
      const numeric = toNumericOrNull(rowPayload.cattleNumber);
      setSessionDefaults((prev) => ({ ...prev, category: rowPayload.category, customSpecification: draftRow.customSpecification, sex: draftRow.sex, lastNumericCattleNumber: Number.isFinite(numeric) ? numeric : prev.lastNumericCattleNumber }));
      setDraftRow((prev) => ({ ...prev, category: rowPayload.category, weight: '', cattleNumber: Number.isFinite(numeric) ? String(numeric + 1) : '', letters: '' }));
      setFeedback({ type: 'success', message: 'Fila agregada correctamente.' });
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo agregar la fila.' });
    } finally {
      setSavingRow(false);
    }
  };

  const updateRowField = async (rowId, patch) => {
    setSavingRowIds((prev) => new Set([...prev, rowId]));
    try {
      await api.patch(`/sheets/${sheetId}/rows/${rowId}`, patch);
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar la fila.' });
    } finally {
      setSavingRowIds((prev) => { const next = new Set(prev); next.delete(rowId); return next; });
    }
  };

  const deleteRow = async (rowId) => {
    try {
      await api.delete(`/sheets/${sheetId}/rows/${rowId}`);
      setFeedback({ type: 'success', message: 'Fila eliminada.' });
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo eliminar la fila.' });
    }
  };

  const onDropRow = async (event, targetRowId) => {
    event.preventDefault();
    const sourceId = Number(event.dataTransfer.getData('text/plain'));
    if (!sourceId || sourceId === targetRowId) return;
    const ids = sheet.rows.map((row) => row.id);
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetRowId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    ids.splice(sourceIndex, 1);
    ids.splice(targetIndex, 0, sourceId);
    try {
      await api.post(`/sheets/${sheetId}/rows/reorder`, { orderedRowIds: ids });
      setFeedback({ type: 'success', message: 'Filas reordenadas.' });
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudieron reordenar las filas.' });
    }
  };

  const moveRow = async (rowId, direction) => {
    const ids = sheet.rows.map((row) => row.id);
    const index = ids.indexOf(rowId);
    const next = index + direction;
    if (next < 0 || next >= ids.length) return;
    ids.splice(index, 1);
    ids.splice(next, 0, rowId);
    try {
      await api.post(`/sheets/${sheetId}/rows/reorder`, { orderedRowIds: ids });
      setFeedback({ type: 'success', message: `Fila movida ${direction === -1 ? 'arriba' : 'abajo'}.` });
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudieron reordenar las filas.' });
    }
  };

  const saveHeader = async () => {
    if (!headerDraft.seller?.id || !headerDraft.buyer?.id) {
      setFeedback({ type: 'error', message: 'Debes seleccionar vendedor y comprador para guardar el encabezado.' });
      return;
    }
    setSavingHeader(true);
    try {
      const payload = {
        sellerId: headerDraft.seller.id,
        buyerId: headerDraft.buyer.id,
        pricePerHead: Number(headerDraft.pricePerHead || 0),
        date: toIsoDateTime(headerDraft.date),
      };
      if (headerDraft.liquidadorAliasSnapshot.trim()) payload.liquidadorAliasSnapshot = headerDraft.liquidadorAliasSnapshot.trim();
      await api.patch(`/sheets/${sheetId}`, payload);
      setEditingHeader(false);
      setFeedback({ type: 'success', message: 'Encabezado actualizado.' });
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar el encabezado.' });
    } finally {
      setSavingHeader(false);
    }
  };

  const togglePayment = async () => {
    try {
      await api.post(`/sheets/${sheetId}/payment-status`, { isPaid: !sheet.isPaid, notes: sheet.isPaid ? 'Marcada pendiente' : 'Marcada pagada' });
      setFeedback({ type: 'success', message: `Estado actualizado: ${sheet.isPaid ? 'Pendiente' : 'Pagada'}.` });
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar el pago.' });
    }
  };

  const exportPdf = async () => {
    try {
      const res = await api.get(`/exports/sheet/${sheetId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `planilla-${sheet.visibleNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'PDF generado correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo exportar el PDF.' });
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-300/50 bg-stone-100/60 p-6 text-stone-700 shadow-sm dark:border-white/6 dark:bg-white/3 dark:text-white/60">
        Cargando...
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50/90 p-6 text-red-700 shadow-sm dark:border-red-700/50 dark:bg-red-950/30 dark:text-red-200">
        {loadError}
      </div>
    );
  }
  if (!sheet) {
    return (
      <div className="rounded-xl border border-stone-300/50 bg-stone-100/60 p-6 text-stone-700 shadow-sm dark:border-white/6 dark:bg-white/3 dark:text-white/60">
        Planilla no encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <section className="overflow-hidden rounded-2xl bg-[#1C3A22] p-6 shadow-[0_8px_40px_rgba(28,58,34,0.30)] dark:bg-[#162d1b] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
              <History size={13} />
              Planilla operativa
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link to="/planillas" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/15">
                <ArrowLeft size={16} aria-hidden="true" />
                Volver a planillas
              </Link>
              <PaymentChip isPaid={sheet.isPaid} />
              {!isClient && (
                <span className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold text-white/70">
                  {headerStateLabel}
                </span>
              )}
              {role === 'LIQUIDADOR' && editable && (
                lockConfirm ? (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs font-medium text-white/70">¿Cerrar definitivamente?</span>
                    <button
                      type="button"
                      disabled={lockingSheet}
                      onClick={handleLockSheet}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                    >
                      {lockingSheet ? 'Cerrando...' : 'Confirmar cierre'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLockConfirm(false)}
                      className="inline-flex items-center rounded-xl border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/15"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLockConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/15"
                  >
                    Cerrar planilla
                  </button>
                )
              )}
            </div>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-white">Planilla {sheet.visibleNumber}</h1>
            <p className="mt-3 text-sm leading-7 text-white/55">{new Date(sheet.date).toLocaleString()}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[480px]">
            <Stat label="Cabezas" value={sheet.headCount} caption="Total registradas." />
            <Stat label="Valor total" value={sheet.totalValue} caption="Total de la planilla." />
            {!isClient && <Stat label="Precio/cabeza" value={sheet.pricePerHead} caption="Precio de esta planilla." />}
            <Stat label="Liquidador" value={sheet.liquidadorAliasSnapshot || 'Sin alias'} caption="Alias en el encabezado." />
          </div>
        </div>
      </section>

      <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} />

      <Shell
        eyebrow="Encabezado de planilla"
        title="Encabezado"
        description={editable ? 'Revisa vendedor, comprador, fecha, precio y alias antes de continuar.' : null}
        actions={
          editable && (
            <button type="button" onClick={() => setEditingHeader((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70">
              <PencilLine size={16} />
              {editingHeader ? 'Cerrar edición' : 'Editar encabezado'}
            </button>
          )
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PartyCard icon={UserRound} label="Vendedor" name={sheet.seller.name} detail={sheet.seller.phone || 'Sin teléfono'} />
          <PartyCard icon={UserRound} label="Comprador" name={sheet.buyer.name} detail={sheet.buyer.phone || 'Sin teléfono'} />
          <PartyCard icon={Wallet} label="Pago" name={sheet.isPaid ? 'Pagada' : 'Pendiente'} detail={paymentHeaderDetail} />
        </div>
        <div className={`mt-4 grid gap-3 ${isClient ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <Stat variant="light" label="Fecha operativa" value={new Date(sheet.date).toLocaleString()} />
          {!isClient && <Stat variant="light" label="Precio por cabeza" value={sheet.pricePerHead} />}
          <Stat variant="light" label="Liquidador" value={sheet.liquidadorAliasSnapshot || 'Sin dato'} />
        </div>

        {editingHeader && (
          <div className="mt-5 rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">Edición segura</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Ajusta solo los datos principales del encabezado. Las reses y el pago se administran en sus secciónes respectivas.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <PersonAutocomplete label="Vendedor" value={headerDraft.seller} onSelect={(person) => setHeaderDraft((prev) => ({ ...prev, seller: person }))} />
              <PersonAutocomplete label="Comprador" value={headerDraft.buyer} onSelect={(person) => setHeaderDraft((prev) => ({ ...prev, buyer: person }))} />
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Fecha y hora</div>
                <input type="datetime-local" className={inputClass} value={headerDraft.date} onChange={(event) => setHeaderDraft((prev) => ({ ...prev, date: event.target.value }))} />
              </label>
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Precio por cabeza</div>
                <input className={inputClass} type="number" min="0" value={headerDraft.pricePerHead} onChange={(event) => setHeaderDraft((prev) => ({ ...prev, pricePerHead: event.target.value }))} />
              </label>
              <label className="lg:col-span-2">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Liquidador</div>
                <input className={inputClass} value={headerDraft.liquidadorAliasSnapshot} onChange={(event) => setHeaderDraft((prev) => ({ ...prev, liquidadorAliasSnapshot: event.target.value }))} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={saveHeader} disabled={savingHeader} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400">
                <Save size={16} />
                {savingHeader ? 'Guardando...' : 'Guardar encabezado'}
              </button>
              <button type="button" onClick={() => setEditingHeader(false)} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70">
                <X size={16} />
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Shell>

      <Shell eyebrow="Resumen" title="Lectura rápida de volumen y mezcla" description="Primero valida las métricas generales. Debajo queda el desglose técnico por especificación para confirmar promedios y distribución.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat variant="light" label="Cabezas" value={sheet.headCount} />
          <Stat variant="light" label="Peso total" value={sheet.totalWeight} />
          <Stat variant="light" label="Promedio general" value={sheet.averageWeight} />
          <Stat variant="light" label="Valor total" value={sheet.totalValue} />
          <Stat variant="light" label="Total machos" value={sheet.totalMaleWeight} />
          <Stat variant="light" label="Promedio machos" value={sheet.averageMaleWeight} />
          <Stat variant="light" label="Total hembras" value={sheet.totalFemaleWeight} />
          <Stat variant="light" label="Promedio hembras" value={sheet.averageFemaleWeight} />
        </div>
        <div className="mt-5">
          <button
            type="button"
            aria-expanded={metricsOpen}
            aria-controls="metrics-avanzadas-panel"
            onClick={() => setMetricsOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/60"
          >
            <span>Metricas avanzadas</span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`shrink-0 text-zinc-400 transition-transform duration-200 ${metricsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {metricsOpen && (
            <div
              id="metrics-avanzadas-panel"
              role="region"
              aria-label="Metricas avanzadas"
              className="mt-2 overflow-x-auto rounded-[1.5rem] border border-zinc-200/80 dark:border-zinc-800"
            >
              <table className="w-full min-w-[540px] text-sm">
                <thead className="bg-zinc-50/90 text-left text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-3 font-medium">Especificacion</th>
                    <th className="px-3 py-3 font-medium">Cantidad</th>
                    <th className="px-3 py-3 font-medium">Peso total</th>
                    <th className="px-3 py-3 font-medium">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedStats.length === 0 && <tr><td className="px-3 py-6 text-zinc-500 dark:text-zinc-400" colSpan={4}>Sin datos de desglose.</td></tr>}
                  {groupedStats.map((group) => (
                    <tr key={`${group.type}-${group.sex}`} className="border-t border-zinc-200/80 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                      <td className="px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">{String(group.specification || '').toUpperCase()}</td>
                      <td className="px-3 py-3">{group.count}</td>
                      <td className="px-3 py-3">{group.totalWeight}</td>
                      <td className="px-3 py-3">{group.averageWeight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Shell>

      <Shell eyebrow="Reses" title="Filas, orden y captura" description={editable ? 'Mientras la edición siga abierta puedes corregir filas, reordenarlas y continuar la captura.' : 'Esta vista queda en lectura para consultar las reses registradas y exportar la planilla final.'} actions={<button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70"><Download size={16} />Exportar PDF</button>}>
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <span>{sheet.rows.length} filas registradas</span>
          {editable && <span className="inline-flex items-center gap-1"><GripVertical size={14} aria-hidden="true" />Arrastra una fila sobre otra para reordenar. Los botones Subir/Bajar también están disponibles para teclado.</span>}
        </div>
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[600px] text-sm" aria-label="Filas de ganado">
            <thead className="bg-zinc-50/90 text-left text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">No.</th>
                <th scope="col" className="px-3 py-3 font-medium">Especificacion</th>
                <th scope="col" className="px-3 py-3 font-medium">Kilos</th>
                <th scope="col" className="px-3 py-3 font-medium">No. Res</th>
                <th scope="col" className="px-3 py-3 font-medium">Letras</th>
                {editable && <th scope="col" className="px-3 py-3 sr-only">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-zinc-500 dark:text-zinc-400" colSpan={editable ? 6 : 5}>
                    No hay reses registradas todavía.
                  </td>
                </tr>
              )}
              {sheet.rows.map((row) => {
                const rowSaving = savingRowIds.has(row.id);
                return (
                <tr
                  key={row.id}
                  aria-busy={rowSaving}
                  draggable={editable && !rowSaving}
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', String(row.id))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDropRow(event, row.id)}
                  className={`border-t border-zinc-200/80 text-zinc-700 transition hover:bg-zinc-50/80 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-950/30 ${rowSaving ? 'opacity-60' : ''}`}
                >
                  <td className="px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.rowOrder}</td>
                  <td className="px-3 py-3">
                    {editable ? (
                      <div className="flex min-w-[130px] flex-col gap-1">
                        <select
                          aria-label={`Especificación de res ${row.rowOrder}`}
                          className={inputClass}
                          disabled={rowSaving}
                          value={rowSelectCategory(row)}
                          onChange={(event) => {
                            const cat = event.target.value;
                            if (cat === 'OTHER') {
                              setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, type: 'OTHER', sex: item.sex || 'MACHO', customSpecification: item.customSpecification || '' } : item)) }));
                            } else {
                              const { type, sex } = CATEGORY_TO_TYPE_SEX[cat];
                              setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, type, sex, customSpecification: null } : item)) }));
                              updateRowField(row.id, { category: cat });
                            }
                          }}
                        >
                          {CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        {row.type === 'OTHER' && (
                          <>
                            <input
                              aria-label={`Especificación personalizada de res ${row.rowOrder}`}
                              className={inputClass}
                              disabled={rowSaving}
                              placeholder="Especificación personalizada"
                              value={row.customSpecification || ''}
                              onChange={(event) => setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, customSpecification: event.target.value } : item)) }))}
                              onBlur={() => updateRowField(row.id, { category: 'OTHER', customSpecification: row.customSpecification, sex: row.sex })}
                            />
                            <select
                              aria-label={`Sexo de res ${row.rowOrder}`}
                              className={inputClass}
                              disabled={rowSaving}
                              value={row.sex}
                              onChange={(event) => {
                                setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, sex: event.target.value } : item)) }));
                                updateRowField(row.id, { category: 'OTHER', customSpecification: row.customSpecification, sex: event.target.value });
                              }}
                            >
                              {SEX_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </>
                        )}
                      </div>
                    ) : rowDisplaySpec(row)}
                  </td>
                  <td className="px-3 py-3">
                    {editable ? (
                      <input
                        aria-label={`Kilos de res ${row.rowOrder}`}
                        className={`${inputClass} min-w-[80px]`}
                        type="number"
                        min="0"
                        max="2000"
                        disabled={rowSaving}
                        value={row.weight}
                        onChange={(event) => setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, weight: Math.trunc(Number(event.target.value || 0)) } : item)) }))}
                        onBlur={() => updateRowField(row.id, { weight: row.weight })}
                      />
                    ) : row.weight}
                  </td>
                  <td className="px-3 py-3">
                    {editable ? (
                      <input
                        aria-label={`Número de res ${row.rowOrder}`}
                        className={`${inputClass} min-w-[80px]`}
                        disabled={rowSaving}
                        value={row.cattleNumber}
                        onChange={(event) => setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, cattleNumber: event.target.value } : item)) }))}
                        onBlur={() => updateRowField(row.id, { cattleNumber: row.cattleNumber })}
                      />
                    ) : row.cattleNumber}
                  </td>
                  <td className="px-3 py-3">
                    {editable ? (
                      <input
                        aria-label={`Letras de res ${row.rowOrder}`}
                        className={`${inputClass} min-w-[80px]`}
                        disabled={rowSaving}
                        value={row.letters || ''}
                        onChange={(event) => setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, letters: event.target.value } : item)) }))}
                        onBlur={() => updateRowField(row.id, { letters: row.letters || null })}
                      />
                    ) : (row.letters || '-')}
                  </td>
                  {editable && (
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Subir res ${row.rowOrder}`}
                          className="sr-only focus:not-sr-only focus:rounded-xl focus:border focus:border-zinc-300 focus:px-2 focus:py-1 focus:text-xs focus:font-medium focus:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:focus:border-zinc-700 dark:focus:text-zinc-300"
                          onClick={() => moveRow(row.id, -1)}
                          disabled={row.rowOrder === 1 || rowSaving}
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          aria-label={`Bajar res ${row.rowOrder}`}
                          className="sr-only focus:not-sr-only focus:rounded-xl focus:border focus:border-zinc-300 focus:px-2 focus:py-1 focus:text-xs focus:font-medium focus:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:focus:border-zinc-700 dark:focus:text-zinc-300"
                          onClick={() => moveRow(row.id, 1)}
                          disabled={row.rowOrder === sheet.rows.length || rowSaving}
                        >
                          Bajar
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar res ${row.rowOrder}`}
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10"
                          onClick={() => deleteRow(row.id)}
                          disabled={rowSaving}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {editable && (
          <form onSubmit={addRow} className="mt-5 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="mb-4">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Agregar res</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Los últimos valores se conservan para acelerar la captura en serie.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="draft-category" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Especificación</label>
                <select
                  id="draft-category"
                  className={inputClass}
                  value={draftRow.category}
                  onChange={(event) => {
                    const cat = event.target.value;
                    setDraftRow((prev) => ({ ...prev, category: cat, customSpecification: cat !== 'OTHER' ? '' : prev.customSpecification }));
                    setSessionDefaults((prev) => ({ ...prev, category: cat }));
                  }}
                >
                  {CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {draftRow.category === 'OTHER' && (
                  <div aria-live="polite" className="mt-2 flex flex-col gap-2">
                    <label htmlFor="draft-custom-spec" className="sr-only">Especificación personalizada</label>
                    <input
                      id="draft-custom-spec"
                      className={inputClass}
                      placeholder="Escribe la especificación"
                      value={draftRow.customSpecification}
                      onChange={(event) => setDraftRow((prev) => ({ ...prev, customSpecification: event.target.value }))}
                    />
                    <label htmlFor="draft-sex" className="sr-only">Sexo</label>
                    <select
                      id="draft-sex"
                      aria-label="Sexo"
                      className={inputClass}
                      value={draftRow.sex}
                      onChange={(event) => {
                        setDraftRow((prev) => ({ ...prev, sex: event.target.value }));
                        setSessionDefaults((prev) => ({ ...prev, sex: event.target.value }));
                      }}
                    >
                      {SEX_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="draft-weight" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Kilos</label>
                <input
                  id="draft-weight"
                  className={inputClass}
                  type="number"
                  min="1"
                  max="2000"
                  value={draftRow.weight}
                  onChange={(event) => setDraftRow((prev) => ({ ...prev, weight: event.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="draft-cattle-number" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">No. Res</label>
                <input
                  id="draft-cattle-number"
                  className={inputClass}
                  value={draftRow.cattleNumber}
                  onChange={(event) => setDraftRow((prev) => ({ ...prev, cattleNumber: event.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="draft-letters" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Letras</label>
                <input
                  id="draft-letters"
                  className={inputClass}
                  value={draftRow.letters}
                  onChange={(event) => setDraftRow((prev) => ({ ...prev, letters: event.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                type="submit"
                disabled={savingRow}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"
              >
                {savingRow ? 'Guardando...' : 'Agregar res'}
              </button>
            </div>
          </form>
        )}
      </Shell>

      <Shell eyebrow="Pago" title={isClient ? 'Estado de pago' : 'Seguimiento de pago'} description={isClient ? 'Consulta el estado actual y el historial básico de cambios de pago sin exponer datos internos de operación.' : 'Marca la planilla como pagada o pendiente y revisa quién hizo los cambios de estado.'} actions={!isClient && <button type="button" onClick={togglePayment} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400"><Wallet size={16} />{sheet.isPaid ? 'Marcar pendiente' : 'Marcar pagada'}</button>}>
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <PaymentChip isPaid={sheet.isPaid} />
          {sheet.paidBy && !isClient && <span>Último cambio por {sheet.paidBy.email}</span>}
        </div>
        <div className="space-y-3 text-sm">
          {paymentLogs.length === 0 && <div className="rounded-[1.3rem] border border-dashed border-zinc-300/90 bg-zinc-50/80 px-4 py-5 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">Sin eventos de pago.</div>}
          {paymentLogs.map((log) => (
            <div key={log.id} className="rounded-[1.35rem] border border-zinc-200/80 bg-white/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{log.newStatus ? 'Pagada' : 'Pendiente'}{!isClient && log.changedBy?.email ? ` por ${log.changedBy.email}` : ''}</div>
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{new Date(log.changedAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </Shell>

      {!isClient && (
        <Shell eyebrow="Trazabilidad" title="Historial operativo" description="Mantiene una lectura secundaria del rastro administrativo sin quitarle protagonismo al trabajo principal de la planilla." className="border-dashed bg-zinc-50/70 dark:bg-zinc-950/35">
          <div className="space-y-3">
            {auditLogs.length === 0 && <div className="rounded-[1.3rem] border border-dashed border-zinc-300/90 bg-white/80 px-4 py-5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">Sin movimientos de trazabilidad registrados.</div>}
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-[1.35rem] border border-zinc-200/80 bg-white/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatAuditAction(log.action)}</div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{log.actor?.email || 'Sistema'}</div>
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{new Date(log.changedAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </Shell>
      )}
    </div>
  );
}
