import { z } from 'zod';

export const budgetSchema = z.object({
  body: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    total_budget: z.number().nonnegative('Total budget must be non-negative'),
    category_limits: z.record(z.string(), z.number().nonnegative('Category limits must be non-negative')).default({}),
  }),
});
