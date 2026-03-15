import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    quote: { findMany: vi.fn(), create: vi.fn() },
    product: { findMany: vi.fn() },
  },
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { GET, POST } from "@/app/api/quotes/route";

describe("GET /api/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/quotes", { method: "GET" });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("returns user-scoped quotes for customers", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "u@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "u@test.com", role: "CUSTOMER" });
    mocks.prisma.quote.findMany.mockResolvedValue([{ id: "q1" }]);

    const req = new Request("http://localhost/api/quotes", { method: "GET" });
    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.quotes).toHaveLength(1);
    expect(mocks.prisma.quote.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
  });
});

describe("POST /api/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires items", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "u@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "u@test.com", role: "CUSTOMER" });
    const req = new Request("http://localhost/api/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    const res = await POST(req as Request);
    expect(res.status).toBe(400);
  });

  it("creates submitted quote with calculated totals", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "u@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "u@test.com", role: "CUSTOMER" });
    mocks.prisma.product.findMany.mockResolvedValue([{ id: "p1", wholesalePrice: 50, retailPrice: 70 }]);
    mocks.prisma.quote.create.mockResolvedValue({ id: "q1", status: "SUBMITTED", items: [{ quantity: 2, totalPrice: 100 }] });

    const req = new Request("http://localhost/api/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId: "p1", quantity: 2 }], notes: "Need best price" }),
    });

    const res = await POST(req as Request);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.quote.id).toBe("q1");
    expect(mocks.prisma.quote.create).toHaveBeenCalled();
  });
});
