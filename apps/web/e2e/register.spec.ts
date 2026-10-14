import { expect, test } from "@playwright/test";

test.describe("Merchant Registration Flow (/register)", () => {
  test("renders registration wizard step 1 and path selector", async ({ page }) => {
    await page.goto("/register");

    // Title and step indicator
    await expect(
      page.getByRole("heading", { name: /Merchant Registration/i })
    ).toBeVisible();
    await expect(page.getByText(/1. Identity/i)).toBeVisible();

    // Both path options are visible
    await expect(page.getByRole("button", { name: /GST \/ Udyam/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /UPI Penny-Drop/i })).toBeVisible();
  });

  test("validates required fields on submission", async ({ page }) => {
    await page.goto("/register");

    const submitBtn = page.getByRole("button", {
      name: /Complete Step 1 & Proceed/i,
    });
    await submitBtn.click();

    // Expect validation errors
    await expect(
      page.getByText(/Business name must be at least 2 characters/i)
    ).toBeVisible();
  });

  test("allows switching to penny-drop baseline tier", async ({ page }) => {
    await page.goto("/register");

    await page.getByRole("button", { name: /UPI Penny-Drop/i }).click();

    await expect(page.getByText(/Merchant UPI VPA/i)).toBeVisible();
    await expect(page.getByText(/Bank Name Match \(Penny Drop\)/i)).toBeVisible();
  });
});
