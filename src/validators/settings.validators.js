const { z } = require('zod');

const updateSettingSchema = z.object({
  defaultPricePerHead: z.number().int().positive().max(1000000),
});

module.exports = { updateSettingSchema };
