const { z } = require('zod');

const listUsersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(['ADMIN', 'LIQUIDADOR', 'CLIENT']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const adminLinkUserToPersonSchema = z.object({
  personId: z.number().int().positive().nullable(),
  notes: z.string().trim().max(250).optional(),
});

const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    role: z.enum(['ADMIN', 'LIQUIDADOR', 'CLIENT']).optional(),
    isActive: z.boolean().optional(),
    liquidadorAlias: z.string().trim().max(20).nullable().optional(),
  })
  .refine(
    (value) =>
      value.email !== undefined ||
      value.role !== undefined ||
      value.isActive !== undefined ||
      value.liquidadorAlias !== undefined,
    { message: 'At least one field is required' }
  );

module.exports = {
  listUsersQuerySchema,
  adminLinkUserToPersonSchema,
  updateUserSchema,
};
