import { calculateSubtotal, calculateShippingCost, calculateTotal, canFulfillInventory } from "@/lib/orders";
import { Product, ProductVariant } from "@prisma/client";

describe("order calculations", () => {
  it("calculates subtotal", () => {
    const items = [
      { quantity: 2, unitPrice: 500 },
      { quantity: 1, unitPrice: 300 },
    ];
    expect(calculateSubtotal(items)).toBe(1300);
  });

  it("calculates shipping cost", () => {
    expect(calculateShippingCost("standard")).toBe(800);
    expect(calculateShippingCost("express")).toBe(1500);
  });

  it("calculates total correctly", () => {
    const items = [
      { quantity: 2, unitPrice: 500 },
      { quantity: 1, unitPrice: 300 },
    ];
    expect(calculateTotal(items, "standard")).toBe(2100);
    expect(calculateTotal(items, "express")).toBe(2800);
  });

  it("validates inventory availability", () => {
    const items = [
      { quantity: 2, product: { stockTotal: 5 } as Product, variant: null as ProductVariant | null },
      { quantity: 1, product: { stockTotal: 10 } as Product, variant: { stock: 2 } as ProductVariant },
    ];

    expect(canFulfillInventory(items)).toBe(true);

    const fail = [
      { quantity: 3, product: { stockTotal: 2 } as Product, variant: null as ProductVariant | null },
    ];
    expect(canFulfillInventory(fail)).toBe(false);
  });
});
