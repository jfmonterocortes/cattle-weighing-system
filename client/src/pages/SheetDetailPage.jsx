import { ArrowLeft, Download, GripVertical, History, PencilLine, Save, UserRound, Wallet, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import FeedbackBanner from '../components/FeedbackBanner';
import PersonAutocomplete from '../components/PersonAutocomplete';
import { getSession } from '../utils/authSession';

const TYPE_OPTIONS = ['VACA', 'TORO', 'BUFALO', 'NOVILLO', 'TERNERO'];
const SEX_OPTIONS = ['MACHO', 'HEMBRA'];
const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10';

function canEdit(role, sheet, userId) {
  if (role === 'ADMIN') return true;
  if (role === 'LIQUIDADOR' && sheet.createdById === userId) return new Date() <= new Date(sheet.editableUntilByLiquidador);
  return false;
}

function getSexDefaultByType(type, currentSex = 'MACHO') {
  if (type === 'VACA') return 'HEMBRA';
  if (type === 'TORO' || type === 'NOVILLO') return 'MACHO';
  return currentSex;
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

function formatSexLabel(value) {
  if (value === 'MACHO') return 'M';
  if (value === 'HEMBRA') return 'H';
  return value || '-';
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
    <section className={`rounded-[1.9rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[0_24px_60px_rgba(0,0,0,0.42)] ${className}`}>
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

function Stat({ label, value, caption }) {
  return (
    <div className="rounded-[1.4rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      {caption && <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{caption}</div>}
    </div>
  );
}

function PartyCard({ icon, label, name, detail }) {
  const IconComponent = icon;
  return (
    <div className="rounded-[1.4rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-900 text-white dark:bg-amber-500 dark:text-zinc-950">
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
  const { user } = getSession();
  const role = user?.role;
  const userId = user?.userId;
  const isClient = role === 'CLIENT';

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [savingRow, setSavingRow] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [draftRow, setDraftRow] = useState({ type: 'TERNERO', sex: 'MACHO', weight: '', cattleNumber: '', letters: '' });
  const [sessionDefaults, setSessionDefaults] = useState({ type: 'TERNERO', sex: 'MACHO', lastNumericCattleNumber: null });
  const [headerDraft, setHeaderDraft] = useState({ seller: null, buyer: null, date: '', pricePerHead: '', liquidadorAliasSnapshot: '' });

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
    setDraftRow((prev) => ({
      ...prev,
      type: sessionDefaults.type,
      sex: getSexDefaultByType(sessionDefaults.type, sessionDefaults.sex),
      cattleNumber: localNext || prev.cattleNumber,
    }));
    if (localNext) return;
    let cancelled = false;
    fetchNextCattleNumber(sheetId).then((cattleNumber) => {
      if (!cancelled) setDraftRow((prev) => ({ ...prev, cattleNumber }));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionDefaults.lastNumericCattleNumber, sessionDefaults.sex, sessionDefaults.type, sheet?.id, sheetId]);

  const reloadDetail = () => setReloadKey((value) => value + 1);
  const editable = sheet ? canEdit(role, sheet, userId) : false;
  const groupedStats = useMemo(() => sheet?.computed?.totalsByTypeSex || [], [sheet]);
  const paymentLogs = sheet?.paymentLogs || [];
  const auditLogs = sheet?.auditLogs || [];
  const paymentHeaderDetail = isClient
    ? 'Consulta el estado actual de esta planilla.'
    : `Creada por: ${sheet?.createdBy?.email || 'Sin dato'}`;

  const headerStateLabel = role === 'ADMIN' ? 'Control admin' : editable && sheet?.editableUntilByLiquidador ? `Edición abierta hasta ${new Date(sheet.editableUntilByLiquidador).toLocaleTimeString()}` : role === 'CLIENT' ? '' : 'Solo lectura';

  const addRow = async (event) => {
    event.preventDefault();
    setSavingRow(true);
    setFeedback({ type: '', message: '' });
    const rowPayload = { type: draftRow.type, sex: draftRow.sex, weight: Math.trunc(Number(draftRow.weight || 0)), cattleNumber: draftRow.cattleNumber || '1', letters: draftRow.letters || null };
    try {
      await api.post(`/sheets/${sheetId}/rows`, rowPayload);
      const numeric = toNumericOrNull(rowPayload.cattleNumber);
      setSessionDefaults((prev) => ({ ...prev, type: rowPayload.type, sex: rowPayload.sex, lastNumericCattleNumber: Number.isFinite(numeric) ? numeric : prev.lastNumericCattleNumber }));
      setDraftRow({ type: rowPayload.type, sex: rowPayload.sex, weight: '', cattleNumber: Number.isFinite(numeric) ? String(numeric + 1) : '', letters: '' });
      setFeedback({ type: 'success', message: 'Fila agregada correctamente.' });
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo agregar la fila.' });
    } finally {
      setSavingRow(false);
    }
  };

  const updateRowField = async (rowId, patch) => {
    try {
      await api.patch(`/sheets/${sheetId}/rows/${rowId}`, patch);
      reloadDetail();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar la fila.' });
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
      <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-6 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
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
      <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-6 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
        Planilla no encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <section className="overflow-hidden rounded-[2rem] border border-stone-200/60 bg-gradient-to-br from-amber-50/80 via-white to-sky-50/60 p-6 shadow-[0_22px_65px_rgba(120,53,15,0.06)] dark:border-zinc-800/60 dark:from-[#17120b] dark:via-zinc-900 dark:to-[#0c1620] dark:shadow-[0_28px_75px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500 dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:text-zinc-400">
              <History size={13} />
              Planilla operativa
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link to="/planillas" className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70">
                <ArrowLeft size={16} />
                Volver a planillas
              </Link>
              <PaymentChip isPaid={sheet.isPaid} />
              {!isClient && (
                <span className="inline-flex rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {headerStateLabel}
                </span>
              )}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Planilla {sheet.visibleNumber}</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">{new Date(sheet.date).toLocaleString()} · Revisa encabezado, resumen, reses y pago en el orden operativo del trabajo diario.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[480px]">
            <Stat label="Cabezas" value={sheet.headCount} caption="Total de reses registradas." />
            <Stat label="Valor total" value={sheet.totalValue} caption="Lectura rápida del cierre económico." />
            {!isClient && <Stat label="Precio/cabeza" value={sheet.pricePerHead} caption="Referencia activa para esta planilla." />}
            <Stat label="Liquidador" value={sheet.liquidadorAliasSnapshot || 'Sin alias'} caption="Alias guardado en el encabezado." />
          </div>
        </div>
      </section>

      <FeedbackBanner message={feedback.message} type={feedback.type || 'info'} />

      <Shell
        eyebrow="Encabezado de planilla"
        title="Contrapartes y parametros operativos"
        description={editable ? 'Valida vendedor, comprador, fecha, alias y precio antes de seguir con las reses.' : 'Este bloque resume el encabezado principal con el que se construyo la planilla.'}
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
          <Stat label="Fecha operativa" value={new Date(sheet.date).toLocaleString()} />
          {!isClient && <Stat label="Precio por cabeza" value={sheet.pricePerHead} />}
          <Stat label="Liquidador" value={sheet.liquidadorAliasSnapshot || 'Sin dato'} />
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
          <Stat label="Cabezas" value={sheet.headCount} />
          <Stat label="Peso total" value={sheet.totalWeight} />
          <Stat label="Promedio general" value={sheet.averageWeight} />
          <Stat label="Valor total" value={sheet.totalValue} />
          <Stat label="Total machos" value={sheet.totalMaleWeight} />
          <Stat label="Promedio machos" value={sheet.averageMaleWeight} />
          <Stat label="Total hembras" value={sheet.totalFemaleWeight} />
          <Stat label="Promedio hembras" value={sheet.averageFemaleWeight} />
        </div>
        <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-zinc-200/80 dark:border-zinc-800">
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
      </Shell>

      <Shell eyebrow="Reses" title="Filas, orden y captura" description={editable ? 'Mientras la edición siga abierta puedes corregir filas, reordenarlas y continuar la captura.' : 'Esta vista queda en lectura para consultar las reses registradas y exportar la planilla final.'} actions={<button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/70"><Download size={16} />Exportar PDF</button>}>
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <span>{sheet.rows.length} filas registradas</span>
          {editable && <span className="inline-flex items-center gap-1"><GripVertical size={14} />Arrastra una fila sobre otra para reordenar.</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-zinc-50/90 text-left text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-3 font-medium">No.</th>
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Sexo</th>
                <th className="px-3 py-3 font-medium">Kilos</th>
                <th className="px-3 py-3 font-medium">No. Res</th>
                <th className="px-3 py-3 font-medium">Letras</th>
                {editable && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.length === 0 && <tr><td className="px-3 py-6 text-zinc-500 dark:text-zinc-400" colSpan={editable ? 7 : 6}>No hay reses registradas todavía.</td></tr>}
              {sheet.rows.map((row) => (
                <tr key={row.id} draggable={editable} onDragStart={(event) => event.dataTransfer.setData('text/plain', String(row.id))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropRow(event, row.id)} className="border-t border-zinc-200/80 text-zinc-700 transition hover:bg-zinc-50/80 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-950/30">
                  <td className="px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.rowOrder}</td>
                  <td className="px-3 py-3">{editable ? <select className={inputClass} value={row.type} onChange={(event) => { const nextType = event.target.value; const nextSex = getSexDefaultByType(nextType, row.sex); setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, type: nextType, sex: nextSex } : item)) })); }} onBlur={() => updateRowField(row.id, { type: row.type, sex: row.sex })}>{TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}</select> : row.type}</td>
                  <td className="px-3 py-3">{editable ? <select className={inputClass} value={row.sex} onChange={(event) => setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, sex: event.target.value } : item)) }))} onBlur={() => updateRowField(row.id, { sex: row.sex, type: row.type })}>{SEX_OPTIONS.map((sex) => <option key={sex} value={sex}>{formatSexLabel(sex)}</option>)}</select> : formatSexLabel(row.sex)}</td>
                  <td className="px-3 py-3">{editable ? <input className={inputClass} value={row.weight} onChange={(event) => setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, weight: Math.trunc(Number(event.target.value || 0)) } : item)) }))} onBlur={() => updateRowField(row.id, { weight: row.weight })} /> : row.weight}</td>
                  <td className="px-3 py-3">{editable ? <input className={inputClass} value={row.cattleNumber} onChange={(event) => setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, cattleNumber: event.target.value } : item)) }))} onBlur={() => updateRowField(row.id, { cattleNumber: row.cattleNumber })} /> : row.cattleNumber}</td>
                  <td className="px-3 py-3">{editable ? <input className={inputClass} value={row.letters || ''} onChange={(event) => setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, letters: event.target.value } : item)) }))} onBlur={() => updateRowField(row.id, { letters: row.letters || null })} /> : row.letters || '-'}</td>
                  {editable && <td className="px-3 py-3 text-right"><button type="button" className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10" onClick={() => deleteRow(row.id)}>Eliminar</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editable && (
          <form onSubmit={addRow} className="mt-5 rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">Nueva fila</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Agrega una res y conserva los ultimos valores utiles para acelerar la captura.</p>
            </div>
            <div className="grid items-end gap-3 md:grid-cols-6">
              <label><div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Tipo</div><select className={inputClass} value={draftRow.type} onChange={(event) => { const nextType = event.target.value; const nextSex = getSexDefaultByType(nextType, draftRow.sex); setDraftRow((prev) => ({ ...prev, type: nextType, sex: nextSex })); setSessionDefaults((prev) => ({ ...prev, type: nextType, sex: nextSex })); }}>{TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label><div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Sexo</div><select className={inputClass} value={draftRow.sex} onChange={(event) => { setDraftRow((prev) => ({ ...prev, sex: event.target.value })); setSessionDefaults((prev) => ({ ...prev, sex: event.target.value })); }}>{SEX_OPTIONS.map((sex) => <option key={sex} value={sex}>{formatSexLabel(sex)}</option>)}</select></label>
              <label><div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Kilos</div><input className={inputClass} value={draftRow.weight} onChange={(event) => setDraftRow((prev) => ({ ...prev, weight: event.target.value }))} /></label>
              <label><div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">No. Res</div><input className={inputClass} value={draftRow.cattleNumber} onChange={(event) => setDraftRow((prev) => ({ ...prev, cattleNumber: event.target.value }))} /></label>
              <label><div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Letras</div><input className={inputClass} value={draftRow.letters} onChange={(event) => setDraftRow((prev) => ({ ...prev, letters: event.target.value }))} /></label>
              <button disabled={savingRow} className="inline-flex items-center justify-center rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-950 dark:shadow-amber-500/15 dark:hover:bg-amber-400">{savingRow ? 'Guardando...' : 'Agregar'}</button>
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
