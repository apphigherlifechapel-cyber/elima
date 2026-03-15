import crypto from "crypto";
import { NextRequest } from "next/server";
import { finalizePaystackOrderPayment } from "@/lib/payments/finalizeOrderPayment";
import { sendOrderReceipt } from "@/lib/emails/sendReceipt";
import { trackEvent } from "@/lib/analytics.events";
import { apiJson, createApiContext, logApi, logApiError } from "@/lib/utils/api-observability";

export async function POST(req: NextRequest) {
  const ctx = createApiContext(req, "/api/webhooks");
  const signature = req.headers.get("x-paystack-signature");
  const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    logApi("warn", ctx, "Webhook missing signature or secret");
    return apiJson(ctx, { error: "Invalid webhook configuration" }, { status: 400 });
  }

  if (!/^[a-fA-F0-9]{128}$/.test(signature)) {
    logApi("warn", ctx, "Webhook signature format invalid");
    return apiJson(ctx, { error: "Invalid signature format" }, { status: 403 });
  }

  const payloadRaw = await req.text();
  const hash = crypto.createHmac("sha512", webhookSecret).update(payloadRaw).digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const hashBuffer = Buffer.from(hash, "hex");
  if (signatureBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(signatureBuffer, hashBuffer)) {
    logApi("warn", ctx, "Webhook signature mismatch");
    return apiJson(ctx, { error: "Invalid signature" }, { status: 403 });
  }

  try {
    const payload = JSON.parse(payloadRaw);
    const event = payload.event;
    if (event === "charge.success") {
      const reference = payload?.data?.reference;
      const metadata = payload.data.metadata || {};
      const orderId = metadata.orderId;

      if (orderId) {
        const finalized = await finalizePaystackOrderPayment({
          orderId,
          reference,
          amount: Number(payload?.data?.amount || 0) / 100,
          currency: payload?.data?.currency || "GHS",
          providerPayload: payload?.data || {},
        });

        await trackEvent({
          name: "purchase",
          userId: finalized.order.user.email,
          metadata: {
            orderId: finalized.order.id,
            total: finalized.order.total,
            currency: payload?.data?.currency || "GHS",
            source: "webhook",
          },
        });

        if (!finalized.alreadyPaid) {
          const items = finalized.order.items.map((item) => ({
            title: item.product.title,
            qty: item.quantity,
            unitPrice: item.unitPrice,
          }));
          try {
            await sendOrderReceipt({
              to: finalized.order.user.email,
              userName: finalized.order.user.name || finalized.order.user.email,
              orderId: finalized.order.id,
              total: finalized.order.total,
              items,
            });
          } catch (emailError) {
            logApiError(ctx, "Receipt email failed after webhook payment", emailError, { orderId });
          }
        }
      }

      logApi("info", ctx, "Webhook charge.success processed", { reference, orderId });
    } else {
      logApi("info", ctx, "Webhook event ignored", { event });
    }

    return apiJson(ctx, { received: true });
  } catch (error) {
    logApiError(ctx, "Webhook processing failed", error);
    return apiJson(ctx, { error: "Webhook processing failed" }, { status: 500 });
  }
}
