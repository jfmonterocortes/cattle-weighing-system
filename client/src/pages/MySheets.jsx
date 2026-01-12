import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { parseJwt } from "../utils/jwt";
import { Plus, FileText, Scale, Sigma } from "lucide-react";

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

  // Admin create sheet
  const [cedulaVendedor, setCedulaVendedor] = useState("");
  const [cedulaComprador, setCedulaComprador] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");

  const token = localStorage.getItem("token");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const esAdmin = payload?.role === "ADMIN";

  const cargarPlanillas = async () => {
    setCargando(true);
    try {
      const res = await api.get("/pesajes/mis-planillas");
      setPlanillas(res.data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPlanillas();
  }, []);

  const totalPlanillas = planillas.length;
  const pesoTotal = planillas.reduce((sum, p) => sum + (p.totalWeight ?? 0), 0);
  const promedioPorPlanilla =
    totalPlanillas > 0 ? Math.round(pesoTotal / totalPlanillas) : 0;

  const crearPlanilla = async (e) => {
    e.preventDefault();
    setErrorCrear("");

    if (!cedulaVendedor.trim() || !cedulaComprador.trim()) {
      setErrorCrear("La cédula del vendedor y del comprador son obligatorias.");
      return;
    }

    setCreando(true);
    try {
      const res = await api.post("/pesajes/crear-planilla", {
        sellerCedula: cedulaVendedor.trim(),
        buyerCedula: cedulaComprador.trim(),
      });

      await cargarPlanillas();
      onOpen(res.data.id);

      setCedulaVendedor("");
      setCedulaComprador("");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? "No se encontró el vendedor o el comprador."
          : "No se pudo crear la planilla.");
      setErrorCrear(msg);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<FileText size={18} />} label="Planillas" value={totalPlanillas} />
        <StatCard icon={<Sigma size={18} />} label="Peso total (suma)" value={pesoTotal || 0} />
        <StatCard icon={<Scale size={18} />} label="Promedio por planilla" value={promedioPorPlanilla || 0} />
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
                Ingresa la cédula del vendedor y del comprador. Después puedes agregar las reses.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
              <Plus size={18} />
            </div>
          </div>

          <form onSubmit={crearPlanilla} className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Cédula vendedor</label>
              <input
                className="mt-1 w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
                value={cedulaVendedor}
                onChange={(e) => setCedulaVendedor(e.target.value)}
                placeholder="1234567890"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Cédula comprador</label>
              <input
                className="mt-1 w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
                value={cedulaComprador}
                onChange={(e) => setCedulaComprador(e.target.value)}
                placeholder="0000000000"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-3">
              <div className="min-h-[20px]">
                {errorCrear && <p className="text-sm text-red-600 dark:text-red-300">{errorCrear}</p>}
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
          <div className="p-6 text-zinc-600 dark:text-zinc-400">No hay planillas.</div>
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
                    <td className="px-6 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{p.id}</td>
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
