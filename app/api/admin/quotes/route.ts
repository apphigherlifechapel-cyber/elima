import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { QuoteItem } from "@prisma/client";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized", status: 401 as const };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") {
    return { error: "Forbidden", status: 403 as const };
  }
  return { user };
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/quotes");
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      quoteId?: string;
      action?: "REVIEW" | "APPROVE" | "REJECT" | "CONVERT" | "REPRICE";
      itemPrices?: Array<{ itemId: string; unitPrice: number }>;
      notes?: string;
    };

    if (!body.quoteId || !body.action) {
      return apiJson(ctx, { error: "quoteId and action are required" }, { status: 400 });
    }

    const quote = await prisma.quote.findUnique({
      where: { id: body.quoteId },
      include: { items: true },
    });
    if (!quote) return apiJson(ctx, { error: "Quote not found" }, { status: 404 });

    if (body.action === "REVIEW") {
      if (!["SUBMITTED", "REVIEWING"].includes(quote.status)) {
        return apiJson(ctx, { error: "Only submitted quotes can move to review" }, { status: 409 });
      }
      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "REVIEWING",
          notes: body.notes ?? quote.notes,
        },
      });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "QUOTE_REVIEW",
          entity: "Quote",
          entityId: quote.id,
          changes: JSON.stringify({ fromStatus: quote.status, toStatus: "REVIEWING" }),
        },
      });
      return apiJson(ctx, { quote: updated });
    }

    if (body.action === "REPRICE") {
      if (!["SUBMITTED", "REVIEWING", "APPROVED"].includes(quote.status)) {
        return apiJson(ctx, { error: "Quote cannot be repriced in its current state" }, { status: 409 });
      }
      if (!body.itemPrices || body.itemPrices.length === 0) {
        return apiJson(ctx, { error: "itemPrices are required for REPRICE" }, { status: 400 });
      }

      const priceById = new Map(body.itemPrices.map((p) => [p.itemId, Number(p.unitPrice)]));
      let total = 0;
      for (const item of quote.items) {
        const nextUnitPrice = priceById.has(item.id) ? Number(priceById.get(item.id)) : Number(item.unitPrice);
        const normalizedUnitPrice = Number.isFinite(nextUnitPrice) && nextUnitPrice >= 0 ? nextUnitPrice : Number(item.unitPrice);
        const totalPrice = normalizedUnitPrice * item.quantity;
        total += totalPrice;
        await prisma.quoteItem.update({
          where: { id: item.id },
          data: {
            unitPrice: normalizedUnitPrice,
            totalPrice,
          },
        });
      }

      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          total,
          notes: body.notes ?? quote.notes,
        },
        include: { items: true },
      });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "QUOTE_REPRICE",
          entity: "Quote",
          entityId: quote.id,
          changes: JSON.stringify({ itemPrices: body.itemPrices, total }),
        },
      });
      return apiJson(ctx, { quote: updated });
    }

    if (body.action === "APPROVE") {
      if (!["REVIEWING", "SUBMITTED"].includes(quote.status)) {
        return apiJson(ctx, { error: "Only submitted/reviewing quotes can be approved" }, { status: 409 });
      }
      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "APPROVED",
          notes: body.notes ?? quote.notes,
        },
      });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "QUOTE_APPROVE",
          entity: "Quote",
          entityId: quote.id,
          changes: JSON.stringify({ fromStatus: quote.status, toStatus: "APPROVED" }),
        },
      });
      return apiJson(ctx, { quote: updated });
    }

    if (body.action === "REJECT") {
      if (!["SUBMITTED", "REVIEWING", "APPROVED"].includes(quote.status)) {
        return apiJson(ctx, { error: "Quote cannot be rejected in its current state" }, { status: 409 });
      }
      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "REJECTED",
          notes: body.notes ?? quote.notes,
        },
      });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "QUOTE_REJECT",
          entity: "Quote",
          entityId: quote.id,
          changes: JSON.stringify({ fromStatus: quote.status, toStatus: "REJECTED" }),
        },
      });
      return apiJson(ctx, { quote: updated });
    }

    if (body.action === "CONVERT") {
      if (quote.status !== "APPROVED") {
        return apiJson(ctx, { error: "Only approved quotes can be converted" }, { status: 409 });
      }

      const order = await prisma.order.create({
        data: {
          userId: quote.userId,
          type: "QUOTE_CONVERTED",
          status: "PENDING",
          fulfillmentStatus: "PENDING",
          subtotal: quote.total,
          tax: 0,
          shipping: 0,
          total: quote.total,
          quoteId: quote.id,
          items: {
            create: quote.items.map((item: QuoteItem) => ({
              productId: item.productId,
              variantId: item.variantId || undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: { items: true },
      });

      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: "CONVERTED_TO_ORDER" },
      });
      await prisma.adminAuditLog.create({
        data: {
          userId: auth.user.id,
          action: "QUOTE_CONVERT",
          entity: "Quote",
          entityId: quote.id,
          changes: JSON.stringify({ orderId: order.id }),
        },
      });

      return apiJson(ctx, { order });
    }

    return apiJson(ctx, { error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    logApiError(baseCtx, "Failed to update quote", error);
    return apiJson(baseCtx, { error: "Failed to update quote" }, { status: 500 });
  }
}
