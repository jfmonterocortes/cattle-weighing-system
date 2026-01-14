import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { parseJwt } from "../utils/jwt";
import { Plus, FileText, Scale, Sigma, Search } from "lucide-react";
import PersonAutocomplete from "../components/PersonAutocomplete";

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/35">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
    </div>
  );
}

export default function MySheets({ onOpen }) {
  const [planillas, setPlanillas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros (cliente)
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Autocomplete (buscador de planillas)
  const [openSug, setOpenSug] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [loadingSug, setLoadingSug] = useState(false);

  // Admin: create sheet
  const [nombreVendedor, setNombreVendedor] = useState("");
  const [telefonoVendedor, setTelefonoVendedor] = useState("");
  const [nombreComprador, setNombreComprador] = useState("");
  const [telefonoComprador, setTelefonoComprador] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");

  const token = localStorage.getItem("token");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const esAdmin = payload?.role === "ADMIN";

  const cargarPlanillas = async (params = {}) => {
    setCargando(true);
    try {
      const res = await api.get("/pesajes/mis-planillas", { params });
      setPlanillas(res.data || []);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPlanillas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce: sugerencias para buscador de planillas (nombre o teléfono)
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setSugs([]);
      setOpenSug(false);
      return;
    }

    const t = setTimeout(async () => {
      setLoadingSug(true);
      try {
        const res = await api.get("/pesajes/sugerencias-personas", {
          params: { q: query },
        });
        setSugs(res.data || []);
        setOpenSug(true);
      } finally {
        setLoadingSug(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [q]);

  const aplicarFiltros = async () => {
    await cargarPlanillas({
      q: q.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  };

  const limpiarFiltros = async () => {
    setQ("");
    setFrom("");
    setTo("");
    setOpenSug(false);
    setSugs([]);
    await cargarPlanillas();
  };

  const totalPlanillas = planillas.length;
  const pesoTotal = planillas.reduce((sum, p) => sum + (p.totalWeight ?? 0), 0);
  const promedioPorPlanilla =
    totalPlanillas > 0 ? Math.round(pesoTotal / totalPlanillas) : 0;

  const crearPlanilla = async (e) => {
    e.preventDefault();
    setErrorCrear("");

    // Backend: requiere nombres (teléfono solo para autocompletar/mostrar)
    if (!nombreVendedor.trim() || !nombreComprador.trim()) {
      setErrorCrear("El nombre del vendedor y del comprador es obligatorio.");
      return;
    }

    setCreando(true);
    try {
      const res = await api.post("/pesajes/crear-planilla-nombre", {
        seller: { name: nombreVendedor.trim() },
        buyer: { name: nombreComprador.trim() },
      });

      await cargarPlanillas();
      onOpen(res.data.id);

      setNombreVendedor("");
      setTelefonoVendedor("");
      setNombreComprador("");
      setTelefonoComprador("");
    } catch (err) {
      const msg =
        err?.response?.data?.message || "No se pudo crear la planilla.";
      setErrorCrear(msg);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FileText size={18} />}
          label="Planillas"
          value={totalPlanillas}
        />
        <StatCard
          icon={<Sigma size={18} />}
          label="Peso total (suma)"
          value={pesoTotal || 0}
        />
        <StatCard
          icon={<Scale size={18} />}
          label="Promedio por planilla"
          value={promedioPorPlanilla || 0}
        />
      </div>

      {/* Filtros (para CLIENT y también ADMIN) */}
      <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/35">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Buscar planillas
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Busca por <span className="font-medium">nombre o teléfono</span>{" "}
              del vendedor o comprador, y filtra por fechas si quieres.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
            <Search size={18} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {/* Buscador con autocomplete */}
          <div className="relative sm:col-span-1">
            <label className="text-sm text-zinc-700 dark:text-zinc-300">
              Nombre o teléfono
            </label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60 dark:focus-within:border-zinc-600">
              <Search
                size={16}
                className="text-zinc-500 dark:text-zinc-400"
              />
              <input
                className="w-full bg-transparent outline-none text-sm text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => {
                  if (sugs.length) setOpenSug(true);
                }}
                onBlur={() => {
                  setTimeout(() => setOpenSug(false), 120);
                }}
                placeholder="Ej: Lucas o 300"
              />
              {loadingSug && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  ...
                </span>
              )}
            </div>

            {openSug && sugs.length > 0 && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                {sugs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={async () => {
                      // ✅ Si tiene teléfono, usamos teléfono (mejor precisión). Si no, nombre.
                      const value = p.phone ? p.phone : p.name;
                      setQ(value);
                      setOpenSug(false);

                      await cargarPlanillas({
                        q: value,
                        from: from || undefined,
                        to: to || undefined,
                      });
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {p.name}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      {p.phone ? p.phone : "Sin teléfono"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fecha desde */}
          <div>
            <label className="text-sm text-zinc-700 dark:text-zinc-300">
              Desde
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          {/* Fecha hasta */}
          <div>
            <label className="text-sm text-zinc-700 dark:text-zinc-300">
              Hasta
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="sm:col-span-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:bg-zinc-900"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={aplicarFiltros}
              className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Crear planilla (Admin) */}
      {esAdmin && (
        <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/35">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Crear nueva planilla
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Busca por <span className="font-medium">nombre o teléfono</span>{" "}
                y selecciona. Si no existe, escribe los datos para crearlo.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
              <Plus size={18} />
            </div>
          </div>

          <form onSubmit={crearPlanilla} className="mt-5 grid gap-3 sm:grid-cols-2">
            <PersonAutocomplete
              label="Vendedor"
              valueName={nombreVendedor}
              valuePhone={telefonoVendedor}
              onChangeName={setNombreVendedor}
              onChangePhone={setTelefonoVendedor}
              placeholderName="Nombre vendedor"
              placeholderPhone="Teléfono vendedor"
            />

            <PersonAutocomplete
              label="Comprador"
              valueName={nombreComprador}
              valuePhone={telefonoComprador}
              onChangeName={setNombreComprador}
              onChangePhone={setTelefonoComprador}
              placeholderName="Nombre comprador"
              placeholderPhone="Teléfono comprador"
            />

            <div className="sm:col-span-2 flex items-center justify-between gap-3">
              <div className="min-h-[20px]">
                {errorCrear && (
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {errorCrear}
                  </p>
                )}
              </div>

              <button
                disabled={creando}
                className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {creando ? "Creando..." : "Crear planilla"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla planillas */}
      <div className="rounded-3xl border border-zinc-200 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/35 overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Planillas
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Abre una planilla para ver reses, totales y promedio.
            </p>
          </div>

          <span className="text-xs text-zinc-600 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60">
            {cargando ? "Cargando…" : `${planillas.length} encontradas`}
          </span>
        </div>

        {cargando ? (
          <div className="p-6 text-zinc-600 dark:text-zinc-400">Cargando…</div>
        ) : planillas.length === 0 ? (
          <div className="p-6 text-zinc-600 dark:text-zinc-400">
            No hay planillas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Promedio</th>
                  <th className="px-6 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {planillas.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-zinc-200/70 hover:bg-zinc-50 transition dark:border-zinc-800/60 dark:hover:bg-zinc-950/40"
                  >
                    <td className="px-6 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {p.id}
                    </td>
                    <td className="px-6 py-3 text-zinc-800 dark:text-zinc-200">
                      {new Date(p.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">{p.totalWeight ?? "-"}</td>
                    <td className="px-6 py-3">{p.averageWeight ?? "-"}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => onOpen(p.id)}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:bg-zinc-900"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
