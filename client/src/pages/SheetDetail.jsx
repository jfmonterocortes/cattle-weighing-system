import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { parseJwt } from "../utils/jwt";
import { ArrowLeft, BadgePlus, User, Users, Weight } from "lucide-react";

function Card({ children }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/35 p-6 backdrop-blur">
      {children}
    </div>
  );
}

export default function SheetDetail({ sheetId, onBack }) {
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin form
  const [number, setNumber] = useState("");
  const [type, setType] = useState("vaca");
  const [sex, setSex] = useState("hembra");
  const [weight, setWeight] = useState("");
  const [mark, setMark] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const isAdmin = payload?.role === "ADMIN";

  const loadSheet = async () => {
    setLoading(true);
    const res = await api.get(`/planillas/${sheetId}`);
    setSheet(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId]);

  const submitCattle = async (e) => {
    e.preventDefault();
    setFormError("");

    const parsedWeight = Number(weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setFormError("Weight must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/planillas/${sheetId}/reses`, {
        number,
        type,
        sex,
        weight: parsedWeight,
        mark: mark.trim() ? mark.trim() : null,
      });

      setNumber("");
      setWeight("");
      setMark("");

      await loadSheet();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 403
          ? "Only ADMIN can add cattle."
          : "Could not add cattle.");
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/35 p-6 text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/35 p-6 text-zinc-400">
        Not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-sm hover:bg-zinc-900"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-right">
          <div className="text-sm text-zinc-400">Weighing sheet</div>
          <div className="text-2xl font-semibold tracking-tight">
            #{sheet.id}
          </div>
          <div className="text-xs text-zinc-500">
            {new Date(sheet.date).toLocaleString()}
          </div>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Overview
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Seller, buyer and computed totals.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-right">
              <div className="text-xs text-zinc-400">Total</div>
              <div className="text-lg font-semibold">{sheet.totalWeight ?? "-"}</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-right">
              <div className="text-xs text-zinc-400">Average</div>
              <div className="text-lg font-semibold">{sheet.averageWeight ?? "-"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex items-center gap-2 text-zinc-300">
              <User size={16} className="text-zinc-400" />
              <span className="font-semibold">Seller</span>
            </div>
            <div className="mt-2 text-sm text-zinc-200">{sheet.seller.name}</div>
            <div className="text-sm text-zinc-400">Cedula: {sheet.seller.cedula}</div>
            {sheet.seller.phone && (
              <div className="text-sm text-zinc-400">Phone: {sheet.seller.phone}</div>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex items-center gap-2 text-zinc-300">
              <Users size={16} className="text-zinc-400" />
              <span className="font-semibold">Buyer</span>
            </div>
            <div className="mt-2 text-sm text-zinc-200">{sheet.buyer.name}</div>
            <div className="text-sm text-zinc-400">Cedula: {sheet.buyer.cedula}</div>
            {sheet.buyer.phone && (
              <div className="text-sm text-zinc-400">Phone: {sheet.buyer.phone}</div>
            )}
          </div>
        </div>
      </Card>

      {isAdmin && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Add cattle</h3>
              <p className="text-sm text-zinc-400">
                Add a record; totals update automatically.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-2 text-zinc-300">
              <BadgePlus size={18} />
            </div>
          </div>

          <form onSubmit={submitCattle} className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-300">Number</label>
              <input
                className="mt-1 w-full rounded-2xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="15"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-300">Mark (optional)</label>
              <input
                className="mt-1 w-full rounded-2xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                value={mark}
                onChange={(e) => setMark(e.target.value)}
                placeholder="AB"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-300">Type</label>
              <select
                className="mt-1 w-full rounded-2xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="vaca">vaca</option>
                <option value="toro">toro</option>
                <option value="bufalo">bufalo</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-300">Sex</label>
              <select
                className="mt-1 w-full rounded-2xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
              >
                <option value="hembra">hembra</option>
                <option value="macho">macho</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm text-zinc-300">Weight</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 focus-within:border-zinc-600">
                <Weight size={16} className="text-zinc-400" />
                <input
                  className="w-full bg-transparent outline-none text-sm"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="450"
                />
              </div>
            </div>

            {formError && (
              <div className="sm:col-span-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {formError}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end">
              <button
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add cattle"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/35 backdrop-blur overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Cattle</h3>
            <p className="text-sm text-zinc-400">Records linked to this sheet.</p>
          </div>
          <span className="text-xs text-zinc-400 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1">
            {sheet.cattle.length} items
          </span>
        </div>

        {sheet.cattle.length === 0 ? (
          <div className="p-6 text-zinc-400">No cattle yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 font-medium">Number</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Sex</th>
                  <th className="px-6 py-3 font-medium">Weight</th>
                  <th className="px-6 py-3 font-medium">Mark</th>
                </tr>
              </thead>
              <tbody>
                {sheet.cattle.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-800/60 hover:bg-zinc-950/40 transition"
                  >
                    <td className="px-6 py-3 font-semibold">{c.number}</td>
                    <td className="px-6 py-3">{c.type}</td>
                    <td className="px-6 py-3">{c.sex}</td>
                    <td className="px-6 py-3">{c.weight}</td>
                    <td className="px-6 py-3">{c.mark ?? "-"}</td>
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