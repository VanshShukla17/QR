import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Create Next App|QRaksha/i);
  });
});
