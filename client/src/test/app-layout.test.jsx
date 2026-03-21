import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/AppLayout';

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

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', makeToken({ userId: 1, role: 'ADMIN' }));
    mockGet.mockResolvedValue({
      data: {
        profile: {
          email: 'admin@bascula.com',
          role: 'ADMIN',
          isActive: true,
          liquidadorAlias: null,
          person: null,
        },
      },
    });
  });

  it('shows workflow-based admin navigation and header context', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Centro</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/settings'));

    expect(screen.getAllByText('Centro operativo').length).toBeGreaterThan(0);
    expect(screen.getByText('Planillas')).toBeInTheDocument();
    expect(screen.getByText('Registrar planilla')).toBeInTheDocument();
    expect(screen.getByText('Cuentas y vinculaciones')).toBeInTheDocument();
    expect(screen.getByText('Mi cuenta')).toBeInTheDocument();
    expect(screen.getByTitle('admin@bascula.com')).toBeInTheDocument();
    expect(screen.getByText('Supervisión operativa y control')).toBeInTheDocument();
  });
});
