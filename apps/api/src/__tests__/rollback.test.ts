import { describe, it, expect } from "vitest";
import { executeRollbackRehearsal } from "../scripts/rehearse-rollback.js";

describe("Phase 7 — Rollback Procedure Rehearsal (ARCHITECTURE.md Section 13)", () => {
  it("executes simulated rollback procedure within target RTO (<90s) with 100% passing steps", async () => {
    const { success, totalDurationMs, steps } = await executeRollbackRehearsal();

    expect(success).toBe(true);
    expect(totalDurationMs).toBeLessThan(90000); // Target RTO < 90s
    expect(steps.length).toBe(6);

    for (const step of steps) {
      expect(step.status).toBe("pass");
    }
  });
});
