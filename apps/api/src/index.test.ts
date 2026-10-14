import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "./index.js";

describe("GET /api/v1/health", () => {
  it("returns 200 with status ok and supported verdicts", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.supportedVerdicts).toEqual([
      "VERIFIED",
      "RECENTLY_REGISTERED",
      "WARNING",
    ]);
    expect(typeof res.body.timestamp).toBe("string");
  });
});
