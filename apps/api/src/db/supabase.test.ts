import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _resetSupabaseAdminForTesting, getSupabaseAdmin } from "./supabase.js";

describe("Supabase Admin Client", () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    _resetSupabaseAdminForTesting();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    _resetSupabaseAdminForTesting();
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("throws error when environment variables are missing", () => {
    expect(() => getSupabaseAdmin()).toThrow(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  });

  it("creates a client instance when environment variables are set", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-role-key";

    const client = getSupabaseAdmin();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });
});
