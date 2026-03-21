import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';

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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', makeToken({ userId: 1, role: 'ADMIN' }));

    mockGet.mockImplementation((url, config) => {
      if (url === '/sheets' && config?.params?.pageSize === 6) {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 1,
                visibleNumber: '2026-001',
                seller: { name: 'Carlos' },
                buyer: { name: 'Ana' },
                isPaid: false,
                headCount: 3,
                totalWeight: 980,
                totalValue: 15000,
              },
            ],
            total: 1,
          },
        });
      }

      if (url === '/sheets' && config?.params?.paymentStatus === 'paid') {
        return Promise.resolve({ data: { total: 2 } });
      }

      if (url === '/sheets' && config?.params?.paymentStatus === 'unpaid') {
        return Promise.resolve({ data: { total: 4 } });
      }

      if (url === '/sheets') {
        return Promise.resolve({ data: { total: 6 } });
      }

      if (url === '/link-requests') {
        return Promise.resolve({
          data: [
            {
              id: 10,
              status: 'PENDING',
              requestedAt: '2026-03-10T12:00:00.000Z',
              notes: 'Cliente esperando aprobacion',
              user: { email: 'cliente@bascula.com' },
              person: { name: 'Rosa Martinez' },
            },
          ],
        });
      }

      return Promise.resolve({ data: {} });
    });
  });

  it('prioritizes pending link approvals and operational actions for admin', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Solicitudes que requieren revisión')).toBeInTheDocument());
    expect(screen.getByText('Solicitudes pendientes')).toBeInTheDocument();
    expect(screen.getByText('Registrar planilla')).toBeInTheDocument();
    expect(screen.getByText('Cuentas y vinculaciones')).toBeInTheDocument();
    expect(screen.getByText(/cliente@bascula.com -> Rosa Martinez/i)).toBeInTheDocument();
    expect(screen.getByText('Planilla 2026-001')).toBeInTheDocument();
  });
});
