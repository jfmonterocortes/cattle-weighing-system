import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { parseJwt } from "../utils/jwt";
import { Plus, FileText, Scale, Sigma } from "lucide-react";

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400">{label}</div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2 text-zinc-300">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export default function MySheets({ onOpen }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin create sheet
  const [sellerCedula, setSellerCedula] = useState("");
  const [buyerCedula, setBuyerCedula] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const token = localStorage.getItem("token");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const isAdmin = payload?.role === "ADMIN";

  const loadSheets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/pesajes/mis-planillas");
      setSheets(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();
  }, []);

  const totalSheets = sheets.length;
  const totalWeight = sheets.reduce((sum, s) => sum + (s.totalWeight ?? 0), 0);
  const avgWeight =
    totalSheets > 0 ? Math.round(totalWeight / totalSheets) : 0;

  const createSheet = async (e) => {
    e.preventDefault();
    setCreateError("");

    if (!sellerCedula.trim() || !buyerCedula.trim()) {
      setCreateError("Seller and Buyer cedula are required.");
      return;
    }

    setCreating(true);
    try {
      const res = await api.post("/pesajes/crear-planilla", {
        sellerCedula: sellerCedula.trim(),
        buyerCedula: buyerCedula.trim(),
      });

      await loadSheets();
      onOpen(res.data.id);

      setSellerCedula("");
      setBuyerCedula("");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? "Seller or Buyer not found."
          : "Could not create sheet.");
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FileText size={18} />}
          label="Sheets"
          value={totalSheets}
        />
        <StatCard
          icon={<Sigma size={18} />}
          label="Total weight (sum)"
          value={totalWeight || 0}
        />
        <StatCard
          icon={<Scale size={18} />}
          label="Avg per sheet"
          value={avgWeight || 0}
        />
      </div>

      {/* Admin create */}
      {isAdmin && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/35 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Create a new sheet
              </h3>
              <p className="text-sm text-zinc-400">
                Use cedula for seller and buyer. You can add cattle right after.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-2 text-zinc-300">
              <Plus size={18} />
            </div>
          </div>

          <form
            onSubmit={createSheet}
            className="mt-5 grid gap-3 sm:grid-cols-2"
          >
            <div>
              <label className="text-sm text-zinc-300">Seller cedula</label>
              <input
                className="mt-1 w-full rounded-2xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                value={sellerCedula}
                onChange={(e) => setSellerCedula(e.target.value)}
                placeholder="1234567890"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-300">Buyer cedula</label>
              <input
                className="mt-1 w-full rounded-2xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                value={buyerCedula}
                onChange={(e) => setBuyerCedula(e.target.value)}
                placeholder="0000000000"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-3">
              <div className="min-h-[20px]">
                {createError && (
                  <p className="text-sm text-red-300">{createError}</p>
                )}
              </div>

              <button
                disabled={creating}
                className="rounded-2xl bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 hover:opacity-95 disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create sheet"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/35 backdrop-blur overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Sheets</h3>
            <p className="text-sm text-zinc-400">
              Open a sheet to view cattle and totals.
            </p>
          </div>
          <span className="text-xs text-zinc-400 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1">
            {loading ? "Loading…" : `${sheets.length} found`}
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-zinc-400">Loading…</div>
        ) : sheets.length === 0 ? (
          <div className="p-6 text-zinc-400">No sheets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Average</th>
                  <th className="px-6 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-800/60 hover:bg-zinc-950/40 transition"
                  >
                    <td className="px-6 py-3 font-semibold">{s.id}</td>
                    <td className="px-6 py-3 text-zinc-300">
                      {new Date(s.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">{s.totalWeight ?? "-"}</td>
                    <td className="px-6 py-3">{s.averageWeight ?? "-"}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => onOpen(s.id)}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 hover:bg-zinc-900"
                      >
                        View
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