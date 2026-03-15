import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().min(1),
  variantId: z.string().cuid().optional(),
});

export const quoteRequestSchema = z.object({
  userId: z.string().cuid(),
  items: z.array(
    z.object({
      productId: z.string().cuid(),
      quantity: z.number().min(1),
    })
  ),
});
