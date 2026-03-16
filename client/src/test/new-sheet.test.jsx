import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewSheetPage from '../pages/NewSheetPage';

const mockPost = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../api', () => ({
  api: {
    post: (...args) => mockPost(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../components/PersonAutocomplete', () => ({
  default: function MockPersonAutocomplete({ label, onSelect }) {
    const person = label === 'Vendedor' ? { id: 1, name: 'Carlos' } : { id: 2, name: 'Ana' };
    return (
      <button type="button" onClick={() => onSelect(person)}>
        Seleccionar {label}
      </button>
    );
  },
}));

function makeToken(payload) {
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `a.${encoded}.b`;
}

describe('NewSheetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', makeToken({ userId: 1, role: 'LIQUIDADOR' }));
    mockPost.mockResolvedValue({ data: { id: 12, visibleNumber: '2026-100' } });
  });

  it('keeps seller and buyer primary while allowing optional advanced capture fields', async () => {
    render(
      <MemoryRouter>
        <NewSheetPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar Vendedor/i }));
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar Comprador/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ajustes de captura opcionales/i }));

    fireEvent.change(screen.getByLabelText(/Fecha y hora/i), { target: { value: '2026-03-16T09:30' } });
    fireEvent.change(screen.getByLabelText(/Precio por cabeza/i), { target: { value: '6200' } });
    fireEvent.change(screen.getByLabelText(/Alias de liquidador/i), { target: { value: 'ANV' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar planilla/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/sheets', expect.objectContaining({
      sellerId: 1,
      buyerId: 2,
      pricePerHead: 6200,
      liquidadorAlias: 'ANV',
    })));
    expect(mockNavigate).toHaveBeenCalledWith('/planillas/12');
  });
});
