import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import SettingsPage from '../pages/SettingsPage';

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

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', makeToken({ userId: 5, role: 'CLIENT' }));

    mockGet.mockImplementation((url) => {
      if (url === '/settings') {
        return Promise.resolve({
          data: {
            defaultPricePerHead: 5000,
            profile: {
              email: 'cliente@bascula.com',
              role: 'CLIENT',
              isActive: true,
              personId: 3,
              liquidadorAlias: null,
              person: {
                id: 3,
                name: 'Rosa Martinez',
                phone: '3001112255',
                cedula: '1099003',
              },
            },
          },
        });
      }

      if (url === '/link-requests/me') {
        return Promise.resolve({ data: { linkedPerson: { id: 3, name: 'Rosa Martinez' }, latestRequest: null, used: false } });
      }

      return Promise.resolve({ data: {} });
    });

    mockPatch.mockResolvedValue({ data: {} });
    mockPost.mockResolvedValue({ data: {} });
  });

  it('renders the client account flow without legacy reset UI', async () => {
    render(
      <MemoryRouter initialEntries={['/settings?token=legacy-token']}>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument());
    expect(screen.getByText('Datos de contacto')).toBeInTheDocument();
    expect(screen.getByText('Cambiar contrasena')).toBeInTheDocument();
    expect(screen.getByText('Vincular cuenta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a mis planillas/i })).toBeInTheDocument();
    expect(screen.queryByText('Restablecer contrasena')).not.toBeInTheDocument();
    expect(screen.queryByText(/Token detectado/i)).not.toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/settings');
    expect(mockGet).toHaveBeenCalledWith('/link-requests/me');
  });

  it('shows alias and linked person editing for admin accounts', async () => {
    localStorage.setItem('token', makeToken({ userId: 1, role: 'ADMIN' }));

    mockGet.mockImplementation((url) => {
      if (url === '/settings') {
        return Promise.resolve({
          data: {
            defaultPricePerHead: 5000,
            profile: {
              email: 'admin@bascula.com',
              role: 'ADMIN',
              isActive: true,
              personId: 8,
              liquidadorAlias: 'JPM',
              person: {
                id: 8,
                name: 'Juan Pablo Montero Novoa',
                phone: '3112236187',
                cedula: '7721432',
              },
            },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Alias y persona vinculada')).toBeInTheDocument());
    expect(screen.getByDisplayValue('JPM')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Juan Pablo Montero Novoa')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3112236187')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7721432')).toBeInTheDocument();
    expect(screen.getByText('Precio base por cabeza')).toBeInTheDocument();
  });
});
