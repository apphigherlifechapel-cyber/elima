import { describe, expect, it } from "vitest";
import { formatNaira } from "@/lib/utils/currency";

describe("formatNaira", () => {
  it("formats amount as GHS with two decimals", () => {
    expect(formatNaira(1200)).toBe("GHS 1200.00");
    expect(formatNaira(1200.5)).toBe("GHS 1200.50");
  });
});
