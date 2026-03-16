import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ResetPasswordPage from '../pages/ResetPasswordPage';

const mockPost = vi.fn();

vi.mock('../api', () => ({
  api: {
    post: (...args) => mockPost(...args),
  },
}));

function LoginLocation() {
  const location = useLocation();
  return <div data-testid="login-location">{`${location.pathname}${location.search}`}</div>;
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the token reset flow and redirects to login success', async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<LoginLocation />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Nueva contrasena'), { target: { value: 'Nueva123!!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contrasena' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', { token: 'test-token', newPassword: 'Nueva123!!' }));
    await waitFor(() => expect(screen.getByTestId('login-location')).toHaveTextContent('/login?reset=success'));
  });

  it('shows an invalid-link state without submitting when the token is missing', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText('El enlace de restablecimiento no es valido o ya no esta disponible.')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
