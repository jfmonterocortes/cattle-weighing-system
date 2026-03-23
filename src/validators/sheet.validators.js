const { z } = require('zod');
const { CATEGORY_DISPLAY_ORDER } = require('../constants/domain');

const cattleType = z.enum(['VACA', 'TORO', 'BUFALO', 'NOVILLO', 'TERNERO']);
const cattleSex = z.enum(['MACHO', 'HEMBRA']);
const cattleCategory = z.enum(CATEGORY_DISPLAY_ORDER);

const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime()).optional();

const createSheetSchema = z.object({
  sellerId: z.number().int().positive(),
  buyerId: z.number().int().positive(),
  liquidadorAlias: z.string().trim().min(1).max(20).optional(),
  pricePerHead: z.number().int().positive().max(1000000).optional(),
  date: isoDateTime,
});

const updateSheetSchema = z.object({
  sellerId: z.number().int().positive().optional(),
  buyerId: z.number().int().positive().optional(),
  liquidadorAliasSnapshot: z.string().trim().min(1).max(20).optional(),
  pricePerHead: z.number().int().positive().max(1000000).optional(),
  date: isoDateTime,
});

const listSheetsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  seller: z.string().trim().max(120).optional(),
  buyer: z.string().trim().max(120).optional(),
  sellerPhone: z.string().trim().max(25).optional(),
  buyerPhone: z.string().trim().max(25).optional(),
  from: isoDateOnly.optional(),
  to: isoDateOnly.optional(),
  paymentStatus: z.enum(['paid', 'unpaid', 'paid_today', 'paid_yesterday']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const createRowSchema = z.object({
  category: cattleCategory.optional(),
  type: cattleType.optional(),
  sex: cattleSex.optional(),
  weight: z.number().int().positive().max(2000),
  cattleNumber: z.string().trim().min(1).max(40),
  letters: z.string().trim().max(100).optional().nullable(),
  rowOrder: z.number().int().positive().optional(),
}).refine(
  (data) => data.category || data.type,
  { message: 'Either category or type is required' },
);

const updateRowSchema = z.object({
  category: cattleCategory.optional(),
  type: cattleType.optional(),
  sex: cattleSex.optional(),
  weight: z.number().int().positive().max(2000).optional(),
  cattleNumber: z.string().trim().min(1).max(40).optional(),
  letters: z.string().trim().max(100).optional().nullable(),
});

const reorderRowsSchema = z.object({
  orderedRowIds: z.array(z.number().int().positive()).min(1),
});

const paymentStatusSchema = z.object({
  isPaid: z.boolean(),
  notes: z.string().trim().max(250).optional(),
});

module.exports = {
  createSheetSchema,
  updateSheetSchema,
  listSheetsQuerySchema,
  createRowSchema,
  updateRowSchema,
  reorderRowsSchema,
  paymentStatusSchema,
};
