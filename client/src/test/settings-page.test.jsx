import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

  it('keeps authenticated settings working and does not render token reset UI', async () => {
    render(
      <MemoryRouter initialEntries={['/settings?token=legacy-token']}>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Administra tu cuenta sin perder el contexto operativo/i)).toBeInTheDocument());
    expect(screen.getByText('Cambiar contraseña')).toBeInTheDocument();
    expect(screen.getByText('Vinculación de cuenta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a mis planillas/i })).toBeInTheDocument();
    expect(screen.queryByText('Restablecer contraseña')).not.toBeInTheDocument();
    expect(screen.queryByText(/Token detectado/i)).not.toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/settings');
    expect(mockGet).toHaveBeenCalledWith('/link-requests/me');
  });
});
