const { z } = require('zod');

const updateSettingSchema = z.object({
  defaultPricePerHead: z.number().int().positive().max(1000000),
});

const updateOwnProfileSchema = z.object({
  phone: z.string().trim().max(25).optional(),
  cedula: z.string().trim().max(25).optional(),
}).refine((v) => v.phone !== undefined || v.cedula !== undefined, {
  message: 'At least one field is required',
});

const updateOwnPasswordSchema = z.object({
  currentPassword: z.string().min(8).max(120),
  newPassword: z.string().min(8).max(120),
});

module.exports = {
  updateSettingSchema,
  updateOwnProfileSchema,
  updateOwnPasswordSchema,
};
