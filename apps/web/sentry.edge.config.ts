import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const ENVIRONMENT =
  process.env.VERCEL_ENV || process.env.SENTRY_ENVIRONMENT || "development";

if (SENTRY_DSN && !SENTRY_DSN.includes("placeholder")) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: ENVIRONMENT === "production" ? 0.2 : 1.0,
  });
}
