import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

const post = vi.fn();

vi.mock('../api', () => ({
  api: {
    post: (...args) => post(...args),
  },
}));

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits credentials to auth endpoint contract', async () => {
    post.mockResolvedValue({ data: { token: 'fake-token', user: { role: 'ADMIN' } } });
    const onLogin = vi.fn();

    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('admin@bascula.com'), { target: { value: 'admin@bascula.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'Admin123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'admin@bascula.com', password: 'Admin123!' });
  });

  it('shows a success banner after token reset redirect', () => {
    render(
      <MemoryRouter initialEntries={['/login?reset=success']}>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByText('Contrasena restablecida correctamente. Ya puedes iniciar sesion.')).toBeInTheDocument();
  });
});
