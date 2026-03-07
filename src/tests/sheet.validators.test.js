describe('sheet validators', () => {
  it('validates sheet creation payload', async () => {
    const { createSheetSchema } = await import('../validators/sheet.validators.js');

    const parsed = createSheetSchema.safeParse({
      sellerId: 1,
      buyerId: 2,
      pricePerHead: 5000,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid row weight', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      type: 'VACA',
      sex: 'HEMBRA',
      weight: -1,
      cattleNumber: '12',
    });

    expect(parsed.success).toBe(false);
  });
});
