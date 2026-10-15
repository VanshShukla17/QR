import { describe, it, expect } from "vitest";
import { runPerformanceBenchmark } from "../scripts/benchmark-performance.js";

describe("Phase 7 — Performance Benchmarking Suite (ARCHITECTURE.md Section 11)", () => {
  it("satisfies all MVP latency targets (<3s verdict p95, <2s history p95, <200ms DB lookup p95)", async () => {
    const { allPassed, metrics } = await runPerformanceBenchmark();

    expect(metrics.length).toBe(3);
    for (const m of metrics) {
      expect(m.passed).toBe(true);
      expect(m.measuredP95Ms).toBeLessThanOrEqual(m.targetMaxMs);
    }
    expect(allPassed).toBe(true);
  }, 30000);
});
