import { prisma } from "@/lib/db/prisma";

/**
 * Calculates the price for a product based on user role and quantity.
 * Automatically applies wholesale pricing tiers if applicable.
 */
export async function getTieredPrice(productId: string, quantity: number, userRole: "CUSTOMER" | "WHOLESALE" = "CUSTOMER") {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { priceTiers: true }
  });

  if (!product) return 0;

  // Base price selection
  let basePrice = userRole === "WHOLESALE" ? product.wholesalePrice : product.retailPrice;

  // Check tiers
  const applicableTier = product.priceTiers.find((tier: any) =>
    tier.type === (userRole === "WHOLESALE" ? "WHOLESALE" : "RETAIL") &&
    quantity >= tier.minQty && 
    (tier.maxQty === 0 || quantity <= tier.maxQty)
  );

  return applicableTier ? applicableTier.price : basePrice;
}
