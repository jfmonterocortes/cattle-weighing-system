import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PersonAutocomplete from '../components/PersonAutocomplete';

const mockGet = vi.fn();

vi.mock('../api', () => ({
  api: {
    get: (...args) => mockGet(...args),
  },
}));

describe('PersonAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens on click, shows results, and selects person correctly', async () => {
    const person = { id: 42, name: 'Maria Perez', phone: '300123', cedula: '1001' };
    mockGet.mockResolvedValue({ data: { items: [person] } });

    const onSelect = vi.fn();

    render(<PersonAutocomplete label="Persona" value={null} onSelect={onSelect} />);

    const input = screen.getByPlaceholderText('Buscar persona por nombre o teléfono');
    fireEvent.click(input);

    await waitFor(() => expect(screen.getByText('Maria Perez')).toBeInTheDocument());

    fireEvent.mouseDown(screen.getByText('Maria Perez'));

    expect(onSelect).toHaveBeenCalledWith(person);
    expect(input).toHaveValue('Maria Perez');
  });
});
