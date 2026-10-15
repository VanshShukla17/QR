# Uptime Monitoring & Health Check Operational Guide

This document describes the configuration and integration of QRaksha's health-check endpoints with hosting platform probes and external uptime monitors, fulfilling **`ARCHITECTURE.md` Section 12 & 13**.

---

## 1. Health Endpoints Architecture

QRaksha exposes three specialized health endpoints under `/api/v1/health`:

| Endpoint                   | Purpose                                                             | Target Consumer                                                                     | SLA / Timeout                            |
| -------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| `GET /api/v1/health`       | Overall system & dependency status (`api`, `db`, `gemini`, `chain`) | Hosting platforms (Render, Railway), External Monitors (Better Uptime, UptimeRobot) | < 50ms (standard), < 2.5s (`?deep=true`) |
| `GET /api/v1/health/live`  | Process liveness probe (verifies event loop is not blocked)         | Container orchestrators, restart monitors                                           | < 5ms                                    |
| `GET /api/v1/health/ready` | Service readiness probe (traffic routing gate)                      | Load balancers, deployment cutover gates                                            | < 20ms                                   |

---

## 2. Response Shape (`GET /api/v1/health`)

```json
{
  "status": "healthy",
  "timestamp": "2026-10-11T12:00:00.000Z",
  "uptimeSeconds": 1420,
  "environment": "staging",
  "version": "0.1.0",
  "services": {
    "api": {
      "status": "ok",
      "latencyMs": 0
    },
    "db": {
      "status": "ok",
      "message": "Supabase configured"
    },
    "gemini": {
      "status": "ok",
      "message": "AI reasoning API ready"
    },
    "chain": {
      "status": "ok",
      "message": "Polygon Amoy RPC configured"
    }
  }
}
```

### Degraded Mode Handling

Per **`ARCHITECTURE.md` Section 10**, if an external dependency (such as Polygon Amoy testnet RPC or Google Gemini) encounters transient network limits, QRaksha falls back to degraded reasoning mode or in-process queue retry. In this state:

- Overall status is marked `"degraded"`.
- HTTP status code remains `200 OK` so external uptime monitors do not generate false-positive total outages while merchant self-audit remains functional.

---

## 3. Hosting Platform Configuration (Render)

Render health monitoring is configured in [`render.yaml`](../render.yaml):

```yaml
services:
  - type: web
    name: qraksha-api-staging
    healthCheckPath: /api/v1/health
    ...
  - type: web
    name: qraksha-api-prod
    healthCheckPath: /api/v1/health
```

Render pings `/api/v1/health` every 10 seconds. If 3 consecutive checks fail with a non-2xx status, Render restarts the instance or alerts administrators.

---

## 4. External Uptime Monitor Setup (Better Uptime / UptimeRobot)

1. **Monitor Type:** HTTP(S) Monitor
2. **Monitor URL:**
   - Staging: `https://qraksha-api-staging.onrender.com/api/v1/health`
   - Production: `https://qraksha-api-prod.onrender.com/api/v1/health`
3. **Check Frequency:** Every 60 seconds
4. **Keyword Assertion:** `"status": "healthy"` or `"status": "degraded"`
5. **Request Timeout:** 10 seconds
6. **Alert Threshold:** 2 consecutive failures triggers P1 incident on-call notification
7. **Latency Alert:** p95 latency > 2,000ms triggers performance alert
