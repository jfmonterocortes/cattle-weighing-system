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
      return Promise.resolve({ data: {} });
    });
  });

  it('renders list data and payment badge', async () => {
    render(
      <MemoryRouter>
        <PlanillasPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('2026-001')).toBeInTheDocument());
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('updates query filters instantly and calls backend with aligned params', async () => {
    render(
      <MemoryRouter>
        <PlanillasPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Buscar general'), { target: { value: 'Carlos' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/sheets', {
        params: expect.objectContaining({ q: 'Carlos', page: 1, pageSize: 20 }),
      });
    });
  });
});
