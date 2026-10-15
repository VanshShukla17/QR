import dotenv from "dotenv";
dotenv.config();

import { supabaseAdmin, isSupabaseConfigured } from "../db/client.js";

const DEMO_MERCHANT_ID = "550e8400-e29b-41d4-a716-446655440000";

async function verifyConsistency() {
  console.log("=================================================");
  console.log("🔍 QRaksha — Merchant Stats Consistency Check");
  console.log("=================================================");

  if (!isSupabaseConfigured()) {
    console.error(
      "❌ Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const merchantId = process.argv[2] || DEMO_MERCHANT_ID;
  console.log(`Checking consistency for merchant: ${merchantId}\n`);

  // 1. Fetch via canonical RPC / SQL function
  const { data: rpcStats, error: rpcErr } = await supabaseAdmin.rpc(
    "get_merchant_stats",
    {
      p_merchant_id: merchantId,
    }
  );

  if (rpcErr) {
    console.error("❌ Error executing RPC get_merchant_stats:", rpcErr);
    process.exit(1);
  }

  const fnResult = Array.isArray(rpcStats) ? rpcStats[0] : rpcStats;
  if (!fnResult) {
    console.error("❌ No stats returned from RPC get_merchant_stats");
    process.exit(1);
  }

  // 2. Compute exact raw DB counts directly
  // 2a. Active QRs: registered_qr rows whose credential belongs to this merchant and has status 'active'
  const { data: creds, error: credErr } = await supabaseAdmin
    .schema("comparison")
    .from("merchant_credential")
    .select("id, status")
    .eq("merchant_id", merchantId);

  if (credErr) {
    console.error("❌ Error querying merchant credentials:", credErr);
    process.exit(1);
  }

  const activeCredIds = (creds || [])
    .filter((c) => c.status === "active")
    .map((c) => c.id);
  const allCredIds = (creds || []).map((c) => c.id);

  let rawActiveQrs = 0;
  if (activeCredIds.length > 0) {
    const { count, error: qrErr } = await supabaseAdmin
      .schema("comparison")
      .from("registered_qr")
      .select("id", { count: "exact", head: true })
      .in("credential_id", activeCredIds);

    if (qrErr) {
      console.error("❌ Error counting registered_qr:", qrErr);
      process.exit(1);
    }
    rawActiveQrs = count || 0;
  }

  // 2b. Clean Audits: audit_run rows for this merchant's credential with verdict_reason = 'OK'
  let rawCleanAudits = 0;
  let rawTotalAudits = 0;
  let rawFlaggedAudits = 0;

  if (allCredIds.length > 0) {
    const { count: cleanCount, error: cleanErr } = await supabaseAdmin
      .schema("comparison")
      .from("audit_run")
      .select("id", { count: "exact", head: true })
      .in("credential_id", allCredIds)
      .eq("verdict_reason", "OK");

    if (cleanErr) {
      console.error("❌ Error counting clean audits:", cleanErr);
      process.exit(1);
    }
    rawCleanAudits = cleanCount || 0;

    const { count: totalCount, error: totalErr } = await supabaseAdmin
      .schema("comparison")
      .from("audit_run")
      .select("id", { count: "exact", head: true })
      .in("credential_id", allCredIds);

    if (totalErr) {
      console.error("❌ Error counting total audits:", totalErr);
      process.exit(1);
    }
    rawTotalAudits = totalCount || 0;

    const { count: flaggedCount, error: flaggedErr } = await supabaseAdmin
      .schema("comparison")
      .from("audit_run")
      .select("id", { count: "exact", head: true })
      .in("credential_id", allCredIds)
      .eq("verdict", "WARNING");

    if (flaggedErr) {
      console.error("❌ Error counting flagged audits:", flaggedErr);
      process.exit(1);
    }
    rawFlaggedAudits = flaggedCount || 0;
  }

  // 3. Comparison Report
  console.log("Metric             | SQL Function | Raw DB Count | Match?");
  console.log("-------------------|--------------|--------------|-------");
  const checkMetric = (name: string, fnVal: number, rawVal: number) => {
    const matches = Number(fnVal) === Number(rawVal);
    const matchIcon = matches ? "✅ PASS" : "❌ FAIL";
    console.log(
      `${name.padEnd(18)} | ${String(fnVal).padEnd(12)} | ${String(rawVal).padEnd(12)} | ${matchIcon}`
    );
    return matches;
  };

  const m1 = checkMetric("active_qrs", fnResult.active_qrs, rawActiveQrs);
  const m2 = checkMetric("clean_audits", fnResult.clean_audits, rawCleanAudits);
  const m3 = checkMetric("total_audits", fnResult.total_audits, rawTotalAudits);
  const m4 = checkMetric("flagged_audits", fnResult.flagged_audits, rawFlaggedAudits);

  if (m1 && m2 && m3 && m4) {
    console.log("\n✅ ALL METRICS ARE 100% CONSISTENT WITH DATABASE GROUND TRUTH.");
    process.exit(0);
  } else {
    console.error("\n❌ DISCREPANCY DETECTED BETWEEN SQL FUNCTION AND RAW DB TABLES.");
    process.exit(1);
  }
}

verifyConsistency().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
