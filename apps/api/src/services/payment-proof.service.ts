import crypto from "crypto";

export interface PaymentProofSimulationOptions {
  simulationPassed?: boolean;
  amountInr?: number;
}

export interface PaymentProofVerification {
  verified: boolean;
  transactionRef: string;
  amountInr: number;
  timestamp: string;
  message: string;
}

/**
 * Service handling proof-of-possession micro-transactions.
 * Isolated behind a single clearly-named service so swapping in a real payment
 * integration later touches one file, per PRD.md Section 4 & TASKS.md Task 5.
 */
export class PaymentProofService {
  /**
   * Executes proof-of-possession micro-transaction verification.
   * MOCKED for MVP: Simulates ₹1 transfer to the registering VPA.
   */
  async verifyVpaPossession(
    vpa?: string,
    options: PaymentProofSimulationOptions = {}
  ): Promise<PaymentProofVerification> {
    const passed = options.simulationPassed !== false;
    const amountInr = options.amountInr ?? 1.0;
    const timestamp = new Date().toISOString();
    const transactionRef = `POP-SIM-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    if (!passed) {
      return {
        verified: false,
        transactionRef,
        amountInr,
        timestamp,
        message: `Simulated proof-of-possession rejected for VPA: ${vpa || "unspecified"}.`,
      };
    }

    return {
      verified: true,
      transactionRef,
      amountInr,
      timestamp,
      message: `Simulated proof-of-possession confirmed: ₹${amountInr.toFixed(2)} verification successful for VPA.`,
    };
  }
}

export const paymentProofService = new PaymentProofService();
