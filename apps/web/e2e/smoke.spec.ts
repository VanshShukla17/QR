import { test, expect } from "@playwright/test";

test("has landing page title and scan button", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/QRaksha/i);
});
