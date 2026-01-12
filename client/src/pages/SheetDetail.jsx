import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { parseJwt } from "../utils/jwt";

export default function SheetDetail({ sheetId, onBack }) {
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
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

      // Clear inputs
      setNumber("");
      setWeight("");
      setMark("");

      // Refresh sheet (to see new cattle + new totals)
      await loadSheet();
    } catch (err) {
      // If not admin, backend returns 403
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

  if (loading) return <p style={{ fontFamily: "system-ui", margin: 40 }}>Loading...</p>;
  if (!sheet) return <p style={{ fontFamily: "system-ui", margin: 40 }}>Not found</p>;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <button onClick={onBack}>← Back</button>
      <h2>Planilla #{sheet.id}</h2>

      <p><b>Fecha:</b> {new Date(sheet.date).toLocaleString()}</p>

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        <div>
          <h3>Vendedor</h3>
          <div>{sheet.seller.name}</div>
          <div>Cédula: {sheet.seller.cedula}</div>
        </div>

        <div>
          <h3>Comprador</h3>
          <div>{sheet.buyer.name}</div>
          <div>Cédula: {sheet.buyer.cedula}</div>
        </div>
      </div>

      <p><b>Total:</b> {sheet.totalWeight ?? "-"}</p>
      <p><b>Promedio:</b> {sheet.averageWeight ?? "-"}</p>

      {/* ✅ Admin form to add cattle */}
      {isAdmin && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3>Agregar res</h3>

          <form onSubmit={submitCattle} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
            <label>
              Número
              <input
                style={{ width: "100%", padding: 10 }}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ej: 15"
              />
            </label>

            <label>
              Tipo
              <select style={{ width: "100%", padding: 10 }} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="vaca">vaca</option>
                <option value="toro">toro</option>
                <option value="bufalo">bufalo</option>
              </select>
            </label>

            <label>
              Sexo
              <select style={{ width: "100%", padding: 10 }} value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="hembra">hembra</option>
                <option value="macho">macho</option>
              </select>
            </label>

            <label>
              Peso
              <input
                style={{ width: "100%", padding: 10 }}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ej: 450"
              />
            </label>

            <label>
              Marca (opcional)
              <input
                style={{ width: "100%", padding: 10 }}
                value={mark}
                onChange={(e) => setMark(e.target.value)}
                placeholder="Ej: AB"
              />
            </label>

            {formError && <p style={{ color: "crimson", margin: 0 }}>{formError}</p>}

            <button disabled={saving} style={{ padding: 10 }}>
              {saving ? "Guardando..." : "Agregar"}
            </button>
          </form>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>Reses</h3>
      <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>#</th>
            <th>Tipo</th>
            <th>Sexo</th>
            <th>Peso</th>
            <th>Marca</th>
          </tr>
        </thead>
        <tbody>
          {sheet.cattle.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{c.number}</td>
              <td>{c.type}</td>
              <td>{c.sex}</td>
              <td>{c.weight}</td>
              <td>{c.mark ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}