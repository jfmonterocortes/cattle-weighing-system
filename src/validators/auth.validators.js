const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(120),
});

const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(120),
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
  newPassword: z.string().min(8).max(120),
});

module.exports = {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
};
