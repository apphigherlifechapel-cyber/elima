import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  verifyPaystackPayment: vi.fn(),
  finalizePaystackOrderPayment: vi.fn(),
  sendOrderReceipt: vi.fn(),
  trackEvent: vi.fn(),
  checkRateLimitAsync: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn() },
  },
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/payments/paystack", () => ({
  verifyPaystackPayment: mocks.verifyPaystackPayment,
}));

vi.mock("@/lib/payments/finalizeOrderPayment", () => ({
  finalizePaystackOrderPayment: mocks.finalizePaystackOrderPayment,
}));

vi.mock("@/lib/emails/sendReceipt", () => ({
  sendOrderReceipt: mocks.sendOrderReceipt,
}));

vi.mock("@/lib/analytics.events", () => ({
  trackEvent: mocks.trackEvent,
}));

vi.mock("@/lib/utils/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils/rate-limit")>("@/lib/utils/rate-limit");
  return {
    ...actual,
    checkRateLimitAsync: mocks.checkRateLimitAsync,
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { POST } from "@/app/api/payments/route";

describe("POST /api/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimitAsync.mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 });
  });

  it("returns 400 when reference or orderId is missing", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "buyer@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });

    const req = new Request("http://localhost/api/payments", {
      method: "POST",
      body: JSON.stringify({ reference: "ref_only" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Reference and orderId required");
  });

  it("returns FAILED when provider verification is not successful", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "buyer@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mocks.prisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1" });
    mocks.verifyPaystackPayment.mockResolvedValue({ data: { status: "failed" } });

    const req = new Request("http://localhost/api/payments", {
      method: "POST",
      body: JSON.stringify({ reference: "ref_1", orderId: "o1" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("FAILED");
    expect(mocks.finalizePaystackOrderPayment).not.toHaveBeenCalled();
    expect(mocks.sendOrderReceipt).not.toHaveBeenCalled();
  });

  it("does not send receipt when order is already paid", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "buyer@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mocks.prisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1" });
    mocks.verifyPaystackPayment.mockResolvedValue({
      data: { status: "success", amount: 10000, currency: "GHS" },
    });
    mocks.finalizePaystackOrderPayment.mockResolvedValue({
      alreadyPaid: true,
      order: {
        id: "o1",
        total: 100,
        user: { email: "u@test.com", name: "U" },
        items: [],
      },
    });

    const req = new Request("http://localhost/api/payments", {
      method: "POST",
      body: JSON.stringify({ reference: "ref_2", orderId: "o1" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alreadyPaid).toBe(true);
    expect(mocks.finalizePaystackOrderPayment).toHaveBeenCalledTimes(1);
    expect(mocks.sendOrderReceipt).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthorized", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/payments", {
      method: "POST",
      body: JSON.stringify({ reference: "ref_3", orderId: "o2" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });
});
