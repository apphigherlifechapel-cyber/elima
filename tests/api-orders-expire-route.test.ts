import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  expireStaleOrders: vi.fn(),
}));

vi.mock("@/lib/orders/expireStaleOrders", () => ({
  expireStaleOrders: mocks.expireStaleOrders,
}));

import { POST } from "@/app/api/orders/expire/route";

describe("POST /api/orders/expire", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret_123";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 401 for missing/invalid token", async () => {
    const req = new Request("http://localhost/api/orders/expire", { method: "POST", body: "{}" });
    const res = await POST(req as Request);
    expect(res.status).toBe(401);
  });

  it("runs expiration job with default minutes", async () => {
    mocks.expireStaleOrders.mockResolvedValue({ scanned: 2, expired: 2, releasedItems: 4 });
    const req = new Request("http://localhost/api/orders/expire", {
      method: "POST",
      headers: {
        authorization: "Bearer secret_123",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req as Request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.expireStaleOrders).toHaveBeenCalledWith(60);
    expect(body.ok).toBe(true);
    expect(body.expired).toBe(2);
  });

  it("accepts custom olderThanMinutes", async () => {
    mocks.expireStaleOrders.mockResolvedValue({ scanned: 1, expired: 1, releasedItems: 1 });
    const req = new Request("http://localhost/api/orders/expire", {
      method: "POST",
      headers: {
        authorization: "Bearer secret_123",
        "content-type": "application/json",
      },
      body: JSON.stringify({ olderThanMinutes: 15 }),
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(200);
    expect(mocks.expireStaleOrders).toHaveBeenCalledWith(15);
  });
});
