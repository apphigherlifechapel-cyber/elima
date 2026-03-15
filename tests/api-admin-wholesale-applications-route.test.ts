import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    wholesaleApplication: { findUnique: vi.fn(), update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { POST } from "@/app/api/admin/wholesale-applications/route";

describe("POST /api/admin/wholesale-applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated user", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/wholesale-applications", { method: "POST", body: "{}" });
    const res = await POST(req as Request);
    expect(res.status).toBe(401);
  });

  it("returns 404 when application is missing", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "admin@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "a1", role: "ADMIN", email: "admin@test.com" });
    mocks.prisma.wholesaleApplication.findUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/wholesale-applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "u1", status: "APPROVED" }),
    });
    const res = await POST(req as Request);
    expect(res.status).toBe(404);
  });

  it("approves application and upgrades user account type", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "admin@test.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "a1", role: "ADMIN", email: "admin@test.com" });
    mocks.prisma.wholesaleApplication.findUnique.mockResolvedValue({ id: "wa1", userId: "u1", status: "PENDING" });
    mocks.prisma.wholesaleApplication.update.mockResolvedValue({ id: "wa1", userId: "u1", status: "APPROVED" });
    mocks.prisma.user.update.mockResolvedValue({ id: "u1", accountType: "WHOLESALE", wholesaleStatus: "APPROVED" });

    const req = new Request("http://localhost/api/admin/wholesale-applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "u1", status: "APPROVED" }),
    });
    const res = await POST(req as Request);
    expect(res.status).toBe(200);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountType: "WHOLESALE", wholesaleStatus: "APPROVED" }),
      })
    );
    expect(mocks.prisma.adminAuditLog.create).toHaveBeenCalled();
  });
});
