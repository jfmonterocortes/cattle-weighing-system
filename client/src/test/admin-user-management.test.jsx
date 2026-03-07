import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminUserManagement from '../components/AdminUserManagement';

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('../api', () => ({
  api: {
    get: (...args) => mockGet(...args),
    patch: (...args) => mockPatch(...args),
  },
}));

describe('AdminUserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGet.mockImplementation((url) => {
      if (url === '/users') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              email: 'client@example.com',
              role: 'CLIENT',
              isActive: true,
              personId: 10,
              person: {
                id: 10,
                name: 'Carlos Gomez',
                phone: '311111',
                cedula: '9001',
              },
            },
          ],
        });
      }

      return Promise.resolve({ data: [] });
    });

    mockPatch.mockResolvedValue({ data: {} });
  });

  it('renders users and saves user/person edits', async () => {
    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.getByText('client@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const emailInput = screen.getByDisplayValue('client@example.com');
    fireEvent.change(emailInput, { target: { value: 'client.updated@example.com' } });

    const personNameInput = screen.getByDisplayValue('Carlos Gomez');
    fireEvent.change(personNameInput, { target: { value: 'Carlos G.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/users/1', expect.objectContaining({ email: 'client.updated@example.com' }));
      expect(mockPatch).toHaveBeenCalledWith('/people/10', expect.objectContaining({ name: 'Carlos G.' }));
    });
  });
});
