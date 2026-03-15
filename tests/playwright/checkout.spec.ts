import { test, expect } from "@playwright/test";

test("shop page loads and category links work", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Elima|Shop|E-commerce/i);

  await page.click("text=Shop");
  await expect(page).toHaveURL(/\/shop/);

  const productLink = await page.locator("a:has-text('View Product')").first();
  if (await productLink.count() > 0) {
    await productLink.click();
    await expect(page).toHaveURL(/\/product\//);
  }
});
