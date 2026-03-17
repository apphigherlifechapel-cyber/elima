import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { initializePaystackPayment } from "@/lib/payments/paystack";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { calculateShippingCost, canFulfillInventory } from "@/lib/orders";
import { CartItem, Prisma, Product, ProductVariant } from "@prisma/client";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { assessCheckoutRisk } from "@/lib/risk.engine";
import { getDynamicPrice } from "@/lib/pricing.dynamic";
import { chooseWarehouse } from "@/lib/warehouse-routing";
import { trackEvent } from "@/lib/analytics.events";

type GuestInputItem = {
  productId?: string;
  variantId?: string | null;
  quantity?: number;
  unitPrice?: number;
};

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rate = await checkRateLimitAsync(`checkout:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many checkout attempts. Please wait and try again." }, { status: 429 });
    }

    const body = await req.json();
    const { shippingAddress, billingAddress, shippingMethod } = body;

    if (!shippingAddress || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.country || !shippingAddress.postalCode) {
      return NextResponse.json({ error: "Invalid shippingAddress" }, { status: 400 });
    }

    const selectedWarehouse = chooseWarehouse(String(shippingAddress.state || ""));

    const session = await getServerSession(authOptions);
    // Guest checkout path
    if (!session?.user?.email) {
      const guestEmail = String(body.guestEmail || "").trim().toLowerCase();
      const guestItems = Array.isArray(body.guestItems) ? body.guestItems : [];

      if (!guestEmail || guestItems.length === 0) {
        return NextResponse.json({ error: "guestEmail and guestItems are required for guest checkout" }, { status: 400 });
      }

      const normalizedGuestItems = guestItems
        .map((item: GuestInputItem) => ({
          productId: String(item.productId || ""),
          variantId: item.variantId || null,
          quantity: Number(item.quantity || 0),
        }))
        .filter((item: { productId: string; quantity: number }) => item.productId && item.quantity > 0);

      if (normalizedGuestItems.length === 0) {
        return NextResponse.json({ error: "No valid guest items provided" }, { status: 400 });
      }

      const productIds = Array.from(new Set(normalizedGuestItems.map((item: { productId: string }) => item.productId)));
      const variantIds = Array.from(
        new Set(normalizedGuestItems.map((item: { variantId: string | null }) => item.variantId).filter(Boolean) as string[])
      );

      const [products, variants] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: productIds }, isAvailable: true } }),
        prisma.productVariant.findMany({ where: { id: { in: variantIds }, isAvailable: true } }),
      ]);

      const productMap: Map<string, Product> = new Map(products.map((product: Product): [string, Product] => [product.id, product]));
      const variantMap: Map<string, ProductVariant> = new Map(
        variants.map((variant: ProductVariant): [string, ProductVariant] => [variant.id, variant])
      );

      const pricedGuestItems = normalizedGuestItems.map((item: { productId: string; variantId: string | null; quantity: number }) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error("One or more products are unavailable");
        }

        const variant = item.variantId ? variantMap.get(item.variantId) : null;
        if (item.variantId && !variant) {
          throw new Error("One or more variants are unavailable");
        }

        if (variant && variant.productId !== product.id) {
          throw new Error("Variant does not belong to product");
        }

        const available = variant ? variant.stock - variant.stockReserved : product.stockTotal - product.stockReserved;
        if (available < item.quantity) {
          throw new Error("Insufficient stock for one or more items");
        }

        const basePrice = variant ? Number(variant.retailPrice) : Number(product.retailPrice);
        const unitPrice = getDynamicPrice({
          basePrice,
          accountType: "RETAIL",
          quantity: item.quantity,
          hasActiveCampaign: false,
          loyaltyTier: "NONE",
        });

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice,
        };
      });

      const subtotal = pricedGuestItems.reduce((acc: number, item: { quantity: number; unitPrice: number }) => acc + item.quantity * item.unitPrice, 0);
      const shippingCost = calculateShippingCost(shippingMethod ?? "standard");
      const total = subtotal + shippingCost;

      const risk = assessCheckoutRisk({
        subtotal,
        itemCount: pricedGuestItems.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0),
        isGuest: true,
        shippingCountry: String(shippingAddress.country || ""),
        email: guestEmail,
      });

      if (risk.decision === "REVIEW") {
        return NextResponse.json(
          {
            error: "Checkout requires manual review. Please contact support.",
            risk,
          },
          { status: 403 }
        );
      }

      const guestUser = await prisma.user.upsert({
        where: { email: guestEmail },
        update: {},
        create: {
          email: guestEmail,
          name: null,
          role: "CUSTOMER",
          accountType: "RETAIL",
          wholesaleStatus: "PENDING",
        },
      });

      const order = await prisma.order.create({
        data: {
          userId: guestUser.id,
          type: "RETAIL",
          status: "PENDING",
          fulfillmentStatus: "PENDING",
          subtotal,
          tax: 0,
          shipping: shippingCost,
          total,
          shippingAddress: {
            create: {
              ...shippingAddress,
              userId: guestUser.id,
              label: "Guest Checkout",
            },
          },
          billingAddress: billingAddress
            ? {
                create: {
                  ...billingAddress,
                  userId: guestUser.id,
                  label: "Guest Billing",
                },
              }
            : undefined,
          items: {
            create: pricedGuestItems.map((item: { productId: string; variantId: string | null; quantity: number; unitPrice: number }) => ({
              productId: item.productId,
              variantId: item.variantId || undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
            })),
          },
        },
      });

      await Promise.all([
        prisma.adminAuditLog.create({
          data: {
            action: "WAREHOUSE_ROUTED",
            entity: "Order",
            entityId: order.id,
            changes: JSON.stringify({ warehouse: selectedWarehouse }),
            userId: null,
          },
        }),
        trackEvent({
          name: "begin_checkout",
          userId: guestUser.id,
          metadata: {
            orderId: order.id,
            accountType: "RETAIL",
            subtotal,
            itemCount: pricedGuestItems.length,
            warehouse: selectedWarehouse.id,
            riskScore: risk.score,
          },
        }),
      ]);

      try {
        const reference = `ELIMA-GUEST-${Date.now()}`;
        const callbackUrl = `${process.env.PAYSTACK_CALLBACK_URL || "https://elima-eight.vercel.app/checkout/success"}?orderId=${order.id}&reference=${reference}`;
        const paystackData = await initializePaystackPayment(guestEmail, Math.round(total * 100), reference, { orderId: order.id, isGuest: true }, callbackUrl);
        return NextResponse.json({ orderId: order.id, reference, payment: paystackData, warehouse: selectedWarehouse, risk });
      } catch (error) {
        console.error("Paystack init error (Guest)", error);
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.orderItem.deleteMany({ where: { orderId: order.id } });
          await tx.order.delete({ where: { id: order.id } });
          await tx.address.deleteMany({
            where: {
              id: { in: [order.shippingAddressId, order.billingAddressId].filter(Boolean) as string[] },
              userId: guestUser.id,
              label: { in: ["Guest Checkout", "Guest Billing"] },
            },
          });
        });
        return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
      }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const cart = await prisma.cart.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (
      !canFulfillInventory(
        cart.items.map((item: CartItem & { product: Product; variant: ProductVariant | null }) => ({
          quantity: item.quantity,
          product: item.product,
          variant: item.variant,
        }))
      )
    ) {
      return NextResponse.json({ error: "Insufficient stock for one or more items" }, { status: 400 });
    }

    const pricedItems = cart.items.map((item: CartItem & { product: Product; variant: ProductVariant | null }) => {
      const basePrice = item.variant ? Number(item.variant.retailPrice) : Number(item.product.retailPrice);
      const unitPrice = getDynamicPrice({
        basePrice,
        accountType: user.accountType,
        quantity: item.quantity,
        hasActiveCampaign: false,
        loyaltyTier: "NONE",
      });

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
      };
    });

    const subtotal = pricedItems.reduce((acc: number, item: { quantity: number; unitPrice: number }) => acc + item.quantity * item.unitPrice, 0);
    const shippingCost = calculateShippingCost(shippingMethod ?? "standard");
    const total = subtotal + shippingCost;

    const risk = assessCheckoutRisk({
      subtotal,
      itemCount: pricedItems.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0),
      isGuest: false,
      shippingCountry: String(shippingAddress.country || ""),
      email: user.email,
    });

    if (risk.decision === "REVIEW") {
      return NextResponse.json(
        {
          error: "Checkout requires manual review. Please contact support.",
          risk,
        },
        { status: 403 }
      );
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type: user.accountType === "WHOLESALE" ? "WHOLESALE" : "RETAIL",
        status: "PENDING",
        fulfillmentStatus: "PENDING",
        subtotal,
        tax: 0,
        shipping: shippingCost,
        total,
        shippingAddress: {
          create: {
            ...shippingAddress,
            userId: user.id,
            label: "Checkout",
          },
        },
        billingAddress: billingAddress
          ? {
              create: {
                ...billingAddress,
                userId: user.id,
                label: "Billing",
              },
            }
          : undefined,
        items: {
          create: pricedItems.map((item: { productId: string; variantId: string | null; quantity: number; unitPrice: number }) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
      },
    });

    await Promise.all([
      prisma.adminAuditLog.create({
        data: {
          action: "WAREHOUSE_ROUTED",
          entity: "Order",
          entityId: order.id,
          changes: JSON.stringify({ warehouse: selectedWarehouse }),
          userId: user.id,
        },
      }),
      trackEvent({
        name: "begin_checkout",
        userId: user.id,
        metadata: {
          orderId: order.id,
          accountType: user.accountType,
          subtotal,
          itemCount: pricedItems.length,
          warehouse: selectedWarehouse.id,
          riskScore: risk.score,
        },
      }),
    ]);

    // Initialize Paystack payment
    try {
      const reference = `ELIMA-${Date.now()}`;
      const callbackUrl = `${process.env.PAYSTACK_CALLBACK_URL || "https://elima-eight.vercel.app/checkout/success"}?orderId=${order.id}&reference=${reference}`;
      const paystackData = await initializePaystackPayment(user.email, Math.round(total * 100), reference, { orderId: order.id }, callbackUrl);

      return NextResponse.json({ orderId: order.id, reference, payment: paystackData, warehouse: selectedWarehouse, risk });
    } catch (error) {
      console.error("Paystack init error", error);
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.orderItem.deleteMany({ where: { orderId: order.id } });
        await tx.order.delete({ where: { id: order.id } });
        await tx.address.deleteMany({
          where: {
            id: { in: [order.shippingAddressId, order.billingAddressId].filter(Boolean) as string[] },
            userId: user.id,
            label: { in: ["Checkout", "Billing"] },
          },
        });
      });
      return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
    }
  } catch (err) {
    console.error("Critical checkout exception:", err);
    return NextResponse.json(
      { 
        error: "Internal server error during checkout process",
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}


