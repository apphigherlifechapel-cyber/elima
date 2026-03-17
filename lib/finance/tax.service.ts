export class TaxService {
  /**
   * Calculates tax based on destination and order value.
   * Mock implementation for Global Tax Compliance.
   */
  static calculateTax(subtotal: number, country: string): number {
    const taxRates: Record<string, number> = {
      "ghana": 0.15, // 15% VAT
      "nigeria": 0.075, // 7.5% VAT
      "united states": 0.0, // Handled at state level usually, mock 0
      "united kingdom": 0.20, // 20% VAT
    };

    const rate = taxRates[country.toLowerCase()] ?? 0.10; // Default 10% for unknown
    return subtotal * rate;
  }
}
