import { test, expect } from "@playwright/test";

test("staff can sign in and access staff order/inventory admin pages", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "staff@elima.com");
  await page.fill('input[type="password"]', "Staff123!");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin/orders");
  await expect(page.locator("h1")).toContainText("Admin Orders");

  await page.goto("/admin/inventory");
  await expect(page.locator("h1")).toContainText("Admin Inventory");
});
