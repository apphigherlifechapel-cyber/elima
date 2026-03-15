import { CartItem, Product, ProductVariant } from "@prisma/client";

export type ShippingMethod = "standard" | "express";

export function calculateSubtotal(items: Array<Pick<CartItem, "quantity" | "unitPrice">>) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function calculateShippingCost(method: ShippingMethod) {
  return method === "express" ? 1500 : 800;
}

export function calculateTotal(items: Array<Pick<CartItem, "quantity" | "unitPrice">>, method: ShippingMethod) {
  const subtotal = calculateSubtotal(items);
  return subtotal + calculateShippingCost(method);
}

export function canFulfillInventory(
  items: Array<{
    quantity: number;
    product: Product;
    variant: ProductVariant | null;
  }>
) {
  return items.every((item) => {
    const baseStock = item.variant ? item.variant.stock : item.product.stockTotal;
    return baseStock >= item.quantity;
  });
}
