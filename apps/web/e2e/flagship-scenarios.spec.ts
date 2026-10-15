import { test, expect } from "@playwright/test";

test.describe("Phase 5 — Flagship Demo Scenarios (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
    page.on("pageerror", (err) => console.error("[BROWSER UNCAUGHT]", err.message));
    await page.context().grantPermissions(["camera", "geolocation"]);
    await page.context().setGeolocation({ latitude: 12.9716, longitude: 77.5946 });
  });

  test("Flagship Scenario 1: QR Replacement Detected (Swapped / Unregistered Counterfeit QR)", async ({
    page,
  }) => {
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
            auditRunId: "run-replaced-9999",
            agentOutputs: {
              identity: {
                status: "fail",
                isRegistered: false,
                reason: "QR payload unknown in registry",
              },
              vision: {
                status: "pass",
                metadata: { skipped: true },
              },
              context: {
                status: "pass",
                reason: "Within premises coordinates",
              },
              misbinding: {
                status: "pass",
                isMisbound: false,
              },
            },
            degradedCheck: false,
          },
        }),
      });
    });

    await page.goto("/audit/run", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Self-Audit Verification");
    // Wait for client-side hydration (GPS active element renders after useEffect)
    await expect(page.locator("text=GPS ACTIVE")).toBeVisible({ timeout: 15000 });

    // Configure replaced counterfeit QR payload
    const payloadInput = page.locator(
      'input[placeholder="upi://pay?pa=merchant@upi&pn=Store"]'
    );
    await expect(payloadInput).toBeVisible();
    await payloadInput.fill("upi://pay?pa=attacker@scam&pn=FraudulentReplacement");
    await expect(payloadInput).toHaveValue(
      "upi://pay?pa=attacker@scam&pn=FraudulentReplacement"
    );

    // Click camera shutter button
    const shutterButton = page.getByRole("button", { name: "Capture Reference Photo" });
    await expect(shutterButton).toBeVisible();
    await shutterButton.click();

    // Verify 🔴 WARNING verdict card renders
    await expect(page.getByRole("heading", { name: "WARNING" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=REASON // UNKNOWN_QR")).toBeVisible();
    await expect(
      page.locator("text=Unknown QR sticker: This payload is not registered")
    ).toBeVisible();
    await expect(page.locator("text=FLAG")).toBeVisible();
  });

  test("Flagship Scenario 2: QR Relocation Detected (Valid QR in Wrong Place - The Killer Demo)", async ({
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
              "Location mismatch: This sticker was scanned outside its registered location. Verify your counter location or re-bind GPS.",
            credentialId: "550e8400-e29b-41d4-a716-446655440001",
            auditRunId: "run-relocated-8888",
            agentOutputs: {
              identity: {
                status: "pass",
                isRegistered: true,
                credentialId: "550e8400-e29b-41d4-a716-446655440001",
                reason: "Payload matched registered credential (Sharma Canteen)",
              },
              vision: {
                status: "pass",
                score: 0.92,
                reason: "Visual embedding compared",
              },
              context: {
                status: "fail",
                reason: "QR relocation detected (2.4km outside bound premises)",
                metadata: { isWithinRadius: false, distanceMeters: 2400 },
              },
              misbinding: {
                status: "fail",
                isMisbound: true,
                reason:
                  "Geographic misbinding detected: valid QR presented outside premises",
              },
            },
            degradedCheck: false,
          },
        }),
      });
    });

    await page.goto("/audit/run", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Self-Audit Verification");
    // Wait for client-side hydration (GPS active element renders after useEffect)
    await expect(page.locator("text=GPS ACTIVE")).toBeVisible({ timeout: 15000 });

    // Configure genuine Sharma Canteen payload scanned at distant relocated coordinates
    const payloadInput = page.locator(
      'input[placeholder="upi://pay?pa=merchant@upi&pn=Store"]'
    );
    await expect(payloadInput).toBeVisible();
    await payloadInput.fill(
      "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&mc=5499&aid=uGICAgICAgICAgA"
    );
    await expect(payloadInput).toHaveValue(
      "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&mc=5499&aid=uGICAgICAgICAgA"
    );

    // Click camera shutter button
    const shutterButton = page.getByRole("button", { name: "Capture Reference Photo" });
    await expect(shutterButton).toBeVisible();
    await shutterButton.click();

    // Verify 🔴 WARNING verdict card renders with LOCATION_MISMATCH
    await expect(page.getByRole("heading", { name: "WARNING" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=REASON // LOCATION_MISMATCH")).toBeVisible();
    await expect(
      page.locator(
        "text=Location mismatch: This sticker was scanned outside its registered location"
      )
    ).toBeVisible();
    await expect(page.locator("text=RELOCATED")).toBeVisible();
  });

  test("Customer Flow: Non-alarming friendly verdict for unregistered QR on /check", async ({
    page,
  }) => {
    await page.route("**/api/v1/check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            verdict: "RECENTLY_REGISTERED",
            reason: "OK",
            isUnregistered: true,
            message:
              "This merchant is not yet registered with QRaksha. You can still pay through your standard UPI app if you recognize the counter.",
            agentOutputs: {
              identity: { status: "fail", reason: "unknown QR code" },
            },
          },
        }),
      });
    });

    await page.goto("/check", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Customer Pre-Pay Check");

    const shutterButton = page.getByRole("button", { name: "Capture Reference Photo" });
    await expect(shutterButton).toBeVisible();

    // Configure unregistered merchant payload
    const payloadInput = page.locator(
      'input[placeholder="upi://pay?pa=merchant@upi&pn=Store"]'
    );
    await expect(payloadInput).toBeVisible();
    await payloadInput.fill("upi://pay?pa=unregistered.local.stall@upi&pn=LocalStall");
    await expect(payloadInput).toHaveValue(
      "upi://pay?pa=unregistered.local.stall@upi&pn=LocalStall"
    );

    // Click camera shutter button
    await shutterButton.click();

    // Verify non-alarming friendly verdict per PRD.md Section 4 & 6
    await expect(page.getByRole("heading", { name: "NOT ENROLLED" })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator("text=This merchant is not yet registered with QRaksha")
    ).toBeVisible();
  });
});
