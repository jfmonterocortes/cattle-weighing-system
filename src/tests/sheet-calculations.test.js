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
    const specs = stats.totalsByTypeSex.map((g) => g.specification);
    expect(specs).toContain('TERNERO');
    expect(specs).toContain('NOVILLO');
    expect(specs).toContain('VACA');
    // Results should be sorted in CATEGORY_DISPLAY_ORDER
    expect(specs.indexOf('TERNERO')).toBeLessThan(specs.indexOf('NOVILLO'));
    expect(specs.indexOf('NOVILLO')).toBeLessThan(specs.indexOf('VACA'));
  });

  it('groups OTHER rows by customSpecification and preserves sex totals', async () => {
    const { calculateSheetStats } = await import('../utils/sheet-calculations.js');

    const rows = [
      { type: 'NOVILLO', sex: 'MACHO',  weight: 500,  customSpecification: null },
      { type: 'OTHER',   sex: 'MACHO',  weight: 300,  customSpecification: 'BUFALO ESPECIAL' },
      { type: 'OTHER',   sex: 'HEMBRA', weight: 200,  customSpecification: 'BUFALO ESPECIAL' },
      { type: 'OTHER',   sex: 'MACHO',  weight: 400,  customSpecification: 'CRUCE ESPECIAL' },
    ];

    const stats = calculateSheetStats(rows, 1000);

    expect(stats.headCount).toBe(4);
    expect(stats.totalMaleWeight).toBe(1200);   // 500 + 300 + 400
    expect(stats.totalFemaleWeight).toBe(200);

    const specs = stats.totalsByTypeSex.map((g) => g.specification);
    // Built-in category comes before OTHER groups
    expect(specs).toContain('NOVILLO');
    expect(specs).toContain('BUFALO ESPECIAL');
    expect(specs).toContain('CRUCE ESPECIAL');

    const bufaloGroup = stats.totalsByTypeSex.find((g) => g.specification === 'BUFALO ESPECIAL');
    expect(bufaloGroup.count).toBe(2);
    expect(bufaloGroup.totalWeight).toBe(500);
  });
});
