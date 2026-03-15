import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ExpireStaleOrdersResult = {
  scanned: number;
  expired: number;
  releasedItems: number;
};

export async function expireStaleOrders(olderThanMinutes = 60): Promise<ExpireStaleOrdersResult> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);

  const candidates = await prisma.order.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
    },
    include: {
      items: true,
    },
  });

  let expired = 0;
  let releasedItems = 0;

  for (const order of candidates) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              stockReserved: { gte: item.quantity },
            },
            data: {
              stockReserved: { decrement: item.quantity },
            },
          });
        } else {
          await tx.product.updateMany({
            where: {
              id: item.productId,
              stockReserved: { gte: item.quantity },
            },
            data: {
              stockReserved: { decrement: item.quantity },
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          fulfillmentStatus: "EXPIRED",
        },
      });
    });

    expired += 1;
    releasedItems += order.items.length;
  }

  return {
    scanned: candidates.length,
    expired,
    releasedItems,
  };
}
