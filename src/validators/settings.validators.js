const { z } = require('zod');

const strongPassword = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(120)
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

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
  newPassword: strongPassword,
});

module.exports = {
  updateSettingSchema,
  updateOwnProfileSchema,
  updateOwnPasswordSchema,
};
