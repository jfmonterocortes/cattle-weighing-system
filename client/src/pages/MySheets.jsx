import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { parseJwt } from '../utils/jwt';
import PersonAutocomplete from '../components/PersonAutocomplete';
import AdminUserManagement from '../components/AdminUserManagement';

function RoleBadge({ role }) {
  const color =
    role === 'ADMIN'
      ? 'bg-red-900/40 text-red-200 border-red-700/50'
      : role === 'LIQUIDADOR'
      ? 'bg-amber-900/40 text-amber-200 border-amber-700/50'
      : 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50';
  return <span className={`rounded-full border px-2 py-1 text-xs ${color}`}>{role}</span>;
}

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

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function MySheets({ onOpen }) {
  const token = localStorage.getItem('token');
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const role = payload?.role;

  const [q, setQ] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [sellerPhoneFilter, setSellerPhoneFilter] = useState('');
  const [buyerPhoneFilter, setBuyerPhoneFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [sheets, setSheets] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [seller, setSeller] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [sheetFeedback, setSheetFeedback] = useState({ type: '', message: '' });

  const [personForm, setPersonForm] = useState({ name: '', phone: '', cedula: '' });
  const [creatingPerson, setCreatingPerson] = useState(false);
  const [personFeedback, setPersonFeedback] = useState({ type: '', message: '' });

  const [defaultPrice, setDefaultPrice] = useState(5000);
  const [priceInput, setPriceInput] = useState('5000');
  const [priceFeedback, setPriceFeedback] = useState({ type: '', message: '' });

  const [linkRequests, setLinkRequests] = useState([]);

  const [clientLinkQuery, setClientLinkQuery] = useState('');
  const [clientLinkResults, setClientLinkResults] = useState([]);
  const [clientSelectedPerson, setClientSelectedPerson] = useState(null);
  const [clientLinkLoading, setClientLinkLoading] = useState(false);
  const [clientLinkFeedback, setClientLinkFeedback] = useState({ type: '', message: '' });

  const [adminUserForm, setAdminUserForm] = useState({ email: '', password: '', person: null });
  const [adminCreateUserLoading, setAdminCreateUserLoading] = useState(false);
  const [adminCreateUserFeedback, setAdminCreateUserFeedback] = useState({ type: '', message: '' });

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedLinkPerson, setSelectedLinkPerson] = useState(null);
  const [adminLinkFeedback, setAdminLinkFeedback] = useState({ type: '', message: '' });

  const isAdmin = role === 'ADMIN';
  const isOperator = role === 'ADMIN' || role === 'LIQUIDADOR';
  const isClient = role === 'CLIENT';

  const hasActiveFilters = Boolean(
    q.trim() || sellerFilter.trim() || buyerFilter.trim() || sellerPhoneFilter.trim() || buyerPhoneFilter.trim() || from || to || paymentStatus
  );

  const loadSheets = async (override = {}) => {
    const params = parseFilters({
      q: override.q ?? q.trim(),
      seller: override.seller ?? sellerFilter.trim(),
      buyer: override.buyer ?? buyerFilter.trim(),
      sellerPhone: override.sellerPhone ?? sellerPhoneFilter.trim(),
      buyerPhone: override.buyerPhone ?? buyerPhoneFilter.trim(),
      from: override.from ?? from,
      to: override.to ?? to,
      paymentStatus: override.paymentStatus ?? paymentStatus,
      page: override.page ?? page,
      pageSize: override.pageSize ?? pageSize,
    });

    setLoading(true);
    setListError('');

    try {
      const res = await api.get('/sheets', { params });
      const data = res.data || {};
      setSheets(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
      setTotalPages(Number(data.totalPages || 1));
      setPage(Number(data.page || 1));
    } catch (error) {
      setSheets([]);
      setTotal(0);
      setTotalPages(1);
      setListError(error.response?.data?.message || 'No se pudieron cargar las planillas.');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!isOperator) return;
    try {
      const res = await api.get('/settings');
      setDefaultPrice(res.data.defaultPricePerHead || 5000);
      setPriceInput(String(res.data.defaultPricePerHead || 5000));
    } catch {
      setDefaultPrice(5000);
    }
  };

  const loadLinkRequests = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/link-requests');
      setLinkRequests(res.data || []);
    } catch {
      setLinkRequests([]);
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/users', {
        params: {
          limit: 100,
        },
      });
      setUsers(res.data || []);
    } catch (error) {
      setUsers([]);
      setAdminLinkFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudieron cargar usuarios.' });
    }
  };

  useEffect(() => {
    loadSheets({ page: 1 });
    loadSettings();
    loadLinkRequests();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPerson = async (personInput, callback) => {
    const res = await api.post('/people', personInput);
    if (callback) callback(res.data);
    return res.data;
  };

  const createPersonInline = async (name, kind) => {
    try {
      const created = await createPerson({ name });
      if (kind === 'seller') setSeller(created);
      if (kind === 'buyer') setBuyer(created);
      setSheetFeedback({ type: 'success', message: `Persona creada: ${created.name}` });
    } catch (error) {
      setSheetFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la persona.' });
    }
  };

  const submitPersonForm = async (event) => {
    event.preventDefault();
    setCreatingPerson(true);
    setPersonFeedback({ type: '', message: '' });

    try {
      const created = await createPerson(personForm);
      setPersonForm({ name: '', phone: '', cedula: '' });
      setPersonFeedback({ type: 'success', message: `Persona creada: ${created.name}` });
    } catch (error) {
      setPersonFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la persona.' });
    } finally {
      setCreatingPerson(false);
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
      setSeller(null);
      setBuyer(null);
      await loadSheets({ page: 1 });
      setSheetFeedback({ type: 'success', message: `Planilla creada: ${res.data.visibleNumber} (pendiente por defecto).` });
      onOpen(res.data.id);
    } catch (error) {
      setSheetFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la planilla.' });
    } finally {
      setCreatingSheet(false);
    }
  };

  const saveDefaultPrice = async () => {
    setPriceFeedback({ type: '', message: '' });
    try {
      await api.patch('/settings', { defaultPricePerHead: Number(priceInput) });
      setDefaultPrice(Number(priceInput));
      setPriceFeedback({ type: 'success', message: 'Precio global actualizado.' });
    } catch (error) {
      setPriceFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo actualizar el precio.' });
    }
  };

  const exportExcel = async () => {
    try {
      const res = await api.get('/exports/excel', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'planillas.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setListError(error.response?.data?.message || 'No se pudo exportar Excel.');
    }
  };

  const reviewLinkRequest = async (requestId, status) => {
    try {
      await api.patch(`/link-requests/${requestId}/review`, { status });
      await loadLinkRequests();
      await loadUsers();
      setAdminLinkFeedback({ type: 'success', message: `Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}.` });
    } catch (error) {
      setAdminLinkFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo revisar la solicitud.' });
    }
  };

  const searchClientLinkPeople = async () => {
    const query = clientLinkQuery.trim();
    setClientSelectedPerson(null);
    setClientLinkFeedback({ type: '', message: '' });

    if (query.length < 2) {
      setClientLinkFeedback({ type: 'error', message: 'Escribe al menos 2 caracteres para buscar.' });
      setClientLinkResults([]);
      return;
    }

    setClientLinkLoading(true);
    try {
      const res = await api.get('/people/search', { params: { q: query, limit: 8 } });
      setClientLinkResults(res.data || []);
      if (!res.data?.length) {
        setClientLinkFeedback({ type: 'error', message: 'No se encontraron personas con ese criterio.' });
      }
    } catch (error) {
      setClientLinkFeedback({ type: 'error', message: error.response?.data?.message || 'Error buscando personas.' });
      setClientLinkResults([]);
    } finally {
      setClientLinkLoading(false);
    }
  };

  const submitClientLinkRequest = async () => {
    if (!clientSelectedPerson?.id) {
      setClientLinkFeedback({ type: 'error', message: 'Selecciona una persona para solicitar vinculación.' });
      return;
    }

    try {
      await api.post('/link-requests', {
        personId: clientSelectedPerson.id,
        notes: 'Solicitud creada desde panel cliente',
      });
      setClientLinkFeedback({ type: 'success', message: 'Solicitud enviada. Un administrador debe aprobarla.' });
    } catch (error) {
      setClientLinkFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear la solicitud.' });
    }
  };

  const createClientUser = async (event) => {
    event.preventDefault();
    setAdminCreateUserFeedback({ type: '', message: '' });
    if (!adminUserForm.email || !adminUserForm.password) {
      setAdminCreateUserFeedback({ type: 'error', message: 'Correo y contraseña son obligatorios.' });
      return;
    }

    setAdminCreateUserLoading(true);
    try {
      const res = await api.post('/auth/register-managed', {
        email: adminUserForm.email,
        password: adminUserForm.password,
        role: 'CLIENT',
        person: adminUserForm.person
          ? undefined
          : {
              name: adminUserForm.email.split('@')[0],
            },
      });

      if (adminUserForm.person?.id) {
        await api.patch(`/users/${res.data.id}/person-link`, { personId: adminUserForm.person.id });
      }

      setAdminCreateUserFeedback({ type: 'success', message: 'Usuario cliente creado correctamente.' });
      setAdminUserForm({ email: '', password: '', person: null });
      await loadUsers();
      await loadLinkRequests();
    } catch (error) {
      setAdminCreateUserFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo crear el usuario cliente.' });
    } finally {
      setAdminCreateUserLoading(false);
    }
  };

  const adminLinkUserToPerson = async () => {
    setAdminLinkFeedback({ type: '', message: '' });
    if (!selectedUserId || !selectedLinkPerson?.id) {
      setAdminLinkFeedback({ type: 'error', message: 'Selecciona usuario y persona para vincular.' });
      return;
    }

    try {
      await api.patch(`/users/${selectedUserId}/person-link`, { personId: selectedLinkPerson.id });
      setAdminLinkFeedback({ type: 'success', message: 'Usuario vinculado con la persona seleccionada.' });
      setSelectedUserId('');
      setSelectedLinkPerson(null);
      await loadUsers();
    } catch (error) {
      setAdminLinkFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo vincular el usuario.' });
    }
  };

  const applyFilters = async () => {
    await loadSheets({ page: 1 });
  };

  const clearFilters = async () => {
    setQ('');
    setSellerFilter('');
    setBuyerFilter('');
    setSellerPhoneFilter('');
    setBuyerPhoneFilter('');
    setFrom('');
    setTo('');
    setPaymentStatus('');
    setPage(1);

    await loadSheets({
      q: '',
      seller: '',
      buyer: '',
      sellerPhone: '',
      buyerPhone: '',
      from: '',
      to: '',
      paymentStatus: '',
      page: 1,
    });
  };

  const feedbackClass = (type) =>
    type === 'error'
      ? 'text-red-300'
      : type === 'success'
      ? 'text-emerald-300'
      : 'text-zinc-400';

  return (
    <div className="space-y-6">
      <Panel title="Buscar planillas" subtitle="Filtros por nombre, teléfono, rango de fecha y estado de pago.">
        <div className="mb-3 flex items-center justify-between">
          <RoleBadge role={role} />
        </div>

        {listError && <div className="mb-3 rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">{listError}</div>}

        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Buscar por vendedor/comprador/número"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Filtro vendedor"
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
          />
          <input
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Filtro comprador"
            value={buyerFilter}
            onChange={(e) => setBuyerFilter(e.target.value)}
          />
          <input
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Teléfono vendedor"
            value={sellerPhoneFilter}
            onChange={(e) => setSellerPhoneFilter(e.target.value)}
          />
          <input
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Teléfono comprador"
            value={buyerPhoneFilter}
            onChange={(e) => setBuyerPhoneFilter(e.target.value)}
          />
          <input type="date" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="">Todos los pagos</option>
            <option value="paid">Pagadas</option>
            <option value="unpaid">Pendientes</option>
            <option value="paid_today">Pagadas hoy</option>
            <option value="paid_yesterday">Pagadas ayer</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={applyFilters} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Aplicar</button>
          <button onClick={clearFilters} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">Limpiar</button>
          {isAdmin && (
            <button onClick={exportExcel} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">
              Exportar Excel
            </button>
          )}
        </div>
      </Panel>

      {isClient && (
        <Panel
          title="Solicitar vinculación de cuenta"
          subtitle="Busca tu persona existente y envía una solicitud para que administración apruebe la vinculación."
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Nombre, teléfono o cédula"
              value={clientLinkQuery}
              onChange={(e) => setClientLinkQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={searchClientLinkPeople}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
              disabled={clientLinkLoading}
            >
              {clientLinkLoading ? 'Buscando...' : 'Buscar persona'}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {clientLinkResults.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => setClientSelectedPerson(person)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  clientSelectedPerson?.id === person.id
                    ? 'border-emerald-500 bg-emerald-900/20 text-emerald-200'
                    : 'border-zinc-700 bg-zinc-950 text-zinc-200'
                }`}
              >
                <div className="font-medium">{person.name}</div>
                <div className="text-xs text-zinc-400">{person.phone || 'Sin teléfono'} {person.cedula ? `- CI ${person.cedula}` : ''}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className={`text-sm ${feedbackClass(clientLinkFeedback.type)}`}>{clientLinkFeedback.message}</div>
            <button type="button" onClick={submitClientLinkRequest} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">
              Enviar solicitud
            </button>
          </div>
        </Panel>
      )}

      {isOperator && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Crear persona (para planilla)" subtitle="Crea una persona operativa para usarla como vendedor/comprador.">
            <form className="grid gap-3" onSubmit={submitPersonForm}>
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder="Nombre"
                value={personForm.name}
                onChange={(e) => setPersonForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder="Teléfono"
                value={personForm.phone}
                onChange={(e) => setPersonForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder="Cédula"
                value={personForm.cedula}
                onChange={(e) => setPersonForm((prev) => ({ ...prev, cedula: e.target.value }))}
              />

              <div className="flex items-center justify-between">
                <span className={`text-sm ${feedbackClass(personFeedback.type)}`}>{personFeedback.message}</span>
                <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60" disabled={creatingPerson}>
                  {creatingPerson ? 'Creando...' : 'Crear persona'}
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Crear nueva planilla" subtitle="Selecciona vendedor y comprador (Personas).">
            <form onSubmit={createSheet} className="space-y-3">
              <PersonAutocomplete
                label="Vendedor"
                value={seller}
                onSelect={setSeller}
                onCreate={(name) => createPersonInline(name, 'seller')}
                onError={(msg) => setSheetFeedback({ type: 'error', message: msg })}
              />
              {seller?.id && <p className="text-xs text-zinc-400">Seleccionado: {seller.name} (ID {seller.id})</p>}

              <PersonAutocomplete
                label="Comprador"
                value={buyer}
                onSelect={setBuyer}
                onCreate={(name) => createPersonInline(name, 'buyer')}
                onError={(msg) => setSheetFeedback({ type: 'error', message: msg })}
              />
              {buyer?.id && <p className="text-xs text-zinc-400">Seleccionado: {buyer.name} (ID {buyer.id})</p>}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                <span className={`text-sm ${feedbackClass(sheetFeedback.type)}`}>{sheetFeedback.message}</span>
                <button disabled={creatingSheet} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                  {creatingSheet ? 'Creando...' : 'Crear planilla'}
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {isOperator && (
        <Panel title="Precio global por cabeza" subtitle={`Actual: ${defaultPrice}`}>
          {isAdmin ? (
            <div className="flex gap-2">
              <input
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                inputMode="numeric"
              />
              <button type="button" onClick={saveDefaultPrice} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">
                Guardar
              </button>
              <span className={`self-center text-sm ${feedbackClass(priceFeedback.type)}`}>{priceFeedback.message}</span>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Solo ADMIN puede modificar este valor.</p>
          )}
        </Panel>
      )}

      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Crear usuario cliente" subtitle="Crea cuentas CLIENT separadas de Personas.">
            <form className="space-y-3" onSubmit={createClientUser}>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder="Correo del usuario cliente"
                value={adminUserForm.email}
                onChange={(e) => setAdminUserForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                type="password"
                placeholder="Contraseña"
                value={adminUserForm.password}
                onChange={(e) => setAdminUserForm((prev) => ({ ...prev, password: e.target.value }))}
              />

              <PersonAutocomplete
                label="Persona existente (opcional)"
                value={adminUserForm.person}
                onSelect={(person) => setAdminUserForm((prev) => ({ ...prev, person }))}
                onError={(msg) => setAdminCreateUserFeedback({ type: 'error', message: msg })}
              />

              <div className="flex items-center justify-between gap-3">
                <span className={`text-sm ${feedbackClass(adminCreateUserFeedback.type)}`}>{adminCreateUserFeedback.message}</span>
                <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60" disabled={adminCreateUserLoading}>
                  {adminCreateUserLoading ? 'Creando...' : 'Crear usuario cliente'}
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Vincular usuario ? persona" subtitle="Vinculación manual por administrador.">
            <div className="space-y-3">
              <select
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Seleccionar usuario</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{`${user.email} (${user.role})${user.person ? ` - ${user.person.name}` : ''}`}</option>
                ))}
              </select>

              <PersonAutocomplete
                label="Persona a vincular"
                value={selectedLinkPerson}
                onSelect={setSelectedLinkPerson}
                onError={(msg) => setAdminLinkFeedback({ type: 'error', message: msg })}
              />
              {selectedLinkPerson?.id && (
                <p className="text-xs text-zinc-400">Persona seleccionada: {selectedLinkPerson.name} (ID {selectedLinkPerson.id})</p>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className={`text-sm ${feedbackClass(adminLinkFeedback.type)}`}>{adminLinkFeedback.message}</span>
                <button type="button" onClick={adminLinkUserToPerson} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">
                  Vincular
                </button>
              </div>
            </div>
          </Panel>

          <AdminUserManagement />

          <Panel title="Solicitudes de vinculación" subtitle="Aprobar o rechazar solicitudes pendientes.">
            <div className="space-y-2">
              {linkRequests.length === 0 && <div className="text-sm text-zinc-500">Sin solicitudes.</div>}
              {linkRequests.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
                  <div className="text-sm text-zinc-200">{item.user.email} {' ? '} {item.person.name} ({item.status})</div>
                  <div className="text-xs text-zinc-500">{item.notes || 'Sin notas'}</div>
                  {item.status === 'PENDING' && (
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => reviewLinkRequest(item.id, 'APPROVED')} className="rounded-lg bg-emerald-300 px-3 py-1 text-xs font-semibold text-black">Aprobar</button>
                      <button type="button" onClick={() => reviewLinkRequest(item.id, 'REJECTED')} className="rounded-lg bg-red-300 px-3 py-1 text-xs font-semibold text-black">Rechazar</button>
                    </div>
                  )}
                </div>
              ))}
              <div className={`text-sm ${feedbackClass(adminLinkFeedback.type)}`}>{adminLinkFeedback.message}</div>
            </div>
          </Panel>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="border-b border-zinc-800 px-5 py-3 text-sm text-zinc-400">
          {loading ? 'Cargando...' : `${sheets.length} planillas en página / ${total} totales`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-400">
                <th className="px-4 py-2">Planilla</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2">Comprador</th>
                <th className="px-4 py-2">Liquidador</th>
                <th className="px-4 py-2">Pago</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {!loading && sheets.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-zinc-500" colSpan={8}>
                    {hasActiveFilters
                      ? 'No hay planillas para tus filtros.'
                      : isClient
                      ? 'No tienes planillas accesibles para tu rol.'
                      : 'No hay planillas registradas.'}
                  </td>
                </tr>
              )}
              {sheets.map((sheet) => (
                <tr key={sheet.id} className="border-t border-zinc-800 text-zinc-200">
                  <td className="px-4 py-3 font-medium">{sheet.visibleNumber}</td>
                  <td className="px-4 py-3">{new Date(sheet.date).toLocaleString()}</td>
                  <td className="px-4 py-3">{sheet.seller?.name}</td>
                  <td className="px-4 py-3">{sheet.buyer?.name}</td>
                  <td className="px-4 py-3">{sheet.liquidadorAliasSnapshot}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${sheet.isPaid ? 'bg-emerald-900/30 text-emerald-300' : 'bg-amber-900/30 text-amber-300'}`}>
                      {sheet.isPaid ? 'Pagada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{sheet.totalValue}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => onOpen(sheet.id)} className="rounded-lg border border-zinc-700 px-3 py-1 text-xs">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
          <div>Página {page} de {totalPages}</div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => loadSheets({ page: page - 1 })}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 disabled:opacity-50"
              disabled={page >= totalPages || loading}
              onClick={() => loadSheets({ page: page + 1 })}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

