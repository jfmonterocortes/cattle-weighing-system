import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { getSession } from '../utils/authSession';

const TYPE_OPTIONS = ['VACA', 'TORO', 'BUFALO', 'NOVILLO', 'TERNERO'];
const SEX_OPTIONS = ['MACHO', 'HEMBRA'];

function canEdit(role, sheet, userId) {
  if (role === 'ADMIN') return true;
  if (role === 'LIQUIDADOR' && sheet.createdById === userId) {
    return new Date() <= new Date(sheet.editableUntilByLiquidador);
  }
  return false;
}

function feedbackClass(type) {
  if (type === 'error') return 'text-red-300';
  if (type === 'success') return 'text-emerald-300';
  return 'text-zinc-400';
}

export default function SheetDetailPage() {
  const { id } = useParams();
  const sheetId = Number(id);
  const { user } = getSession();
  const role = user?.role;
  const userId = user?.userId;

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });
  const [draftRow, setDraftRow] = useState({ type: 'TERNERO', sex: 'MACHO', weight: '', cattleNumber: '', letters: '' });
  const [saving, setSaving] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setLoadError('');

    try {
      const res = await api.get(`/sheets/${sheetId}`);
      setSheet(res.data);
    } catch (error) {
      setSheet(null);
      setLoadError(error.response?.data?.message || 'No se pudo cargar la planilla.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(sheetId)) return;
    loadDetail();
  }, [sheetId]);

  const editable = sheet ? canEdit(role, sheet, userId) : false;

  const suggestNumber = async () => {
    try {
      const res = await api.get(`/sheets/${sheetId}/rows/next-number`);
      setDraftRow((prev) => ({ ...prev, cattleNumber: res.data.cattleNumber }));
    } catch {
      // noop
    }
  };

  useEffect(() => {
    if (sheet) suggestNumber();
  }, [sheet?.id]);

  const groupedStats = useMemo(() => sheet?.computed?.totalsByTypeSex || [], [sheet]);

  const addRow = async (event) => {
    event.preventDefault();
    setSaving(true);
    setActionFeedback({ type: '', message: '' });

    try {
      await api.post(`/sheets/${sheetId}/rows`, {
        type: draftRow.type,
        sex: draftRow.sex,
        weight: Math.trunc(Number(draftRow.weight || 0)),
        cattleNumber: draftRow.cattleNumber || '1',
        letters: draftRow.letters || null,
      });
      const nextType = draftRow.type;
      const nextSex = draftRow.sex;
      setDraftRow({ type: nextType, sex: nextSex, weight: '', cattleNumber: '', letters: '' });
      setActionFeedback({ type: 'success', message: 'Fila agregada correctamente.' });
      await loadDetail();
    } catch (error) {
      setActionFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo agregar la fila.' });
    } finally {
      setSaving(false);
    }
  };

  const updateRowField = async (rowId, patch) => {
    setActionFeedback({ type: '', message: '' });
    try {
      await api.patch(`/sheets/${sheetId}/rows/${rowId}`, patch);
      await loadDetail();
    } catch (error) {
      setActionFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar la fila.' });
    }
  };

  const deleteRow = async (rowId) => {
    setActionFeedback({ type: '', message: '' });
    try {
      await api.delete(`/sheets/${sheetId}/rows/${rowId}`);
      setActionFeedback({ type: 'success', message: 'Fila eliminada.' });
      await loadDetail();
    } catch (error) {
      setActionFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo eliminar la fila.' });
    }
  };

  const onDragStart = (event, rowId) => {
    event.dataTransfer.setData('text/plain', String(rowId));
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

    setActionFeedback({ type: '', message: '' });
    try {
      await api.post(`/sheets/${sheetId}/rows/reorder`, { orderedRowIds: ids });
      setActionFeedback({ type: 'success', message: 'Filas reordenadas.' });
      await loadDetail();
    } catch (error) {
      setActionFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudieron reordenar las filas.' });
    }
  };

  const togglePayment = async () => {
    setActionFeedback({ type: '', message: '' });
    try {
      await api.post(`/sheets/${sheetId}/payment-status`, {
        isPaid: !sheet.isPaid,
        notes: sheet.isPaid ? 'Marcada pendiente' : 'Marcada pagada',
      });
      setActionFeedback({ type: 'success', message: `Estado actualizado: ${sheet.isPaid ? 'Pendiente' : 'Pagada'}.` });
      await loadDetail();
    } catch (error) {
      setActionFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar el pago.' });
    }
  };

  const exportPdf = async () => {
    setActionFeedback({ type: '', message: '' });
    try {
      const res = await api.get(`/exports/sheet/${sheetId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `planilla-${sheet.visibleNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setActionFeedback({ type: 'success', message: 'PDF generado correctamente.' });
    } catch (error) {
      setActionFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo exportar el PDF.' });
    }
  };

  if (loading) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">Cargando...</div>;
  if (loadError) return <div className="rounded-2xl border border-red-700/50 bg-red-950/30 p-6 text-red-200">{loadError}</div>;
  if (!sheet) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">Planilla no encontrada.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/planillas" className="rounded-xl border border-zinc-700 px-3 py-2 text-sm">Volver a planillas</Link>
        <div className="text-right">
          <h2 className="text-xl font-semibold">Planilla {sheet.visibleNumber}</h2>
          <p className="text-sm text-zinc-400">{new Date(sheet.date).toLocaleString()}</p>
        </div>
      </div>

      {actionFeedback.message && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${actionFeedback.type === 'error' ? 'border-red-700/50 bg-red-950/30' : 'border-emerald-700/40 bg-emerald-950/20'}`}>
          <span className={feedbackClass(actionFeedback.type)}>{actionFeedback.message}</span>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-xs text-zinc-500">Vendedor</div>
          <div className="font-medium">{sheet.seller.name}</div>
          <div className="text-xs text-zinc-500">{sheet.seller.phone || 'Sin teléfono'}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Comprador</div>
          <div className="font-medium">{sheet.buyer.name}</div>
          <div className="text-xs text-zinc-500">{sheet.buyer.phone || 'Sin teléfono'}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Liquidador</div>
          <div className="font-medium">{sheet.liquidadorAliasSnapshot}</div>
          <div className="text-xs text-zinc-500">Precio/cabeza: {sheet.pricePerHead}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Resumen de pesos</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-zinc-500">Cabezas</div><div className="text-lg font-semibold">{sheet.headCount}</div></div>
          <div><div className="text-xs text-zinc-500">Peso total</div><div className="text-lg font-semibold">{sheet.totalWeight}</div></div>
          <div><div className="text-xs text-zinc-500">Promedio general</div><div className="text-lg font-semibold">{sheet.averageWeight}</div></div>
          <div><div className="text-xs text-zinc-500">Valor total</div><div className="text-lg font-semibold">{sheet.totalValue}</div></div>
          <div><div className="text-xs text-zinc-500">Total machos</div><div className="text-lg font-semibold">{sheet.totalMaleWeight}</div></div>
          <div><div className="text-xs text-zinc-500">Promedio machos</div><div className="text-lg font-semibold">{sheet.averageMaleWeight}</div></div>
          <div><div className="text-xs text-zinc-500">Total hembras</div><div className="text-lg font-semibold">{sheet.totalFemaleWeight}</div></div>
          <div><div className="text-xs text-zinc-500">Promedio hembras</div><div className="text-lg font-semibold">{sheet.averageFemaleWeight}</div></div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Desglose por tipo y sexo</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-400">
              <tr>
                <th className="px-2 py-2">Especificación</th>
                <th className="px-2 py-2">Cantidad</th>
                <th className="px-2 py-2">Peso total</th>
                <th className="px-2 py-2">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {groupedStats.length === 0 && <tr><td className="px-2 py-3 text-zinc-500" colSpan={4}>Sin datos de desglose.</td></tr>}
              {groupedStats.map((group) => (
                <tr key={`${group.type}-${group.sex}`} className="border-t border-zinc-800 text-zinc-200">
                  <td className="px-2 py-2">{String(group.specification || '').toUpperCase()}</td>
                  <td className="px-2 py-2">{group.count}</td>
                  <td className="px-2 py-2">{group.totalWeight}</td>
                  <td className="px-2 py-2">{group.averageWeight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Reses</h3>
          <div className="flex gap-2">
            <button onClick={exportPdf} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs">Exportar PDF</button>
            {(role === 'ADMIN' || role === 'LIQUIDADOR') && (
              <button onClick={togglePayment} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs">
                {sheet.isPaid ? 'Marcar pendiente' : 'Marcar pagada'}
              </button>
            )}
          </div>
        </div>

        <p className="mt-1 text-xs text-zinc-400">Estado de pago: {sheet.isPaid ? 'Pagada' : 'Pendiente'}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-400">
              <tr>
                <th className="px-2 py-2">Nº</th>
                <th className="px-2 py-2">Especificación</th>
                <th className="px-2 py-2">Kilos</th>
                <th className="px-2 py-2">Nº Res</th>
                <th className="px-2 py-2">Letras</th>
                {editable && <th className="px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row) => (
                <tr
                  key={row.id}
                  draggable={editable}
                  onDragStart={(e) => onDragStart(e, row.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropRow(e, row.id)}
                  className="border-t border-zinc-800 text-zinc-200"
                >
                  <td className="px-2 py-2">{row.rowOrder}</td>
                  <td className="px-2 py-2">{`${row.type} ${row.sex}`}</td>
                  <td className="px-2 py-2">
                    {editable ? (
                      <input
                        className="w-20 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1"
                        value={row.weight}
                        onChange={(e) => {
                          const value = Math.trunc(Number(e.target.value || 0));
                          setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, weight: value } : item)) }));
                        }}
                        onBlur={() => updateRowField(row.id, { weight: row.weight })}
                      />
                    ) : (
                      row.weight
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editable ? (
                      <input
                        className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1"
                        value={row.cattleNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, cattleNumber: value } : item)) }));
                        }}
                        onBlur={() => updateRowField(row.id, { cattleNumber: row.cattleNumber })}
                      />
                    ) : (
                      row.cattleNumber
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editable ? (
                      <input
                        className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1"
                        value={row.letters || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSheet((prev) => ({ ...prev, rows: prev.rows.map((item) => (item.id === row.id ? { ...item, letters: value } : item)) }));
                        }}
                        onBlur={() => updateRowField(row.id, { letters: row.letters || null })}
                      />
                    ) : (
                      row.letters || '-'
                    )}
                  </td>
                  {editable && (
                    <td className="px-2 py-2 text-right">
                      <button className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-300" onClick={() => deleteRow(row.id)}>
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editable && (
          <form onSubmit={addRow} className="mt-4 grid gap-2 md:grid-cols-6 items-end">
            <div>
              <label className="text-xs text-zinc-400">Tipo</label>
              <select className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={draftRow.type} onChange={(e) => setDraftRow((prev) => ({ ...prev, type: e.target.value }))}>
                {TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Sexo</label>
              <select className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={draftRow.sex} onChange={(e) => setDraftRow((prev) => ({ ...prev, sex: e.target.value }))}>
                {SEX_OPTIONS.map((sex) => <option key={sex} value={sex}>{sex}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Kilos</label>
              <input className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={draftRow.weight} onChange={(e) => setDraftRow((prev) => ({ ...prev, weight: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Nº Res</label>
              <input className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={draftRow.cattleNumber} onChange={(e) => setDraftRow((prev) => ({ ...prev, cattleNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Letras</label>
              <input className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1" value={draftRow.letters} onChange={(e) => setDraftRow((prev) => ({ ...prev, letters: e.target.value }))} />
            </div>
            <button disabled={saving} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-60">{saving ? 'Guardando...' : 'Agregar'}</button>
          </form>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Bitácora de pagos</h3>
        <div className="mt-3 space-y-2 text-sm">
          {sheet.paymentLogs.length === 0 && <div className="text-zinc-500">Sin eventos de pago.</div>}
          {sheet.paymentLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              {new Date(log.changedAt).toLocaleString()} - {log.newStatus ? 'Pagada' : 'Pendiente'} por {log.changedBy.email}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
