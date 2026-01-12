import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { parseJwt } from "../utils/jwt";

export default function MySheets({ onOpen }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin form
  const [sellerCedula, setSellerCedula] = useState("");
  const [buyerCedula, setBuyerCedula] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const token = localStorage.getItem("token");
  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const isAdmin = payload?.role === "ADMIN";

  const loadSheets = async () => {
    setLoading(true);
    const res = await api.get("/pesajes/mis-planillas");
    setSheets(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadSheets();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

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

      // refresh list and open detail
      await loadSheets();
      onOpen(res.data.id);

      // reset
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
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Mis planillas</h2>
        <button onClick={logout}>Logout</button>
      </div>

      {/* ✅ Admin create sheet */}
      {isAdmin && (
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3>Crear planilla (Admin)</h3>
          <form onSubmit={createSheet} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
            <label>
              Cédula vendedor
              <input
                style={{ width: "100%", padding: 10 }}
                value={sellerCedula}
                onChange={(e) => setSellerCedula(e.target.value)}
                placeholder="Ej: 1234567890"
              />
            </label>

            <label>
              Cédula comprador
              <input
                style={{ width: "100%", padding: 10 }}
                value={buyerCedula}
                onChange={(e) => setBuyerCedula(e.target.value)}
                placeholder="Ej: 0000000000"
              />
            </label>

            {createError && <p style={{ color: "crimson", margin: 0 }}>{createError}</p>}

            <button disabled={creating} style={{ padding: 10 }}>
              {creating ? "Creando..." : "Crear planilla"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th>ID</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Promedio</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sheets.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{s.id}</td>
                <td>{new Date(s.date).toLocaleString()}</td>
                <td>{s.totalWeight ?? "-"}</td>
                <td>{s.averageWeight ?? "-"}</td>
                <td>
                  <button onClick={() => onOpen(s.id)}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}