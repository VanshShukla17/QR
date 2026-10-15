import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";

interface CheckResult {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  details?: Record<string, unknown>;
}

async function verifyStagingEnvironment(): Promise<void> {
  console.log("🔍 ========================================================");
  console.log("🔍 QRaksha — Staging Environment Readiness Verification");
  console.log("🔍 ARCHITECTURE.md Section 13 Conformance Check");
  console.log("🔍 ========================================================\n");

  const results: CheckResult[] = [];

  // 1. Environment and Basic Configuration
  const nodeEnv = process.env.NODE_ENV || "development";
  const port = process.env.PORT || "4000";
  const corsOrigin = process.env.CORS_ORIGIN || "";

  results.push({
    name: "Server Configuration",
    status: "pass",
    message: `NODE_ENV: ${nodeEnv}, PORT: ${port}, CORS_ORIGIN: ${corsOrigin || "(default localhost)"}`,
  });

  // 2. Supabase Configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    results.push({
      name: "Supabase Staging Database",
      status: "warn",
      message:
        "SUPABASE_URL is unconfigured or using placeholder. In-memory demo/mock mode active.",
    });
  } else if (!serviceKey) {
    results.push({
      name: "Supabase Staging Database",
      status: "fail",
      message: "SUPABASE_URL is configured but SUPABASE_SERVICE_ROLE_KEY is missing.",
    });
  } else {
    try {
      // Ping Supabase REST root
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (res.ok || res.status === 200 || res.status === 404) {
        results.push({
          name: "Supabase Staging Database",
          status: "pass",
          message: `Connected successfully to Supabase endpoint (${supabaseUrl})`,
        });
      } else {
        results.push({
          name: "Supabase Staging Database",
          status: "warn",
          message: `Supabase returned HTTP status ${res.status}`,
        });
      }
    } catch (err: unknown) {
      results.push({
        name: "Supabase Staging Database",
        status: "warn",
        message: `Network ping to Supabase failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // 3. Google Gemini API Key
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "your-gemini-api-key") {
    results.push({
      name: "Google Gemini Vision/Reasoning API",
      status: "warn",
      message:
        "GEMINI_API_KEY is not set or using placeholder. Degraded-mode fallback active.",
    });
  } else {
    results.push({
      name: "Google Gemini Vision/Reasoning API",
      status: "pass",
      message: "GEMINI_API_KEY is set and ready for agent orchestration.",
    });
  }

  // 4. Blockchain Testnet RPC & Wallet
  const rpcUrl = process.env.CHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
  const chainNetwork = process.env.CHAIN_NETWORK || "amoy";
  const privateKey = process.env.CHAIN_PRIVATE_KEY;

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    let walletMsg = "No private key configured (simulated anchoring active).";
    if (privateKey && privateKey.startsWith("0x") && privateKey.length === 66) {
      const wallet = new ethers.Wallet(privateKey, provider);
      const balance = await provider.getBalance(wallet.address);
      const balancePol = ethers.formatEther(balance);
      walletMsg = `Wallet ${wallet.address} balance: ${balancePol} POL`;
    }

    results.push({
      name: "Blockchain Testnet (Polygon Amoy / Sepolia)",
      status: "pass",
      message: `RPC verified on ${chainNetwork} (${rpcUrl}). ChainId: ${network.chainId}, Latest Block: ${blockNumber}. ${walletMsg}`,
      details: { chainId: network.chainId.toString(), blockNumber },
    });
  } catch (err: unknown) {
    results.push({
      name: "Blockchain Testnet (Polygon Amoy / Sepolia)",
      status: "warn",
      message: `RPC endpoint check (${rpcUrl}) had network exception: ${err instanceof Error ? err.message : String(err)}. Simulated anchor fallback active.`,
    });
  }

  // 5. Sentry Monitoring
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    results.push({
      name: "Sentry Monitoring & Error Tracking",
      status: "pass",
      message: `Sentry DSN configured for environment '${process.env.SENTRY_ENVIRONMENT || nodeEnv}'.`,
    });
  } else {
    results.push({
      name: "Sentry Monitoring & Error Tracking",
      status: "warn",
      message: "SENTRY_DSN not set. Sentry tracing will remain inert in this process.",
    });
  }

  // Summary Table
  console.log("------------------------------------------------------------");
  console.log("Staging Readiness Status Checklist:");
  console.log("------------------------------------------------------------");

  let failCount = 0;
  for (const r of results) {
    const icon = r.status === "pass" ? "✅" : r.status === "warn" ? "⚠️ " : "❌";
    console.log(`${icon} [${r.name}]`);
    console.log(`   ${r.message}`);
    if (r.status === "fail") failCount++;
  }

  console.log("------------------------------------------------------------\n");

  if (failCount > 0) {
    console.error(`❌ Staging verification failed with ${failCount} critical error(s).`);
    process.exit(1);
  } else {
    console.log("✨ Staging environment checklist completed successfully!");
    process.exit(0);
  }
}

verifyStagingEnvironment().catch((err) => {
  console.error("Fatal error during staging verification:", err);
  process.exit(1);
});
