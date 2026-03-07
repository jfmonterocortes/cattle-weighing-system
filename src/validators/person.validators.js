const { z } = require('zod');

const personCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(25).optional(),
  cedula: z.string().trim().max(25).optional(),
});

const personUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(25).optional(),
    cedula: z.string().trim().max(25).optional(),
  })
  .refine((value) => value.name !== undefined || value.phone !== undefined || value.cedula !== undefined, {
    message: 'At least one field is required',
  });

const personSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});

module.exports = {
  personCreateSchema,
  personUpdateSchema,
  personSearchQuerySchema,
};
