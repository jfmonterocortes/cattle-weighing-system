import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function PersonAutocomplete({
  label,
  valueName,
  valuePhone,
  onChangeName,
  onChangePhone,
  placeholderName = "Nombre",
  placeholderPhone = "Teléfono",
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const boxRef = useRef(null);
  const debounceRef = useRef(null);

  // Cierra dropdown al click afuera
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounce de búsqueda
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setItems([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/personas/buscar?query=${encodeURIComponent(q)}`);
        setItems(res.data || []);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  const pick = (p) => {
    onChangeName(p.name);
    onChangePhone(p.phone || "");
    setQuery("");
    setOpen(false);
  };

  const nameInputOnChange = (v) => {
    onChangeName(v);
    setQuery(v); // busca por nombre mientras escribes
  };

  const phoneInputOnChange = (v) => {
    onChangePhone(v);
    setQuery(v); // busca por teléfono mientras escribes
  };

  return (
    <div ref={boxRef} className="relative">
      <label className="text-sm text-zinc-700 dark:text-zinc-300">{label}</label>

      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <input
          className="w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
          value={valueName}
          onChange={(e) => nameInputOnChange(e.target.value)}
          onFocus={() => (items.length ? setOpen(true) : null)}
          placeholder={placeholderName}
          autoComplete="off"
        />

        <input
          className="w-full rounded-2xl bg-white border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 dark:bg-zinc-950/60 dark:border-zinc-800 dark:focus:border-zinc-600"
          value={valuePhone}
          onChange={(e) => phoneInputOnChange(e.target.value)}
          onFocus={() => (items.length ? setOpen(true) : null)}
          placeholder={placeholderPhone}
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {open && (loading || items.length > 0) && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {loading && (
            <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              Buscando...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              Sin resultados.
            </div>
          )}

          {!loading &&
            items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{p.phone || "Sin teléfono"}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
