import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { verifyPaystackPayment } from "@/lib/payments/paystack";
import { sendOrderReceipt } from "@/lib/emails/sendReceipt";
import { finalizePaystackOrderPayment } from "@/lib/payments/finalizeOrderPayment";
import { trackEvent } from "@/lib/analytics.events";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync } from "@/lib/utils/rate-limit";
import { apiJson, createApiContext, logApi, logApiError, withUserContext } from "@/lib/utils/api-observability";

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/payments");
  const rate = await checkRateLimitAsync(`payments-verify:${baseCtx.ip}`, 12, 60_000);
  if (!rate.allowed) {
    logApi("warn", baseCtx, "Rate limit exceeded for payment verification");
    return apiJson(baseCtx, { error: "Too many payment verification requests. Try again shortly." }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logApi("warn", baseCtx, "Unauthorized payment verification attempt");
    return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) {
    logApi("warn", baseCtx, "Session email not found in database");
    return apiJson(baseCtx, { error: "Unauthorized" }, { status: 401 });
  }
  const ctx = withUserContext(baseCtx, user.id);

  const { reference, orderId } = (await req.json().catch(() => ({}))) as { reference?: string; orderId?: string };
  if (!reference || !orderId) {
    return apiJson(ctx, { error: "Reference and orderId required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true },
  });
  if (!order) {
    return apiJson(ctx, { error: "Order not found" }, { status: 404 });
  }

  const isPrivileged = user.role === "ADMIN" || user.role === "STAFF";
  if (!isPrivileged && order.userId !== user.id) {
    logApi("warn", ctx, "Forbidden payment verification for foreign order", { orderId });
    return apiJson(ctx, { error: "Forbidden" }, { status: 403 });
  }

  try {
    const verification = await verifyPaystackPayment(reference);
    const status = verification?.data?.status;
    if (status !== "success") {
      logApi("warn", ctx, "Payment verification failed", { orderId, reference, status });
      return apiJson(ctx, { status: "FAILED" });
    }

    const finalized = await finalizePaystackOrderPayment({
      orderId,
      reference,
      amount: Number(verification?.data?.amount || 0) / 100,
      currency: verification?.data?.currency || "GHS",
      providerPayload: verification?.data || {},
    });

    await trackEvent({
      name: "purchase",
      userId: finalized.order.user.email,
      metadata: {
        orderId: finalized.order.id,
        total: finalized.order.total,
        currency: verification?.data?.currency || "GHS",
      },
    });

    if (!finalized.alreadyPaid) {
      const items = finalized.order.items.map((item: { product: { title: string }; quantity: number; unitPrice: number }) => ({
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
        console.error("Receipt email failed", emailError);
      }
    }

    logApi("info", ctx, "Payment verification succeeded", { orderId, reference, alreadyPaid: finalized.alreadyPaid });
    return apiJson(ctx, {
      order: finalized.order,
      alreadyPaid: finalized.alreadyPaid,
      payment: {
        reference,
        status: "success",
        currency: verification?.data?.currency || "GHS",
        amount: Number(verification?.data?.amount || 0) / 100,
      },
    });
  } catch (error) {
    logApiError(ctx, "Payment verification crashed", error, { orderId, reference });
    return apiJson(ctx, { error: "Payment verification failed" }, { status: 500 });
  }
}
