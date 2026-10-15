import { describe, expect, it, vi } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { adminService } from "../services/admin.service.js";

describe("Phase 4 — Admin Authorization Protection (/admin/*)", () => {
  const adminEndpoints = [
    {
      name: "GET /api/v1/admin/disputes",
      method: "get" as const,
      url: "/api/v1/admin/disputes",
      body: undefined,
    },
    {
      name: "PATCH /api/v1/admin/disputes/:id",
      method: "patch" as const,
      url: "/api/v1/admin/disputes/660e8400-e29b-41d4-a716-446655440001",
      body: {
        status: "resolved_upheld",
        resolutionReason: "Verified physical sticker replacement during investigation.",
      },
    },
    {
      name: "GET /api/v1/admin/credentials",
      method: "get" as const,
      url: "/api/v1/admin/credentials",
      body: undefined,
    },
    {
      name: "POST /api/v1/admin/registry/seed",
      method: "post" as const,
      url: "/api/v1/admin/registry/seed",
      body: {},
    },
  ];

  describe("Rejection of non-admin (merchant) callers on all admin routes", () => {
    adminEndpoints.forEach(({ name, method, url, body }) => {
      it(`CONFIRMS non-admin JWT is rejected with 403 FORBIDDEN on ${name}`, async () => {
        const req = request(app)[method](url);
        req.set("Authorization", "Bearer mock-merchant-token");
        if (body) {
          req.send(body);
        }

        const res = await req;

        expect(res.status).toBe(403);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe("FORBIDDEN");
        expect(res.body.error.message).toBe("Admin privileges required");
      });
    });
  });

  describe("Rejection of unauthenticated callers on all admin routes", () => {
    adminEndpoints.forEach(({ name, method, url, body }) => {
      it(`CONFIRMS unauthenticated request is rejected with 401 UNAUTHENTICATED on ${name}`, async () => {
        const req = request(app)[method](url);
        if (body) {
          req.send(body);
        }

        const res = await req;

        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe("UNAUTHENTICATED");
      });
    });
  });

  describe("Rejection of spoofed headers without valid admin token", () => {
    adminEndpoints.forEach(({ name, method, url, body }) => {
      it(`CONFIRMS spoofed x-admin-role header cannot bypass authorization on ${name}`, async () => {
        const req = request(app)[method](url);
        req.set("x-admin-role", "admin");
        if (body) {
          req.send(body);
        }

        const res = await req;

        // Must still be rejected because client-supplied headers are not trusted
        expect([401, 403]).toContain(res.status);
        expect(res.body.error).toBeDefined();
      });
    });
  });

  describe("Rejection of malformed / invalid bearer tokens", () => {
    adminEndpoints.forEach(({ name, method, url, body }) => {
      it(`CONFIRMS invalid bearer token is rejected with 401 UNAUTHENTICATED on ${name}`, async () => {
        const req = request(app)[method](url);
        req.set("Authorization", "Bearer invalid-tampered-token");
        if (body) {
          req.send(body);
        }

        const res = await req;

        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe("UNAUTHENTICATED");
      });
    });
  });

  describe("Allowing authentic admin JWT callers", () => {
    it("allows valid admin JWT on GET /api/v1/admin/disputes", async () => {
      const listSpy = vi.spyOn(adminService, "listDisputes").mockResolvedValueOnce({
        disputes: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const res = await request(app)
        .get("/api/v1/admin/disputes")
        .set("Authorization", "Bearer mock-admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data.disputes).toEqual([]);
      expect(listSpy).toHaveBeenCalled();
    });

    it("allows valid admin JWT on GET /api/v1/admin/credentials", async () => {
      const listCredsSpy = vi
        .spyOn(adminService, "listCredentials")
        .mockResolvedValueOnce({
          credentials: [],
          total: 0,
          page: 1,
          limit: 20,
        });

      const res = await request(app)
        .get("/api/v1/admin/credentials")
        .set("Authorization", "Bearer mock-admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data.credentials).toEqual([]);
      expect(listCredsSpy).toHaveBeenCalled();
    });
  });
});
