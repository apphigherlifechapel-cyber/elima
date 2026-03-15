import { test, expect } from "@playwright/test";

test("reviewer can submit a product review", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "staff@elima.com");
  await page.fill('input[type="password"]', "Staff123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/shop");
  const firstProduct = page.locator('a[href^="/product/"]').first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.click();
  await expect(page).toHaveURL(/\/product\//);

  await expect(page.locator("text=Write a review")).toBeVisible();
  await page.selectOption("select", "5");
  await page.fill('input[placeholder="Title (optional)"]', "Great product");
  await page.fill('textarea[placeholder="Comment (optional)"]', "Bought and used. Quality is good.");
  await page.click('button:has-text("Submit Review")');

  await expect(page.locator("text=Review submitted.")).toBeVisible();
});
