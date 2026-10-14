import type { NextFunction, Request, Response } from "express";

import { getSupabaseAdmin } from "../db/supabase.js";

export interface AuthUser {
  id: string;
  phone?: string;
  role: "merchant" | "admin" | string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Missing or invalid Authorization header",
      },
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Empty bearer token",
      },
    });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid or expired authentication token",
        },
      });
      return;
    }

    req.user = {
      id: data.user.id,
      phone: data.user.phone,
      role: (data.user.app_metadata?.role as string) || "merchant",
    };

    next();
  } catch {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to validate authentication credentials",
      },
    });
  }
}

export function requireRole(expectedRole: "merchant" | "admin") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      });
      return;
    }

    if (req.user.role !== expectedRole) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Requires role: ${expectedRole}`,
        },
      });
      return;
    }

    next();
  };
}
