import { test, expect } from "@playwright/test";

test("Shop page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Elima|Retail/);
  await page.goto("/shop");
  await expect(page.locator("h1")).toHaveText("Shop");
});
