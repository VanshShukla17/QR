import express, { type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as supabaseDb from "../db/supabase.js";
import { requireAuth, requireRole } from "./auth.js";

describe("Auth Middleware", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetUser = vi.fn();
    vi.spyOn(supabaseDb, "getSupabaseAdmin").mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    } as unknown as ReturnType<typeof supabaseDb.getSupabaseAdmin>);
  });

  const createTestApp = () => {
    const app = express();
    app.use(express.json());

    app.get("/protected", requireAuth, (req: Request, res: Response) => {
      res.status(200).json({ user: req.user });
    });

    app.get(
      "/admin-only",
      requireAuth,
      requireRole("admin"),
      (req: Request, res: Response) => {
        res.status(200).json({ message: "admin-access", user: req.user });
      }
    );

    return app;
  };

  it("returns 401 if Authorization header is missing", async () => {
    const app = createTestApp();
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 if Authorization header is not Bearer", async () => {
    const app = createTestApp();
    const res = await request(app).get("/protected").set("Authorization", "Basic 12345");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 if token is invalid or expired", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid JWT" },
    });

    const app = createTestApp();
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("allows request and sets req.user for valid token", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "merchant-uuid-123",
          phone: "+919876543210",
          app_metadata: { role: "merchant" },
        },
      },
      error: null,
    });

    const app = createTestApp();
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: "merchant-uuid-123",
      phone: "+919876543210",
      role: "merchant",
    });
  });

  it("rejects non-admin from admin-only route with 403 FORBIDDEN", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "merchant-uuid-123",
          phone: "+919876543210",
          app_metadata: { role: "merchant" },
        },
      },
      error: null,
    });

    const app = createTestApp();
    const res = await request(app)
      .get("/admin-only")
      .set("Authorization", "Bearer merchant-token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows admin user to access admin-only route", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "admin-uuid-456",
          phone: "+919999999999",
          app_metadata: { role: "admin" },
        },
      },
      error: null,
    });

    const app = createTestApp();
    const res = await request(app)
      .get("/admin-only")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("admin-access");
    expect(res.body.user.role).toBe("admin");
  });
});
