import { prisma } from "@/lib/db/prisma";
import { FulfillmentStatus, OrderStatus } from "@prisma/client";

const FULFILLMENT_ORDER: FulfillmentStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "EXPIRED"];

function canTransition(current: FulfillmentStatus, next: FulfillmentStatus): boolean {
  if (current === next) return true;
  if (current === "DELIVERED" || current === "CANCELLED" || current === "EXPIRED") return false;
  if (next === "EXPIRED") return false;
  if (next === "CANCELLED") return true;

  const cur = FULFILLMENT_ORDER.indexOf(current);
  const nxt = FULFILLMENT_ORDER.indexOf(next);
  if (cur < 0 || nxt < 0) return false;
  return nxt >= cur;
}

export async function updateOrderByStaffOrAdmin(params: {
  actorUserId: string;
  orderId: string;
  fulfillmentStatus?: FulfillmentStatus;
  orderStatus?: OrderStatus;
  carrier?: string;
  trackingNumber?: string | null;
}) {
  const { actorUserId, orderId, fulfillmentStatus, orderStatus, carrier, trackingNumber } = params;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { shipment: true } });
  if (!order) {
    return { error: "Order not found", status: 404 as const };
  }

  const nextFulfillment = fulfillmentStatus ?? order.fulfillmentStatus;
  const nextOrderStatus = orderStatus ?? order.status;

  if (!canTransition(order.fulfillmentStatus, nextFulfillment)) {
    return { error: "Invalid fulfillment status transition", status: 409 as const };
  }

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      fulfillmentStatus: nextFulfillment,
      status: nextOrderStatus,
    },
  });

  if (carrier || trackingNumber !== undefined || nextFulfillment === "SHIPPED" || nextFulfillment === "DELIVERED") {
    if (order.shipment) {
      await prisma.shipment.update({
        where: { orderId: order.id },
        data: {
          carrier: carrier || order.shipment.carrier,
          trackingNumber: trackingNumber === undefined ? order.shipment.trackingNumber : trackingNumber,
          status: nextFulfillment,
          shippedAt: nextFulfillment === "SHIPPED" ? new Date() : order.shipment.shippedAt,
          deliveredAt: nextFulfillment === "DELIVERED" ? new Date() : order.shipment.deliveredAt,
        },
      });
    } else {
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          carrier: carrier || "Unspecified",
          trackingNumber: trackingNumber || null,
          status: nextFulfillment,
          shippedAt: nextFulfillment === "SHIPPED" ? new Date() : null,
          deliveredAt: nextFulfillment === "DELIVERED" ? new Date() : null,
        },
      });
    }
  }

  await prisma.adminAuditLog.create({
    data: {
      userId: actorUserId,
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: order.id,
      changes: JSON.stringify({
        fulfillmentStatus: { from: order.fulfillmentStatus, to: nextFulfillment },
        status: { from: order.status, to: nextOrderStatus },
        carrier,
        trackingNumber,
      }),
    },
  });

  return { order: updatedOrder };
}

export async function adjustInventoryByStaffOrAdmin(params: {
  actorUserId: string;
  productId: string;
  stockTotal?: number;
  stockReserved?: number;
  isAvailable?: boolean;
}) {
  const { actorUserId, productId, stockTotal, stockReserved, isAvailable } = params;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return { error: "Product not found", status: 404 as const };
  }

  const nextStockTotal = stockTotal === undefined ? product.stockTotal : Math.max(0, Math.floor(Number(stockTotal)));
  const nextStockReserved = stockReserved === undefined ? product.stockReserved : Math.max(0, Math.floor(Number(stockReserved)));

  if (nextStockReserved > nextStockTotal) {
    return { error: "stockReserved cannot exceed stockTotal", status: 400 as const };
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      stockTotal: nextStockTotal,
      stockReserved: nextStockReserved,
      isAvailable: isAvailable ?? product.isAvailable,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      userId: actorUserId,
      action: "INVENTORY_ADJUST",
      entity: "Product",
      entityId: product.id,
      changes: JSON.stringify({
        stockTotal: { from: product.stockTotal, to: updated.stockTotal },
        stockReserved: { from: product.stockReserved, to: updated.stockReserved },
        isAvailable: { from: product.isAvailable, to: updated.isAvailable },
      }),
    },
  });

  return { product: updated };
}


