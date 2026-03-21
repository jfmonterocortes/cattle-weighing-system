import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    mockGet.mockResolvedValue({ data: [person] });

    const onSelect = vi.fn();

    render(<PersonAutocomplete label="Persona" value={null} onSelect={onSelect} />);

    const input = screen.getByPlaceholderText('Buscar persona por nombre o teléfono');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Maria' } });

    await waitFor(() => expect(screen.getByText('Maria Perez')).toBeInTheDocument());

    expect(mockGet).toHaveBeenCalledWith('/people/search', {
      params: { q: 'Maria', limit: 25 },
    });

    fireEvent.mouseDown(screen.getByText('Maria Perez'));

    expect(onSelect).toHaveBeenCalledWith(person);
    expect(input).toHaveValue('Maria Perez');
  });

  it('waits for the client minimum query length and renders masked hints', async () => {
    const maskedPerson = { id: 7, name: 'Rosa Martinez', phone: '***2255', cedula: '***9003' };
    mockGet.mockResolvedValue({ data: [maskedPerson] });

    render(<PersonAutocomplete label="Persona" value={null} onSelect={vi.fn()} minQueryLength={3} />);

    const input = screen.getByPlaceholderText('Buscar persona por nombre o teléfono');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Ro' } });

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe al menos 3 caracteres para buscar.')).toBeInTheDocument();
    expect(screen.queryByText('Sin resultados.')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Rosa' } });

    await waitFor(() => expect(screen.getByText('Rosa Martinez')).toBeInTheDocument());
    expect(mockGet).toHaveBeenCalledWith('/people/search', {
      params: { q: 'Rosa', limit: 25 },
    });
    expect(screen.getByText('***2255 - CI ***9003')).toBeInTheDocument();
  });
});
