import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  finalizePaystackOrderPayment: vi.fn(),
  sendOrderReceipt: vi.fn(),
  trackEvent: vi.fn(),
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

import { POST } from "@/app/api/webhooks/route";

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha512", secret).update(payload).digest("hex");
}

describe("POST /api/webhooks", () => {
  const originalSecret = process.env.PAYSTACK_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYSTACK_WEBHOOK_SECRET = "test_webhook_secret";
  });

  afterAll(() => {
    process.env.PAYSTACK_WEBHOOK_SECRET = originalSecret;
  });

  it("returns 400 when signature header is missing", async () => {
    const payload = JSON.stringify({ event: "charge.success", data: {} });
    const req = new Request("http://localhost/api/webhooks", {
      method: "POST",
      body: payload,
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(400);
  });

  it("returns 403 for invalid signature", async () => {
    const payload = JSON.stringify({ event: "charge.success", data: {} });
    const req = new Request("http://localhost/api/webhooks", {
      method: "POST",
      body: payload,
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": "invalid",
      },
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(403);
    expect(mocks.finalizePaystackOrderPayment).not.toHaveBeenCalled();
  });

  it("finalizes and sends receipt on charge.success with valid signature", async () => {
    const payloadObj = {
      event: "charge.success",
      data: {
        reference: "ref_1",
        amount: 100000,
        currency: "NGN",
        metadata: { orderId: "order_1" },
      },
    };
    const payload = JSON.stringify(payloadObj);
    const req = new Request("http://localhost/api/webhooks", {
      method: "POST",
      body: payload,
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": sign(payload, "test_webhook_secret"),
      },
    });

    mocks.finalizePaystackOrderPayment.mockResolvedValue({
      alreadyPaid: false,
      order: {
        id: "order_1",
        total: 1000,
        user: { email: "user@test.com", name: "User" },
        items: [{ product: { title: "Item" }, quantity: 1, unitPrice: 1000 }],
      },
    });

    const res = await POST(req as Request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mocks.finalizePaystackOrderPayment).toHaveBeenCalledTimes(1);
    expect(mocks.sendOrderReceipt).toHaveBeenCalledTimes(1);
  });

  it("skips receipt when already paid", async () => {
    const payloadObj = {
      event: "charge.success",
      data: {
        reference: "ref_2",
        amount: 200000,
        currency: "NGN",
        metadata: { orderId: "order_2" },
      },
    };
    const payload = JSON.stringify(payloadObj);
    const req = new Request("http://localhost/api/webhooks", {
      method: "POST",
      body: payload,
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": sign(payload, "test_webhook_secret"),
      },
    });

    mocks.finalizePaystackOrderPayment.mockResolvedValue({
      alreadyPaid: true,
      order: {
        id: "order_2",
        total: 2000,
        user: { email: "user2@test.com", name: null },
        items: [],
      },
    });

    const res = await POST(req as Request);
    expect(res.status).toBe(200);
    expect(mocks.sendOrderReceipt).not.toHaveBeenCalled();
  });
});
