import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

export default function PersonAutocomplete({
  label,
  value,
  onSelect,
  onCreate,
  onError,
  placeholder = 'Buscar persona por nombre o teléfono',
}) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  const showCreate = useMemo(
    () => query.trim().length >= 2 && !loading && results.length === 0 && !error && typeof onCreate === 'function',
    [query, loading, results, error, onCreate]
  );

  useEffect(() => {
    setQuery(value?.name || '');
  }, [value?.id, value?.name]);

  useEffect(() => {
    const handleOutside = (event) => {
      const target = event.target;
      const insideInput = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideInput && !insideDropdown) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, [open, results.length, query.length]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError('');
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/people/search', { params: { q, limit: 8 } });
        setResults(res.data || []);
        setOpen(true);
      } catch (err) {
        const msg = err?.response?.data?.message || 'Error buscando personas';
        setResults([]);
        setError(msg);
        onError?.(msg);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutRef.current);
  }, [query, onError]);

  const selectItem = (person) => {
    setQuery(person.name);
    setOpen(false);
    setError('');
    onSelect?.(person);
  };

  return (
    <>
      <div ref={containerRef}>
        <label className="text-sm text-zinc-300">{label}</label>
        <input
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              zIndex: 10000,
            }}
            className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {loading && <div className="px-3 py-2 text-sm text-zinc-400">Buscando...</div>}

            {!loading && error && <div className="px-3 py-2 text-sm text-red-300">{error}</div>}

            {!loading && !error && results.length === 0 && query.trim().length >= 2 && (
              <div className="px-3 py-2 text-sm text-zinc-400">Sin resultados.</div>
            )}

            {!loading &&
              !error &&
              results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-zinc-800"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectItem(person)}
                >
                  <div className="text-sm font-medium text-zinc-100">{person.name}</div>
                  <div className="text-xs text-zinc-400">
                    {person.phone || 'Sin teléfono'} {person.cedula ? `- CI ${person.cedula}` : ''}
                  </div>
                </button>
              ))}

            {showCreate && (
              <button
                type="button"
                className="w-full border-t border-zinc-700 px-3 py-2 text-left text-sm text-emerald-300 hover:bg-zinc-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  onCreate(query.trim());
                }}
              >
                Crear persona "{query.trim()}"
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}


