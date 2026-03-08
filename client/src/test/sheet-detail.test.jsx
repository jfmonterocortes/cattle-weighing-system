import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SheetDetailPage from '../pages/SheetDetailPage';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('../api', () => ({
  api: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    patch: (...args) => mockPatch(...args),
    delete: (...args) => mockDelete(...args),
  },
}));

function makeToken(payload) {
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `a.${encoded}.b`;
}

describe('SheetDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', makeToken({ userId: 10, role: 'CLIENT', personId: 3 }));

    mockGet.mockImplementation((url) => {
      if (url === '/sheets/1/rows/next-number') return Promise.resolve({ data: { cattleNumber: '5' } });
      if (url === '/sheets/1') {
        return Promise.resolve({
          data: {
            id: 1,
            visibleNumber: '2026-001',
            date: '2026-03-01T12:00:00.000Z',
            createdById: 2,
            editableUntilByLiquidador: '2026-03-01T12:10:00.000Z',
            seller: { name: 'Carlos', phone: '300' },
            buyer: { name: 'Ana', phone: '301' },
            rows: [{ id: 11, rowOrder: 1, type: 'TERNERO', sex: 'MACHO', weight: 300, cattleNumber: '1', letters: null }],
            paymentLogs: [],
            liquidadorAliasSnapshot: 'ANV',
            pricePerHead: 5000,
            headCount: 1,
            totalWeight: 300,
            averageWeight: 300,
            totalMaleWeight: 300,
            averageMaleWeight: 300,
            totalFemaleWeight: 0,
            averageFemaleWeight: 0,
            totalValue: 5000,
            isPaid: false,
            computed: {
              totalsByTypeSex: [
                { type: 'TERNERO', sex: 'MACHO', count: 1, totalWeight: 300, averageWeight: 300, specification: 'TERNERO MACHO' },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    mockPost.mockResolvedValue({ data: {} });
    mockPatch.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it('renders totals, grouped metrics and UTF-8 labels', async () => {
    render(
      <MemoryRouter initialEntries={['/planillas/1']}>
        <Routes>
          <Route path="/planillas/:id" element={<SheetDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Planilla 2026-001')).toBeInTheDocument());

    expect(screen.getByText('Total machos')).toBeInTheDocument();
    expect(screen.getByText('Promedio machos')).toBeInTheDocument();
    expect(screen.getByText('Total hembras')).toBeInTheDocument();
    expect(screen.getByText('Promedio hembras')).toBeInTheDocument();
    expect(screen.getAllByText('TERNERO MACHO').length).toBeGreaterThan(0);
    expect(screen.getByText('Nº')).toBeInTheDocument();
    expect(screen.getAllByText('Especificación').length).toBeGreaterThan(0);
    expect(screen.getByText('Nº Res')).toBeInTheDocument();
  });
});
