import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import PersonAutocomplete from '../components/PersonAutocomplete';
import { getSession } from '../utils/authSession';

function feedbackClass(type) {
  if (type === 'error') return 'text-red-300';
  if (type === 'success') return 'text-emerald-300';
  return 'text-zinc-400';
}

export default function NewSheetPage() {
  const { user } = getSession();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [sheetFeedback, setSheetFeedback] = useState({ type: '', message: '' });

  const isOperator = user?.role === 'ADMIN' || user?.role === 'LIQUIDADOR';

  if (!isOperator) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-300">Tu rol no puede crear planillas.</div>;
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
      const msg = error.response?.data?.message || 'No se pudo crear la persona.';
      setSheetFeedback({ type: 'error', message: msg });
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
      const res = await api.post('/sheets', {
        sellerId: seller.id,
        buyerId: buyer.id,
      });

      setSheetFeedback({ type: 'success', message: `Planilla creada: ${res.data.visibleNumber}.` });
      navigate(`/planillas/${res.data.id}`);
    } catch (error) {
      setSheetFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la planilla.' });
    } finally {
      setCreatingSheet(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">Nueva Planilla</h2>
        <p className="text-sm text-zinc-400">Selecciona vendedor y comprador (Personas). Estado inicial: Pendiente.</p>
      </div>

      <form onSubmit={createSheet} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <PersonAutocomplete
              label="Vendedor"
              value={seller}
              onSelect={setSeller}
              onCreate={(name) => createPersonInline(name, 'seller')}
              onError={(msg) => setSheetFeedback({ type: 'error', message: msg })}
            />
            {seller?.id && <p className="mt-1 text-xs text-zinc-400">Seleccionado: {seller.name} (ID {seller.id})</p>}
          </div>

          <div>
            <PersonAutocomplete
              label="Comprador"
              value={buyer}
              onSelect={setBuyer}
              onCreate={(name) => createPersonInline(name, 'buyer')}
              onError={(msg) => setSheetFeedback({ type: 'error', message: msg })}
            />
            {buyer?.id && <p className="mt-1 text-xs text-zinc-400">Seleccionado: {buyer.name} (ID {buyer.id})</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
          <span className={`text-sm ${feedbackClass(sheetFeedback.type)}`}>{sheetFeedback.message}</span>
          <button type="submit" disabled={creatingSheet} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {creatingSheet ? 'Creando...' : 'Guardar planilla'}
          </button>
        </div>
      </form>
    </div>
  );
}
