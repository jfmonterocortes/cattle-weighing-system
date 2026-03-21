const { z } = require('zod');

const strongPassword = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(120)
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(120),
});

const publicRegisterSchema = z
  .object({
    email: z.string().email().transform((v) => v.toLowerCase()),
    password: strongPassword,
    role: z.literal('CLIENT').optional(),
  })
  .strict();

const managedRegisterSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: strongPassword,
  role: z.enum(['CLIENT', 'LIQUIDADOR']).optional(),
  liquidadorAlias: z.string().trim().max(20).optional(),
  person: z
    .object({
      name: z.string().trim().min(2).max(120),
      phone: z.string().trim().max(25).optional(),
      cedula: z.string().trim().max(25).optional(),
    })
    .optional(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(2000),
  newPassword: strongPassword,
});

module.exports = {
  loginSchema,
  publicRegisterSchema,
  managedRegisterSchema,
  resetPasswordSchema,
};
