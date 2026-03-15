import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  order: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("expireStaleOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expires pending stale orders and releases reserved stock", async () => {
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: "order_1",
        items: [
          { productId: "p1", variantId: null, quantity: 2 },
          { productId: "p2", variantId: "v1", quantity: 1 },
        ],
      },
    ]);

    const tx = {
      product: { updateMany: vi.fn() },
      productVariant: { updateMany: vi.fn() },
      order: { update: vi.fn() },
    };

    prismaMock.$transaction.mockImplementation(async (cb: (trx: typeof tx) => Promise<void>) => cb(tx));

    const { expireStaleOrders } = await import("@/lib/orders/expireStaleOrders");
    const result = await expireStaleOrders(60);

    expect(result).toEqual({ scanned: 1, expired: 1, releasedItems: 2 });
    expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: {
        status: "CANCELLED",
        fulfillmentStatus: "EXPIRED",
      },
    });
  });

  it("returns zero counts when no stale orders exist", async () => {
    prismaMock.order.findMany.mockResolvedValue([]);
    const { expireStaleOrders } = await import("@/lib/orders/expireStaleOrders");
    const result = await expireStaleOrders(30);
    expect(result).toEqual({ scanned: 0, expired: 0, releasedItems: 0 });
  });
});
