import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    quote: { findUnique: vi.fn(), update: vi.fn() },
    order: { create: vi.fn() },
    quoteItem: { update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { POST } from "@/app/api/admin/quotes/route";

describe("POST /api/admin/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-admin", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "u@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER", email: "u@test.com" });
    const req = new Request("http://localhost/api/admin/quotes", { method: "POST", body: "{}" });
    const res = await POST(req as Request);
    expect(res.status).toBe(403);
  });

  it("prevents invalid CONVERT transition", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "admin@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "a1", role: "ADMIN", email: "admin@test.com" });
    mocks.prisma.quote.findUnique.mockResolvedValue({ id: "q1", status: "SUBMITTED", userId: "u1", total: 100, items: [] });

    const req = new Request("http://localhost/api/admin/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteId: "q1", action: "CONVERT" }),
    });
    const res = await POST(req as Request);
    expect(res.status).toBe(409);
  });

  it("approves reviewing quote", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "admin@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "a1", role: "ADMIN", email: "admin@test.com" });
    mocks.prisma.quote.findUnique.mockResolvedValue({ id: "q2", status: "REVIEWING", userId: "u1", total: 100, items: [] });
    mocks.prisma.quote.update.mockResolvedValue({ id: "q2", status: "APPROVED" });

    const req = new Request("http://localhost/api/admin/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteId: "q2", action: "APPROVE" }),
    });
    const res = await POST(req as Request);
    expect(res.status).toBe(200);
    expect(mocks.prisma.quote.update).toHaveBeenCalled();
    expect(mocks.prisma.adminAuditLog.create).toHaveBeenCalled();
  });

  it("reprices quote items and updates total", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "admin@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "a1", role: "ADMIN", email: "admin@test.com" });
    mocks.prisma.quote.findUnique.mockResolvedValue({
      id: "q3",
      status: "REVIEWING",
      userId: "u1",
      total: 200,
      notes: null,
      items: [
        { id: "qi1", quantity: 2, unitPrice: 50, totalPrice: 100 },
        { id: "qi2", quantity: 1, unitPrice: 100, totalPrice: 100 },
      ],
    });
    mocks.prisma.quote.update.mockResolvedValue({ id: "q3", total: 240, items: [] });

    const req = new Request("http://localhost/api/admin/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quoteId: "q3",
        action: "REPRICE",
        itemPrices: [
          { itemId: "qi1", unitPrice: 70 },
          { itemId: "qi2", unitPrice: 100 },
        ],
      }),
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(200);
    expect(mocks.prisma.quoteItem.update).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.quote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ total: 240 }),
      })
    );
  });
});
