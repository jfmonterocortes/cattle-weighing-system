import { Search } from 'lucide-react';
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
      top: rect.bottom + 10,
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
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</label>
        <div className="relative mt-2">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 pl-11 text-sm shadow-sm outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
          />
        </div>
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width, zIndex: 10000 }}
            className="max-h-80 overflow-auto rounded-[1.4rem] border border-zinc-200 bg-white/95 shadow-[0_20px_45px_rgba(15,23,42,0.12)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {loading && <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Buscando...</div>}
            {!loading && !error && belowMinimum && (
              <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Escribe al menos {minQueryLength} caracteres para buscar.</div>
            )}
            {!loading && error && <div className="px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}
            {!loading && !error && !belowMinimum && trimmedQuery && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Sin resultados.</div>
            )}

            {!loading &&
              !error &&
              results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="w-full border-b border-zinc-200/70 px-4 py-3 text-left transition last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-900/80"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectItem(person);
                  }}
                >
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{person.name}</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {person.phone || 'Sin telefono'} {person.cedula ? `- CI ${person.cedula}` : ''}
                  </div>
                </button>
              ))}

            {showCreate && (
              <button
                type="button"
                className="w-full border-t border-zinc-200 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-zinc-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                onMouseDown={async (event) => {
                  event.preventDefault();
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
