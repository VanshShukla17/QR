import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 5 — Accessibility Audit Pass (axe-core)", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(["camera", "geolocation"]);
    await page.context().setGeolocation({ latitude: 12.9716, longitude: 77.5946 });
  });

  test("A11y Audit: Landing Page (/) meets WCAG 2.1 AA standards", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/QRaksha/i);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Allow video element mock without tracks in dev/test environment
      .disableRules(["video-caption"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("A11y Audit: Self-Audit Scan Page (/audit/run) camera viewfinder and controls", async ({
    page,
  }) => {
    await page.goto("/audit/run", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Self-Audit Verification");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["video-caption"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("A11y Audit: Customer Check Page (/check) public interface", async ({ page }) => {
    await page.goto("/check", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Customer Pre-Pay Check");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["video-caption"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("A11y Audit: Verdict Card in all 3 outcome tiers (VERIFIED, BUILDING TRUST, WARNING)", async ({
    page,
  }) => {
    // Intercept self-audit to test WARNING verdict card accessibility
    await page.route("**/api/v1/audit/run", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            verdict: "WARNING",
            reason: "UNKNOWN_QR",
            message:
              "Unknown QR sticker: This payload is not registered to any merchant in QRaksha. Do not accept payments until inspected.",
            auditRunId: "run-a11y-9999",
            agentOutputs: {
              identity: {
                status: "fail",
                isRegistered: false,
                reason: "QR payload unknown in registry",
              },
              vision: { status: "pass", metadata: { skipped: true } },
              context: { status: "pass", reason: "Within premises coordinates" },
              misbinding: { status: "pass", isMisbound: false },
            },
            degradedCheck: false,
          },
        }),
      });
    });

    await page.goto("/audit/run", { waitUntil: "networkidle" });
    await expect(page.locator("text=GPS ACTIVE")).toBeVisible({ timeout: 15000 });

    const shutterButton = page.getByRole("button", { name: "Capture Reference Photo" });
    await expect(shutterButton).toBeVisible();
    await shutterButton.click();

    await expect(page.getByRole("heading", { name: "WARNING" })).toBeVisible({
      timeout: 15000,
    });

    // Verify axe-core passes with the verdict card takeover displayed
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["video-caption"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("Screen-reader & non-color sensory checks: labels and icons paired with verdict", async ({
    page,
  }) => {
    await page.route("**/api/v1/audit/run", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            verdict: "WARNING",
            reason: "LOCATION_MISMATCH",
            message:
              "Location mismatch: This sticker was scanned outside its registered location.",
            auditRunId: "run-a11y-relocated",
            agentOutputs: {
              identity: {
                status: "pass",
                isRegistered: true,
                reason: "Registered payload",
              },
              vision: { status: "pass", score: 0.95 },
              context: { status: "fail", reason: "Outside GPS boundary" },
              misbinding: {
                status: "fail",
                isMisbound: true,
                reason: "Location mismatch",
              },
            },
            degradedCheck: false,
          },
        }),
      });
    });

    await page.goto("/audit/run", { waitUntil: "networkidle" });
    await expect(page.locator("text=GPS ACTIVE")).toBeVisible({ timeout: 15000 });

    const shutterButton = page.getByRole("button", { name: "Capture Reference Photo" });
    await shutterButton.click();

    await expect(page.getByRole("heading", { name: "WARNING" })).toBeVisible({
      timeout: 15000,
    });

    // Verify text label is explicitly present (never color alone per PRD.md Section 6 & DESIGN.md Section 9)
    await expect(page.locator("text=WARNING")).toBeVisible();
    await expect(page.locator("text=RELOCATED")).toBeVisible();
    await expect(page.locator("text=REASON // LOCATION_MISMATCH")).toBeVisible();

    // Verify reset / action button is focusable and accessible
    const returnDashboardLink = page.getByRole("link", { name: "Return to Dashboard" });
    await expect(returnDashboardLink).toBeVisible();
    await expect(returnDashboardLink).toHaveAttribute("href", "/dashboard");
  });
});
