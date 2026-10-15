import { describe, expect, it } from "vitest";

describe("Phase 4 — Security Headers in apps/web (next.config.mjs)", () => {
  it("defines comprehensive security headers for all routes in apps/web", async () => {
    const configModule = await import("../../next.config.mjs");
    const nextConfig = configModule.default;

    expect(nextConfig.headers).toBeDefined();
    expect(typeof nextConfig.headers).toBe("function");

    const headerRules = await nextConfig.headers!();
    expect(headerRules).toBeInstanceOf(Array);
    expect(headerRules.length).toBeGreaterThan(0);

    const catchAllRule = headerRules.find(
      (rule: { source: string }) => rule.source === "/:path*"
    );
    expect(catchAllRule).toBeDefined();
    if (!catchAllRule) throw new Error("catchAllRule not found");

    const headersMap = new Map<string, string>();
    for (const h of catchAllRule.headers) {
      headersMap.set(h.key.toLowerCase(), h.value);
    }

    // 1. Content-Security-Policy
    expect(headersMap.has("content-security-policy")).toBe(true);
    const csp = headersMap.get("content-security-policy")!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("img-src 'self' data: blob:");

    // 2. X-Content-Type-Options
    expect(headersMap.get("x-content-type-options")).toBe("nosniff");

    // 3. Referrer-Policy
    expect(headersMap.get("referrer-policy")).toBe("strict-origin-when-cross-origin");

    // 4. X-Frame-Options (Clickjacking defense)
    expect(headersMap.get("x-frame-options")).toBe("DENY");

    // 5. Permissions-Policy (Camera & Geolocation allowed for QR scan/audit)
    expect(headersMap.has("permissions-policy")).toBe(true);
    const permPolicy = headersMap.get("permissions-policy")!;
    expect(permPolicy).toContain("camera=(self)");
    expect(permPolicy).toContain("geolocation=(self)");
  });
});
