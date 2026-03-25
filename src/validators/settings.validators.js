const { z } = require('zod');

const strongPassword = z
  .string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .max(120)
  .regex(/[a-z]/, 'Debe incluir al menos una letra minuscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayuscula')
  .regex(/[0-9]/, 'Debe incluir al menos un numero');

const updateSettingSchema = z.object({
  defaultPricePerHead: z.number().int().positive().max(1000000),
});

const updateOwnProfileSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(25).optional(),
    cedula: z.string().trim().max(25).optional(),
    liquidadorAlias: z.string().trim().max(20).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.phone !== undefined ||
      value.cedula !== undefined ||
      value.liquidadorAlias !== undefined,
    {
      message: 'At least one field is required',
    }
  );

const updateOwnPasswordSchema = z.object({
  currentPassword: z.string().min(8).max(120),
  newPassword: strongPassword,
});

module.exports = {
  updateSettingSchema,
  updateOwnProfileSchema,
  updateOwnPasswordSchema,
};
