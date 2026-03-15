import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

type FinalizePaystackOrderPaymentInput = {
  orderId: string;
  reference: string;
  amount: number;
  currency: string;
  providerPayload: unknown;
};

type FinalizePaystackOrderPaymentResult = {
  alreadyPaid: boolean;
  order: {
    id: string;
    total: number;
    user: {
      email: string;
      name: string | null;
    };
    items: Array<{
      quantity: number;
      unitPrice: number;
      product: {
        title: string;
      };
    }>;
  };
};

export async function finalizePaystackOrderPayment(
  input: FinalizePaystackOrderPaymentInput
): Promise<FinalizePaystackOrderPaymentResult> {
  const { orderId, reference, amount, currency, providerPayload } = input;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!existingOrder) {
      throw new Error("ORDER_NOT_FOUND");
    }

    await tx.payment.upsert({
      where: { orderId },
      update: {
        provider: "PAYSTACK",
        providerId: reference,
        status: "COMPLETED",
        amount,
        currency,
        metadata: JSON.stringify(providerPayload),
      },
      create: {
        orderId,
        provider: "PAYSTACK",
        providerId: reference,
        status: "COMPLETED",
        amount,
        currency,
        metadata: JSON.stringify(providerPayload),
      },
    });

    if (existingOrder.status !== "PAID") {
      for (const item of existingOrder.items) {
        if (item.variantId) {
          const updated = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              stock: { gte: item.quantity },
              stockReserved: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
              stockReserved: { decrement: item.quantity },
            },
          });

          if (updated.count === 0) {
            throw new Error("INSUFFICIENT_VARIANT_STOCK");
          }
        } else {
          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stockTotal: { gte: item.quantity },
              stockReserved: { gte: item.quantity },
            },
            data: {
              stockTotal: { decrement: item.quantity },
              stockReserved: { decrement: item.quantity },
            },
          });

          if (updated.count === 0) {
            throw new Error("INSUFFICIENT_PRODUCT_STOCK");
          }
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          fulfillmentStatus: "PROCESSING",
        },
      });

      await tx.cartItem.deleteMany({
        where: { cart: { userId: existingOrder.userId } },
      });

      await tx.cart.deleteMany({
        where: { userId: existingOrder.userId },
      });
    }

    return {
      alreadyPaid: existingOrder.status === "PAID",
      order: {
        id: existingOrder.id,
        total: existingOrder.total,
        user: {
          email: existingOrder.user.email,
          name: existingOrder.user.name,
        },
        items: existingOrder.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          product: {
            title: item.product.title,
          },
        })),
      },
    };
  });
}
