import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  $transaction: vi.fn(),
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("finalizePaystackOrderPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns alreadyPaid=true and skips stock/order/cart mutations when order is already paid", async () => {
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: "order_1",
          userId: "user_1",
          status: "PAID",
          total: 5000,
          user: { email: "user@test.com", name: "User" },
          items: [
            {
              productId: "product_1",
              variantId: null,
              quantity: 2,
              unitPrice: 2500,
              product: { title: "Product A" },
            },
          ],
        }),
        update: vi.fn(),
      },
      payment: { upsert: vi.fn() },
      productVariant: { updateMany: vi.fn() },
      product: { updateMany: vi.fn() },
      cartItem: { deleteMany: vi.fn() },
      cart: { deleteMany: vi.fn() },
    };

    prismaMock.$transaction.mockImplementation(async (cb: (trx: typeof tx) => Promise<unknown>) => cb(tx));

    const { finalizePaystackOrderPayment } = await import("@/lib/payments/finalizeOrderPayment");
    const result = await finalizePaystackOrderPayment({
      orderId: "order_1",
      reference: "ref_1",
      amount: 5000,
      currency: "NGN",
      providerPayload: { status: "success" },
    });

    expect(result.alreadyPaid).toBe(true);
    expect(tx.payment.upsert).toHaveBeenCalledTimes(1);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
    expect(tx.cart.deleteMany).not.toHaveBeenCalled();
  });

  it("finalizes a pending payment and updates stock/order/cart", async () => {
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: "order_2",
          userId: "user_2",
          status: "PENDING",
          total: 8400,
          user: { email: "buyer@test.com", name: null },
          items: [
            {
              productId: "product_1",
              variantId: null,
              quantity: 2,
              unitPrice: 2000,
              product: { title: "Product A" },
            },
            {
              productId: "product_2",
              variantId: "variant_1",
              quantity: 1,
              unitPrice: 4400,
              product: { title: "Product B" },
            },
          ],
        }),
        update: vi.fn(),
      },
      payment: { upsert: vi.fn() },
      productVariant: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      product: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      cartItem: { deleteMany: vi.fn() },
      cart: { deleteMany: vi.fn() },
    };

    prismaMock.$transaction.mockImplementation(async (cb: (trx: typeof tx) => Promise<unknown>) => cb(tx));

    const { finalizePaystackOrderPayment } = await import("@/lib/payments/finalizeOrderPayment");
    const result = await finalizePaystackOrderPayment({
      orderId: "order_2",
      reference: "ref_2",
      amount: 8400,
      currency: "NGN",
      providerPayload: { status: "success" },
    });

    expect(result.alreadyPaid).toBe(false);
    expect(tx.payment.upsert).toHaveBeenCalledTimes(1);
    expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order_2" },
      data: {
        status: "PAID",
        fulfillmentStatus: "PROCESSING",
      },
    });
    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cart: { userId: "user_2" } },
    });
    expect(tx.cart.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_2" },
    });
  });
});
