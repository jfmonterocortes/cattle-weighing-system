import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlanillasPage from '../pages/PlanillasPage';

const mockGet = vi.fn();

vi.mock('../api', () => ({
  api: {
    get: (...args) => mockGet(...args),
  },
}));

function makeToken(payload) {
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `a.${encoded}.b`;
}

describe('Planillas page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', makeToken({ userId: 20, role: 'CLIENT', personId: 3 }));

    mockGet.mockImplementation((url) => {
      if (url === '/settings') {
        return Promise.resolve({
          data: {
            profile: {
              personId: 3,
              person: { id: 3, name: 'Carlos Propietario' },
            },
            link: {
              latestRequest: null,
            },
          },
        });
      }
      if (url === '/sheets') {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 1,
                visibleNumber: '2026-001',
                date: new Date('2026-03-01T12:00:00Z').toISOString(),
                seller: { name: 'Carlos' },
                buyer: { name: 'Ana' },
                liquidadorAliasSnapshot: 'ANV',
                isPaid: false,
                headCount: 3,
                totalWeight: 980,
                totalValue: 15000,
              },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders queue-style list data, operational summary, and primary action', async () => {
    render(
      <MemoryRouter>
        <PlanillasPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Planilla 2026-001')).toBeInTheDocument());
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText(/Cuenta vinculada a Carlos Propietario/i)).toBeInTheDocument();
    expect(screen.getByText('Tu historial listo para revisar.')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Cabezas')).toBeInTheDocument();
    expect(screen.getByText('Peso total')).toBeInTheDocument();
    expect(screen.getAllByText('Valor total').length).toBeGreaterThan(0);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('980')).toBeInTheDocument();
    expect(screen.getAllByText('15000').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Ver detalle/i })).toBeInTheDocument();
  });

  it('updates query filters instantly and calls backend with aligned params', async () => {
    render(
      <MemoryRouter>
        <PlanillasPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Busca dentro de tu historial sin llenar la pantalla de ruido.')).toBeInTheDocument());
    expect(screen.queryByPlaceholderText('Telefono vendedor')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver filtros por contraparte/i }));

    expect(screen.getByPlaceholderText('Telefono vendedor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Telefono comprador')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Buscar general'), { target: { value: 'Carlos' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/sheets', {
        params: expect.objectContaining({ q: 'Carlos', page: 1, pageSize: 20 }),
      });
    });
  });
});
