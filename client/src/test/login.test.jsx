import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from '../pages/Login';

vi.mock('../api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({ data: { token: 'fake-token', user: { role: 'ADMIN' } } }),
  },
}));

describe('Login page', () => {
  it('submits credentials to auth endpoint contract', async () => {
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('admin@bascula.com'), {
      target: { value: 'admin@bascula.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('********'), {
      target: { value: 'Admin123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });
});
