import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

  // posición del dropdown (fixed)
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0 });

  const shouldShow = useMemo(() => open && (loading || items.length > 0), [open, loading, items]);

  const updatePosition = () => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    });
  };

  // Click afuera cierra
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounce búsqueda (sirve para nombre o teléfono)
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setItems([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get("/personas/buscar", { params: { query: q } });
        setItems(res.data || []);
        setOpen(true);
      } catch {
        setItems([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  // recalcula posición cuando abre / cambia contenido
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, items.length, valueName, valuePhone]);

  const pick = (p) => {
    onChangeName(p.name);
    onChangePhone(p.phone || "");
    setQuery("");
    setOpen(false);
  };

  const nameInputOnChange = (v) => {
    onChangeName(v);
    setQuery(v); // busca por nombre
    setOpen(true);
  };

  const phoneInputOnChange = (v) => {
    onChangePhone(v);
    setQuery(v); // busca por teléfono
    setOpen(true);
  };

  const dropdown = shouldShow
    ? createPortal(
      <div
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: pos.width,
          zIndex: 999999,
        }}
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
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
              onMouseDown={(e) => e.preventDefault()} // evita blur antes del click
              onClick={() => pick(p)}
              className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {p.phone || "Sin teléfono"}
              </div>
            </button>
          ))}
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <div ref={boxRef}>
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
      </div>

      {dropdown}
    </>
  );
}
