import dotenv from "dotenv";
dotenv.config();

import { adminService } from "../services/admin.service.js";

async function main() {
  console.log("🌱 QRaksha — Seeding Demo Merchant Registry…");
  try {
    const result = await adminService.seedDemoRegistry();
    console.log(`✅ ${result.message}`);
    console.log(`📋 Seeded ${result.seededCount} merchants:`);
    for (const m of result.merchants) {
      console.log(
        `   - ${m.name} | Tier: ${m.trustTier} | Status: ${m.status} | ID: ${m.credentialId}`
      );
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to seed demo registry:", err);
    process.exit(1);
  }
}

main();
