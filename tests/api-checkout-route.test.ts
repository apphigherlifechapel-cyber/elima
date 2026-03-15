import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  initializePaystackPayment: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    cart: { findFirst: vi.fn() },
    adminAuditLog: { create: vi.fn() },
    order: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  trackEvent: vi.fn(),
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/payments/paystack", () => ({
  initializePaystackPayment: mocks.initializePaystackPayment,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/analytics.events", () => ({
  trackEvent: mocks.trackEvent,
}));

import { POST } from "@/app/api/checkout/route";

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for guest checkout when required guest fields are missing", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          line1: "Line 1",
          city: "Accra",
          state: "GA",
          country: "Ghana",
          postalCode: "00233",
        },
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(400);
  });

  it("returns 400 when cart is empty", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "buyer@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user_1", email: "buyer@test.com", accountType: "RETAIL" });
    mocks.prisma.cart.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: {
          line1: "Line 1",
          city: "Accra",
          state: "GA",
          country: "Ghana",
          postalCode: "00233",
        },
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(400);
  });

  it("rolls back created order artifacts when Paystack init fails", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "buyer@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user_2", email: "buyer@test.com", accountType: "RETAIL" });
    mocks.prisma.cart.findFirst.mockResolvedValue({
      id: "cart_1",
      items: [
        {
          quantity: 2,
          unitPrice: 2500,
          productId: "product_1",
          variantId: null,
          product: { stockTotal: 10 },
          variant: null,
        },
      ],
    });
    mocks.prisma.order.create.mockResolvedValue({
      id: "order_1",
      shippingAddressId: "addr_ship",
      billingAddressId: "addr_bill",
    });
    mocks.prisma.adminAuditLog.create.mockResolvedValue({});
    mocks.trackEvent.mockResolvedValue({});
    mocks.initializePaystackPayment.mockRejectedValue(new Error("network"));

    const tx = {
      orderItem: { deleteMany: vi.fn() },
      order: { delete: vi.fn() },
      address: { deleteMany: vi.fn() },
    };
    mocks.prisma.$transaction.mockImplementation(async (cb: (trx: typeof tx) => Promise<void>) => cb(tx));

    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        shippingMethod: "standard",
        shippingAddress: {
          line1: "Line 1",
          city: "Accra",
          state: "GA",
          country: "Ghana",
          postalCode: "00233",
        },
        billingAddress: {
          line1: "Line 2",
          city: "Accra",
          state: "GA",
          country: "Ghana",
          postalCode: "00233",
        },
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req as Request);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Payment initialization failed");
    expect(tx.orderItem.deleteMany).toHaveBeenCalledWith({ where: { orderId: "order_1" } });
    expect(tx.order.delete).toHaveBeenCalledWith({ where: { id: "order_1" } });
    expect(tx.address.deleteMany).toHaveBeenCalledTimes(1);
  });
});
