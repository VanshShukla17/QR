import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";

describe("Phase 7 — Health Check & Uptime Monitoring Endpoints", () => {
  it("GET /api/v1/health returns 200 with services map and uptime metrics", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(["healthy", "degraded"]).toContain(res.body.status);
    expect(res.body).toHaveProperty("uptimeSeconds");
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(res.body).toHaveProperty("services");
    expect(res.body.services).toHaveProperty("api");
    expect(res.body.services.api.status).toBe("ok");
    expect(res.body.services).toHaveProperty("db");
    expect(res.body.services).toHaveProperty("gemini");
    expect(res.body.services).toHaveProperty("chain");
    expect(res.headers["x-uptime-seconds"]).toBeDefined();
  });

  it("GET /api/v1/health/live returns 200 with liveness indicator", async () => {
    const res = await request(app).get("/api/v1/health/live");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("alive");
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api/v1/health/ready returns 200 with readiness confirmation", async () => {
    const res = await request(app).get("/api/v1/health/ready");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.ready).toBe(true);
  });
});
