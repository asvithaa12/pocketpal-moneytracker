import { z } from 'zod';

export const createQRTagSchema = z.object({
  body: z.object({
    hash: z.string().min(1, 'Hash is required'),
    label: z.string().min(1, 'Label is required'),
    category_id: z.string().min(1, 'Category ID is required'),
  }),
});

export const updateQRTagSchema = z.object({
  params: z.object({
    hash: z.string().min(1, 'Hash parameter is required'),
  }),
  body: z.object({
    label: z.string().min(1).optional(),
    category_id: z.string().min(1).optional(),
  }),
});
