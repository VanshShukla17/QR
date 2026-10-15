import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT =
  process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.SENTRY_ENVIRONMENT || "development";

if (SENTRY_DSN && !SENTRY_DSN.includes("placeholder")) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: ENVIRONMENT === "production" ? 0.2 : 1.0,
    beforeSend(event) {
      // Redact sensitive local data from client error events
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
}
