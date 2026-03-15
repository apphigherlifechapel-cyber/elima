export type RiskAssessmentInput = {
  subtotal: number;
  itemCount: number;
  isGuest: boolean;
  shippingCountry: string;
  email?: string;
};

export type RiskAssessment = {
  score: number;
  decision: "ALLOW" | "REVIEW";
  reasons: string[];
};

export function assessCheckoutRisk(input: RiskAssessmentInput): RiskAssessment {
  let score = 0;
  const reasons: string[] = [];

  if (input.subtotal >= 400000) {
    score += 30;
    reasons.push("High cart value");
  }
  if (input.itemCount >= 8) {
    score += 15;
    reasons.push("Large item count");
  }
  if (input.isGuest) {
    score += 10;
    reasons.push("Guest checkout");
  }
  if (input.shippingCountry && input.shippingCountry.toLowerCase() !== "ghana") {
    score += 10;
    reasons.push("Cross-border shipping");
  }
  if (input.email && /test|fake|temp|mailinator/i.test(input.email)) {
    score += 25;
    reasons.push("Suspicious email pattern");
  }

  return {
    score,
    decision: score >= 45 ? "REVIEW" : "ALLOW",
    reasons,
  };
}
