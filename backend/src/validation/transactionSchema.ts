import { z } from 'zod';

const transactionItemSchema = z.object({
  type: z.enum(['expense', 'friend_gave', 'friend_received', 'settlement']),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().default('cash'),
  description: z.string().default(''),
  date: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  friend_name: z.string().nullable().optional(),
  source: z.string().default('manual'),
  qr_id: z.string().uuid().nullable().optional(),
});

export const createTransactionSchema = z.object({
  body: z.union([
    transactionItemSchema,
    z.array(transactionItemSchema)
  ]),
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid transaction ID'),
  }),
  body: z.object({
    type: z.enum(['expense', 'friend_gave', 'friend_received', 'settlement']).optional(),
    amount: z.number().positive('Amount must be positive').optional(),
    category: z.string().min(1).optional(),
    subcategory: z.string().optional(),
    description: z.string().optional(),
    date: z.string().optional(),
    friend_name: z.string().nullable().optional(),
    source: z.string().optional(),
    qr_id: z.string().uuid().nullable().optional(),
  }),
});
