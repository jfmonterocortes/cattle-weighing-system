import { useEffect, useState } from "react";
import { api } from "../api";

export default function SheetDetail({ sheetId, onBack }) {
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    api.get(`/planillas/${sheetId}`).then((res) => setSheet(res.data));
  }, [sheetId]);

  if (!sheet) return <p style={{ fontFamily: "system-ui", margin: 40 }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <button onClick={onBack}>← Back</button>
      <h2>Planilla #{sheet.id}</h2>

      <p><b>Fecha:</b> {new Date(sheet.date).toLocaleString()}</p>

      <div style={{ display: "flex", gap: 40 }}>
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

      <p><b>Total:</b> {sheet.totalWeight}</p>
      <p><b>Promedio:</b> {sheet.averageWeight}</p>

      <h3>Reses</h3>
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