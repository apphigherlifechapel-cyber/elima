import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { GET, POST } from "@/app/api/orders/route";

describe("GET /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/orders", { method: "GET" });
    const res = await GET(req as Request);
    expect(res.status).toBe(401);
  });

  it("returns customer-scoped orders for non-admin user", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "u@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user_1", email: "u@test.com", role: "CUSTOMER" });
    mocks.prisma.order.findMany.mockResolvedValue([{ id: "order_1" }]);

    const req = new NextRequest("http://localhost/api/orders?limit=10", { method: "GET" });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.orders).toHaveLength(1);
    expect(mocks.prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        take: 10,
      })
    );
  });

  it("returns all orders for admin", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "admin@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "admin_1", email: "admin@test.com", role: "ADMIN" });
    mocks.prisma.order.findMany.mockResolvedValue([{ id: "order_1" }, { id: "order_2" }]);

    const req = new NextRequest("http://localhost/api/orders?status=PENDING", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mocks.prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
      })
    );
  });
});

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels pending order for owner", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "u@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user_1", email: "u@test.com", role: "CUSTOMER" });
    mocks.prisma.order.findUnique.mockResolvedValue({ id: "order_1", userId: "user_1", status: "PENDING" });
    mocks.prisma.order.update.mockResolvedValue({ id: "order_1", status: "CANCELLED" });

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: "order_1", action: "cancel" }),
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(200);
    expect(mocks.prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: {
        status: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
      },
    });
  });

  it("returns 403 when customer cancels another user's order", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "u@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user_1", email: "u@test.com", role: "CUSTOMER" });
    mocks.prisma.order.findUnique.mockResolvedValue({ id: "order_2", userId: "user_2", status: "PENDING" });

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: "order_2", action: "cancel" }),
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(403);
  });
});
