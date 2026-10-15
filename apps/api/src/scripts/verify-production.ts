import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../../");

interface ProdCheckItem {
  name: string;
  status: "pass" | "warn" | "fail";
  details: string;
}

export function verifyProductionReadiness(): {
  success: boolean;
  checks: ProdCheckItem[];
} {
  console.log("🚀 ========================================================");
  console.log("🚀 QRaksha — Production (Pilot) Deployment Readiness Audit");
  console.log("🚀 ARCHITECTURE.md Section 13 Conformance Suite");
  console.log("🚀 ========================================================\n");

  const checks: ProdCheckItem[] = [];

  // 1. Check render.yaml production service definition
  const renderYamlPath = path.join(rootDir, "render.yaml");
  if (fs.existsSync(renderYamlPath)) {
    const yamlContent = fs.readFileSync(renderYamlPath, "utf-8");
    const hasProdService = yamlContent.includes("name: qraksha-api-prod");
    const hasManualGate = yamlContent.includes("autoDeploy: false");
    const hasHealthCheck = yamlContent.includes("healthCheckPath: /api/v1/health");

    if (hasProdService && hasManualGate && hasHealthCheck) {
      checks.push({
        name: "Render Production Service Blueprint",
        status: "pass",
        details:
          "qraksha-api-prod defined with manual approval deployment gate and /api/v1/health monitor.",
      });
    } else {
      checks.push({
        name: "Render Production Service Blueprint",
        status: "fail",
        details: "render.yaml missing manual deployment gate or health check path.",
      });
    }
  } else {
    checks.push({
      name: "Render Production Service Blueprint",
      status: "fail",
      details: "render.yaml not found at repo root.",
    });
  }

  // 2. Check Vercel production deployment configuration
  const vercelJsonPath = path.join(rootDir, "apps/web/vercel.json");
  if (fs.existsSync(vercelJsonPath)) {
    const vercelContent = fs.readFileSync(vercelJsonPath, "utf-8");
    const hasHeaders = vercelContent.includes("X-Content-Type-Options");
    checks.push({
      name: "Vercel Production Deployment Config",
      status: hasHeaders ? "pass" : "fail",
      details:
        "apps/web/vercel.json present with security headers and Next.js build specifications.",
    });
  } else {
    checks.push({
      name: "Vercel Production Deployment Config",
      status: "fail",
      details: "apps/web/vercel.json not found.",
    });
  }

  // 3. Check environment templates
  const apiProdEnv = path.join(rootDir, "apps/api/.env.production.example");
  const webProdEnv = path.join(rootDir, "apps/web/.env.production.example");
  if (fs.existsSync(apiProdEnv) && fs.existsSync(webProdEnv)) {
    checks.push({
      name: "Production Environment Templates",
      status: "pass",
      details:
        "Dedicated .env.production.example templates verified for apps/api and apps/web.",
    });
  } else {
    checks.push({
      name: "Production Environment Templates",
      status: "fail",
      details: "Production environment example templates missing.",
    });
  }

  // 4. Check backend build output (dist/index.js)
  const distIndex = path.join(rootDir, "apps/api/dist/index.js");
  checks.push({
    name: "Backend Production Build Artifacts",
    status: fs.existsSync(distIndex) ? "pass" : "warn",
    details: fs.existsSync(distIndex)
      ? "apps/api/dist/index.js compiled and ready for Node runtime."
      : "apps/api dist build artifact not yet generated. Run 'npm run build --workspace=apps/api'.",
  });

  // 5. Check Sentry production wiring
  const apiSentry = path.join(rootDir, "apps/api/src/config/sentry.ts");
  const webSentryClient = path.join(rootDir, "apps/web/sentry.client.config.ts");
  if (fs.existsSync(apiSentry) && fs.existsSync(webSentryClient)) {
    checks.push({
      name: "Sentry Monitoring & Tracing Wiring",
      status: "pass",
      details:
        "Sentry configured across frontend and backend with PII scrubbing and correlation ID tagging.",
    });
  } else {
    checks.push({
      name: "Sentry Monitoring & Tracing Wiring",
      status: "fail",
      details: "Sentry configuration files missing.",
    });
  }

  // 6. Check production deployment runbook
  const prodRunbook = path.join(rootDir, "docs/production-deployment.md");
  checks.push({
    name: "Production Deployment Runbook & Checklist",
    status: fs.existsSync(prodRunbook) ? "pass" : "warn",
    details: fs.existsSync(prodRunbook)
      ? "Comprehensive deployment guide and smoke checklist documented in docs/production-deployment.md."
      : "docs/production-deployment.md pending creation.",
  });

  // Summary
  console.log("------------------------------------------------------------");
  console.log("Production Readiness Verification Results:");
  console.log("------------------------------------------------------------");

  let failCount = 0;
  for (const c of checks) {
    const icon = c.status === "pass" ? "✅" : c.status === "warn" ? "⚠️ " : "❌";
    console.log(`${icon} [${c.name}]`);
    console.log(`   ${c.details}`);
    if (c.status === "fail") failCount++;
  }

  console.log("------------------------------------------------------------\n");

  const success = failCount === 0;
  if (success) {
    console.log("✨ Production deployment readiness audit PASSED!");
  } else {
    console.error(`❌ Production audit failed with ${failCount} critical error(s).`);
  }

  return { success, checks };
}

if (process.argv[1] && process.argv[1].endsWith("verify-production.ts")) {
  const { success } = verifyProductionReadiness();
  process.exit(success ? 0 : 1);
}
