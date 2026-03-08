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
      if (url === '/link-requests') return Promise.resolve({ data: [] });
      if (url === '/people') return Promise.resolve({ data: { items: [] } });
      return Promise.resolve({ data: {} });
    });

    mockPatch.mockResolvedValue({ data: {} });
    mockPost.mockResolvedValue({ data: {} });
  });

  it('renders admin user management listing with linked person data', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getAllByText('client@example.com').length).toBeGreaterThan(0));
    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.getByText('9001')).toBeInTheDocument();
  });
});
