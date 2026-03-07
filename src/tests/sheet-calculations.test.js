describe('calculateSheetStats', () => {
  it('calculates totals, averages, and value', async () => {
    const { calculateSheetStats } = await import('../utils/sheet-calculations.js');

    const rows = [
      { type: 'TERNERO', sex: 'MACHO', weight: 300 },
      { type: 'NOVILLO', sex: 'MACHO', weight: 500 },
      { type: 'VACA', sex: 'HEMBRA', weight: 400 },
    ];

    const stats = calculateSheetStats(rows, 5000);

    expect(stats.headCount).toBe(3);
    expect(stats.totalWeight).toBe(1200);
    expect(stats.averageWeight).toBe(400);
    expect(stats.totalMaleWeight).toBe(800);
    expect(stats.averageMaleWeight).toBe(400);
    expect(stats.totalFemaleWeight).toBe(400);
    expect(stats.averageFemaleWeight).toBe(400);
    expect(stats.totalValue).toBe(15000);
    expect(stats.totalsByTypeSex).toHaveLength(3);
  });
});
