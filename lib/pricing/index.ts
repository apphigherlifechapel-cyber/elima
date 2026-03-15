import { PriceTier } from "@prisma/client";

export function getPriceForQuantity(basePrice: number, quantity: number, tiers?: PriceTier[]) {
  if (!tiers || tiers.length === 0) return basePrice;

  const tier = tiers
    .filter((t) => quantity >= t.minQty && quantity <= t.maxQty)
    .sort((a, b) => a.minQty - b.minQty)[0];

  return tier ? tier.price : basePrice;
}

export function getWholesalePrice(baseWHPrice: number, quantity: number, tiers?: PriceTier[]) {
  return getPriceForQuantity(baseWHPrice, quantity, tiers);
}
