const { z } = require('zod');

const createLinkRequestSchema = z.object({
  personId: z.number().int().positive(),
  notes: z.string().trim().max(250).optional(),
});

const reviewLinkRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().trim().max(250).optional(),
});

module.exports = {
  createLinkRequestSchema,
  reviewLinkRequestSchema,
};
