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

  it('accepts a row with category field', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      category: 'VACA',
      weight: 450,
      cattleNumber: '12',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid row weight', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      category: 'VACA',
      weight: -1,
      cattleNumber: '12',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a row with neither category nor type', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      weight: 400,
      cattleNumber: '12',
    });

    expect(parsed.success).toBe(false);
  });

  it('still accepts legacy type+sex fields for backward compatibility', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      type: 'VACA',
      sex: 'HEMBRA',
      weight: 400,
      cattleNumber: '12',
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts OTHER category with customSpecification and sex', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      category: 'OTHER',
      customSpecification: 'BUFALO ESPECIAL',
      sex: 'MACHO',
      weight: 500,
      cattleNumber: '99',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects OTHER category without customSpecification', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      category: 'OTHER',
      sex: 'MACHO',
      weight: 500,
      cattleNumber: '99',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects OTHER category without sex', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      category: 'OTHER',
      customSpecification: 'ESPECIAL',
      weight: 500,
      cattleNumber: '99',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects customSpecification for built-in categories', async () => {
    const { createRowSchema } = await import('../validators/sheet.validators.js');

    const parsed = createRowSchema.safeParse({
      category: 'VACA',
      customSpecification: 'should not be here',
      weight: 400,
      cattleNumber: '12',
    });

    expect(parsed.success).toBe(false);
  });
});
