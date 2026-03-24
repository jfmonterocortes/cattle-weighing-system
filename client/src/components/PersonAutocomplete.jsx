import { Search } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

export default function PersonAutocomplete({
  label,
  value,
  onSelect,
  onCreate,
  onError,
  placeholder = 'Buscar persona por nombre o teléfono',
  minQueryLength = 1,
}) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;

  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [creating, setCreating] = useState(false);

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

  const totalOptions = results.length + (showCreate ? 1 : 0);
  const activeOptionId = activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    setQuery(value?.name || '');
  }, [value?.id, value?.name]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [results, showCreate]);

  useEffect(() => {
    const handleOutside = (event) => {
      const target = event.target;
      const insideInput = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideInput && !insideDropdown) {
        setOpen(false);
        setActiveIndex(-1);
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
    if (activeIndex < 0) return;
    const el = document.getElementById(`${baseId}-option-${activeIndex}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, baseId]);

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
    setActiveIndex(-1);
    setError('');
    onSelect?.(person);
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setOpen(false);
    setActiveIndex(-1);
    try {
      const created = await onCreate(trimmedQuery);
      if (created?.id) selectItem(created);
    } catch {
      // onCreate handles feedback via onError
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (totalOptions > 0) setActiveIndex((prev) => (prev + 1) % totalOptions);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (totalOptions > 0) setActiveIndex((prev) => (prev <= 0 ? totalOptions - 1 : prev - 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          selectItem(results[activeIndex]);
        } else if (showCreate && activeIndex === results.length) {
          handleCreate();
        }
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        setOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <div ref={containerRef}>
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          {label}
        </label>
        <div className="relative mt-2">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
          <input
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-activedescendant={activeOptionId}
            aria-busy={loading}
            className="w-full rounded-xl border border-stone-300/80 bg-white px-4 py-3 pl-11 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
          />
        </div>
      </div>

      {open &&
        createPortal(
          <div
            id={listboxId}
            ref={dropdownRef}
            role="listbox"
            aria-label={label}
            style={{ position: 'fixed', top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width, zIndex: 10000 }}
            className="animate-fade-up max-h-80 overflow-auto rounded-xl border border-stone-200/80 bg-white/97 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/97 dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {loading && (
              <div role="status" aria-live="polite" className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                Buscando...
              </div>
            )}
            {!loading && !error && belowMinimum && (
              <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                Escribe al menos {minQueryLength} caracteres para buscar.
              </div>
            )}
            {!loading && error && (
              <div role="alert" className="px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            )}
            {!loading && !error && !belowMinimum && trimmedQuery && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Sin resultados.</div>
            )}

            {!loading &&
              !error &&
              results.map((person, index) => (
                <button
                  key={person.id}
                  id={`${baseId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`w-full border-b border-stone-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-stone-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/70 ${activeIndex === index ? 'bg-stone-50 dark:bg-zinc-900/70' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectItem(person);
                  }}
                >
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{person.name}</div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {person.phone || 'Sin teléfono'} {person.cedula ? `- CI ${person.cedula}` : ''}
                  </div>
                </button>
              ))}

            {showCreate && (
              <button
                id={`${baseId}-option-${results.length}`}
                type="button"
                role="option"
                aria-selected={activeIndex === results.length}
                aria-busy={creating}
                disabled={creating}
                className={`w-full border-t border-stone-200/80 px-4 py-3 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-zinc-800/60 dark:text-emerald-400 dark:hover:bg-emerald-500/10 ${activeIndex === results.length ? 'bg-emerald-50 dark:bg-emerald-500/10' : ''}`}
                onMouseEnter={() => setActiveIndex(results.length)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleCreate();
                }}
              >
                {creating ? 'Creando...' : `Crear persona "${trimmedQuery}"`}
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
