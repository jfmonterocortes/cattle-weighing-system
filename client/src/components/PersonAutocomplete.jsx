import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

export default function PersonAutocomplete({
  label,
  value,
  onSelect,
  onCreate,
  onError,
  placeholder = 'Buscar persona por nombre o telefono',
  minQueryLength = 1,
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

  const trimmedQuery = query.trim();
  const belowMinimum = trimmedQuery.length > 0 && trimmedQuery.length < minQueryLength;

  const showCreate = useMemo(
    () =>
      trimmedQuery.length >= Math.max(2, minQueryLength) &&
      !loading &&
      results.length === 0 &&
      !error &&
      typeof onCreate === 'function',
    [trimmedQuery, minQueryLength, loading, results, error, onCreate]
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

  const loadPeople = useEffectEvent(async (text) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/people/search', {
        params: {
          q: text || undefined,
          limit: 25,
        },
      });
      const items = Array.isArray(res.data) ? res.data : [];
      setResults(items);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error buscando personas';
      setResults([]);
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!open) return;
    if (!trimmedQuery || belowMinimum) {
      clearTimeout(timeoutRef.current);
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      loadPeople(trimmedQuery);
    }, 200);
    return () => clearTimeout(timeoutRef.current);
  }, [trimmedQuery, belowMinimum, open]);

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
          onClick={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width, zIndex: 10000 }}
            className="max-h-72 overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {loading && <div className="px-3 py-2 text-sm text-zinc-400">Buscando...</div>}
            {!loading && !error && belowMinimum && (
              <div className="px-3 py-2 text-sm text-zinc-400">Escribe al menos {minQueryLength} caracteres para buscar.</div>
            )}
            {!loading && error && <div className="px-3 py-2 text-sm text-red-300">{error}</div>}
            {!loading && !error && !belowMinimum && trimmedQuery && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-400">Sin resultados.</div>
            )}

            {!loading &&
              !error &&
              results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-zinc-800"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectItem(person);
                  }}
                >
                  <div className="text-sm font-medium text-zinc-100">{person.name}</div>
                  <div className="text-xs text-zinc-400">
                    {person.phone || 'Sin telefono'} {person.cedula ? `- CI ${person.cedula}` : ''}
                  </div>
                </button>
              ))}

            {showCreate && (
              <button
                type="button"
                className="w-full border-t border-zinc-700 px-3 py-2 text-left text-sm text-emerald-300 hover:bg-zinc-800"
                onMouseDown={async (e) => {
                  e.preventDefault();
                  try {
                    const created = await onCreate(trimmedQuery);
                    if (created?.id) selectItem(created);
                    else setOpen(false);
                  } catch {
                    // onCreate handles feedback
                  }
                }}
              >
                Crear persona "{trimmedQuery}"
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
