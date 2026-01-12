import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { parseJwt } from "../utils/jwt";
import { ArrowLeft, BadgePlus, User, Users, Weight } from "lucide-react";

function Card({ children }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/35">
      {children}
    </div>
  );
}

export default function SheetDetail({ sheetId, onBack }) {
  const [planilla, setPlanilla] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Admin form
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState("vaca");
  const [sexo, setSexo] = useState("hembra");
  const [peso, setPeso] = useState("");
  const [marca, setMarca] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const token = localStorage.getItem("token");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const esAdmin = payload?.role === "ADMIN";

  const cargarPlanilla = async () => {
    setCargando(true);
    const res = await api.get(`/planillas/${sheetId}`);
    setPlanilla(res.data);
    setCargando(false);
  };

  useEffect(() => {
    cargarPlanilla();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId]);

  const agregarRes = async (e) => {
    e.preventDefault();
    setErrorForm("");

    const pesoNum = Number(peso);
    if (!Number.isFinite(pesoNum) || pesoNum <= 0) {
      setErrorForm("El peso debe ser un número positivo.");
      return;
    }

    setGuardando(true);
    try {
      await api.post(`/planillas/${sheetId}/reses`, {
        number: numero,
        type: tipo,
        sex: sexo,
        weight: pesoNum,
        mark: marca.trim() ? marca.trim() : null,
      });

      setNumero("");
      setPeso("");
      setMarca("");

      await cargarPlanilla();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 403
          ? "Solo ADMIN puede agregar reses."
          : "No se pudo agregar la res.");
      setErrorForm(msg);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/35 dark:text-zinc-400">
        Cargando…
      </div>
    );
  }

  if (!planilla) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/35 dark:text-zinc-400">
        No encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        <div className="text-right">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Planilla</div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            #{planilla.id}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            {new Date(planilla.date).toLocaleString()}
          </div>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Resumen
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Vendedor, comprador y cálculos de peso.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Total</div>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {planilla.totalWeight ?? "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Promedio</div>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {planilla.averageWeight ?? "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
              <User size={16} className="text-zinc-500 dark:text-zinc-400" />
              <span className="font-semibold">Vendedor</span>
            </div>
            <div className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{planilla.seller.name}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Cédula: {planilla.seller.cedula}</div>
            {planilla.seller.phone && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Teléfono: {planilla.seller.phone}</div>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
              <Users size={16} className="text-zinc-500 dark:text-zinc-400" />
              <span className="font-semibold">Comprador</span>
            </div>
            <div className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{planilla.buyer.name}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Cédula: {planilla.buyer.cedula}</div>
            {planilla.buyer.phone && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Teléfono: {planilla.buyer.phone}</div>
            )}
          </div>
        </div>
      </Card>

      {esAdmin && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Agregar res
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Agrega un registro; el total y el promedio se actualizan automáticamente.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
              <BadgePlus size={18} />
            </div>
          </div>

          <form onSubmit={agregarRes} className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Número</label>
              <input
                className="mt-1 w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="15"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Marca (opcional)</label>
              <input
                className="mt-1 w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="AB"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Tipo</label>
              <select
                className="mt-1 w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="vaca">vaca</option>
                <option value="toro">toro</option>
                <option value="bufalo">búfalo</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Sexo</label>
              <select
                className="mt-1 w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
              >
                <option value="hembra">hembra</option>
                <option value="macho">macho</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm text-zinc-700 dark:text-zinc-300">Peso</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60 dark:focus-within:border-zinc-600">
                <Weight size={16} className="text-zinc-500 dark:text-zinc-400" />
                <input
                  className="w-full bg-transparent outline-none text-sm"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="450"
                />
              </div>
            </div>

            {errorForm && (
              <div className="sm:col-span-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {errorForm}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end">
              <button
                disabled={guardando}
                className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {guardando ? "Guardando..." : "Agregar res"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="rounded-3xl border border-zinc-200 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/35 overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Reses
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Registros asociados a esta planilla.
            </p>
          </div>
          <span className="text-xs text-zinc-600 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60">
            {planilla.cattle.length} registros
          </span>
        </div>

        {planilla.cattle.length === 0 ? (
          <div className="p-6 text-zinc-600 dark:text-zinc-400">Aún no hay reses.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-3 font-medium">Número</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Sexo</th>
                  <th className="px-6 py-3 font-medium">Peso</th>
                  <th className="px-6 py-3 font-medium">Marca</th>
                </tr>
              </thead>
              <tbody>
                {planilla.cattle.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-200/70 hover:bg-zinc-50 transition dark:border-zinc-800/60 dark:hover:bg-zinc-950/40"
                  >
                    <td className="px-6 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{r.number}</td>
                    <td className="px-6 py-3">{r.type}</td>
                    <td className="px-6 py-3">{r.sex}</td>
                    <td className="px-6 py-3">{r.weight}</td>
                    <td className="px-6 py-3">{r.mark ?? "-"}</td>
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