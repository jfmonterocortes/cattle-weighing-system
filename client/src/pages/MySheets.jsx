import { useEffect, useState } from "react";
import { api } from "../api";

export default function MySheets({ onOpen }) {
  const [sheets, setSheets] = useState([]);

  useEffect(() => {
    api.get("/pesajes/mis-planillas").then((res) => setSheets(res.data));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Mis planillas</h2>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.reload();
          }}
        >
          Logout
        </button>
      </div>

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
    </div>
  );
}