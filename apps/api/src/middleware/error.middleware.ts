import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Missing or invalid authorization", details?: unknown) {
    super(message, 401, "UNAUTHENTICATED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied", details?: unknown) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = "Verification service temporarily unavailable",
    details?: unknown
  ) {
    super(message, 503, "SERVICE_UNAVAILABLE", details);
  }
}

import { logger } from "./logger.middleware.js";
import { captureSentryException } from "../config/sentry.js";

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = req.correlationId || crypto.randomUUID();
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  // Structured log with correlation ID, never logging PII or raw secrets
  logger.error(err.message, correlationId, {
    type: "unhandled_or_app_error",
    code,
    statusCode,
  });

  // Capture in Sentry if unhandled or internal error
  if (statusCode >= 500) {
    captureSentryException(err, {
      correlationId,
      code,
      path: req.path,
      method: req.method,
    });
  }

  if (statusCode === 500) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        correlationId,
      },
    });
    return;
  }

  res.status(statusCode).json({
    error: {
      code,
      message: err.message,
      details: err.details,
      correlationId,
    },
  });
}
