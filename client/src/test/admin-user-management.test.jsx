import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersPage from '../pages/UsersPage';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockPost = vi.fn();

vi.mock('../api', () => ({
  api: {
    get: (...args) => mockGet(...args),
    patch: (...args) => mockPatch(...args),
    post: (...args) => mockPost(...args),
  },
}));

function makeToken(payload) {
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `a.${encoded}.b`;
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', makeToken({ userId: 1, role: 'ADMIN' }));

    mockGet.mockImplementation((url) => {
      if (url === '/users') {
        return Promise.resolve({
          data: [
            {
              id: 2,
              email: 'client@example.com',
              role: 'CLIENT',
              isActive: true,
              personId: 10,
              person: { id: 10, name: 'Carlos Gomez', phone: '311111', cedula: '9001' },
              liquidadorAlias: null,
            },
          ],
        });
      }
      if (url === '/link-requests') {
        return Promise.resolve({
          data: [
            {
              id: 55,
              status: 'PENDING',
              user: { email: 'pending@example.com' },
              person: { name: 'Rosa Martinez' },
              notes: 'Esperando revision',
            },
          ],
        });
      }
      if (url === '/people/search') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    mockPatch.mockResolvedValue({ data: {} });
    mockPost.mockResolvedValue({ data: {} });
  });

  it('renders queue-first admin supervision with linked person data', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Cuentas y vinculaciones')).toBeInTheDocument());
    expect(screen.getByText('Solicitudes de vinculacion pendientes')).toBeInTheDocument();
    expect(screen.getByText(/pending@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Rosa Martinez/i)).toBeInTheDocument();
    expect(screen.getByText('Gestion de cuentas')).toBeInTheDocument();
    expect(screen.getAllByText('client@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.getByText('311111')).toBeInTheDocument();
  });
});
