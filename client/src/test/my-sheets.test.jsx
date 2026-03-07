import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MySheets from '../pages/MySheets';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('../api', () => ({
  api: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    patch: (...args) => mockPatch(...args),
  },
}));

function makeToken(payload) {
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `a.${encoded}.b`;
}

describe('MySheets sheet integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url) => {
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
      if (url === '/people/search') return Promise.resolve({ data: [{ id: 10, name: 'Luis Herrera', phone: '300' }] });
      return Promise.resolve({ data: [] });
    });
    mockPost.mockResolvedValue({ data: { id: 1 } });
    mockPatch.mockResolvedValue({ data: {} });
  });

  it('renders seeded list data from items and shows pending badge', async () => {
    localStorage.setItem('token', makeToken({ userId: 20, role: 'CLIENT', personId: 3 }));

    render(<MySheets onOpen={() => {}} />);

    await waitFor(() => expect(screen.getByText('2026-001')).toBeInTheDocument());
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('applies search filters with backend query contract', async () => {
    localStorage.setItem('token', makeToken({ userId: 20, role: 'CLIENT', personId: 3 }));

    render(<MySheets onOpen={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('Buscar por vendedor/comprador/número'), { target: { value: 'Carlos' } });
    fireEvent.change(screen.getByPlaceholderText('Filtro vendedor'), { target: { value: 'Car' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/sheets', {
        params: expect.objectContaining({ q: 'Carlos', seller: 'Car', page: 1, pageSize: 20 }),
      });
    });
  });

  it('shows create button only for operator roles', async () => {
    localStorage.setItem('token', makeToken({ userId: 20, role: 'CLIENT', personId: 3 }));
    const { unmount } = render(<MySheets onOpen={() => {}} />);

    expect(screen.queryByRole('button', { name: 'Crear planilla' })).not.toBeInTheDocument();
    unmount();

    localStorage.setItem('token', makeToken({ userId: 1, role: 'ADMIN', personId: 1 }));
    render(<MySheets onOpen={() => {}} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear planilla' })).toBeInTheDocument());
  });

  it('shows explicit error banner when list request fails', async () => {
    localStorage.setItem('token', makeToken({ userId: 20, role: 'CLIENT', personId: 3 }));
    mockGet.mockImplementation((url) => {
      if (url === '/sheets') return Promise.reject({ response: { data: { message: 'Forbidden' } } });
      return Promise.resolve({ data: [] });
    });

    render(<MySheets onOpen={() => {}} />);

    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument());
  });

  it('client can search person and submit link request from dedicated panel', async () => {
    localStorage.setItem('token', makeToken({ userId: 20, role: 'CLIENT', personId: null }));

    render(<MySheets onOpen={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('Nombre, teléfono o cédula'), { target: { value: 'Luis' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar persona' }));

    await waitFor(() => expect(screen.getByText('Luis Herrera')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Luis Herrera'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/link-requests', expect.objectContaining({ personId: 10 }));
    });
  });
});

