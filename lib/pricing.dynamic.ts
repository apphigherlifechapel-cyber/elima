export type DynamicPricingInput = {
  basePrice: number;
  accountType: "RETAIL" | "WHOLESALE" | "HYBRID";
  quantity: number;
  hasActiveCampaign?: boolean;
  loyaltyTier?: "NONE" | "BRONZE" | "SILVER" | "GOLD";
};

export function getDynamicPrice(input: DynamicPricingInput) {
  let price = input.basePrice;

  if (input.accountType !== "RETAIL") {
    price *= 0.93;
  }

  if (input.quantity >= 5) price *= 0.97;
  if (input.quantity >= 10) price *= 0.95;

  if (input.hasActiveCampaign) price *= 0.98;

  switch (input.loyaltyTier || "NONE") {
    case "BRONZE":
      price *= 0.995;
      break;
    case "SILVER":
      price *= 0.99;
      break;
    case "GOLD":
      price *= 0.985;
      break;
    default:
      break;
  }

  return Math.max(1, Math.round(price * 100) / 100);
}
