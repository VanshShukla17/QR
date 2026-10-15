import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  registerIdentity,
  registerReference,
  confirmProofOfPossession,
  getCredentialVerification,
  ApiError,
} from "../lib/api.js";
import {
  RegisterIdentityInput,
  RegisterReferenceInput,
  ProofOfPossessionInput,
} from "@qraksha/shared";

describe("Web API Client — registerIdentity", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("successfully registers GST/Udyam identity", async () => {
    const mockResult = {
      merchantId: "550e8400-e29b-41d4-a716-446655440000",
      displayName: "Sharma Canteen",
      identityTier: "gst_verified" as const,
      contactPhone: "+919876543210",
      kycAddress: "Shop 12, Main Market",
      identityId: "660e8400-e29b-41d4-a716-446655440001",
      otpConfirmed: true,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: mockResult }),
    } as unknown as Response);

    const input: RegisterIdentityInput = {
      type: "gst_udyam",
      displayName: "Sharma Canteen",
      contactPhone: "+919876543210",
      gstUdyamNumber: "29ABCDE1234F1Z5",
      kycAddress: "Shop 12, Main Market",
      otp: "123456",
    };

    const result = await registerIdentity(input);

    expect(result).toEqual(mockResult);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/merchants/register/identity"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  });

  it("successfully registers penny_drop identity", async () => {
    const mockResult = {
      merchantId: "770e8400-e29b-41d4-a716-446655440000",
      displayName: "Fresh Bites Stall",
      identityTier: "baseline" as const,
      contactPhone: "+919876543211",
      kycAddress: "Cart 4, Sector 14 Food Street",
      identityId: "880e8400-e29b-41d4-a716-446655440001",
      otpConfirmed: true,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: mockResult }),
    } as unknown as Response);

    const input: RegisterIdentityInput = {
      type: "penny_drop",
      displayName: "Fresh Bites Stall",
      contactPhone: "+919876543211",
      bankVpa: "freshbites@upi",
      kycAddress: "Cart 4, Sector 14 Food Street",
    };

    const result = await registerIdentity(input);

    expect(result).toEqual(mockResult);
    expect(result.identityTier).toBe("baseline");
  });

  it("throws ApiError on 409 duplicate GST conflict with disputePointer", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          code: "CONFLICT",
          message:
            "This GST/Udyam number is already registered to an existing merchant credential.",
          details: { disputePointer: "/credential/dispute/new" },
        },
      }),
    } as unknown as Response);

    const input: RegisterIdentityInput = {
      type: "gst_udyam",
      displayName: "Sharma Canteen",
      contactPhone: "+919876543210",
      gstUdyamNumber: "29ABCDE1234F1Z5",
      kycAddress: "Shop 12, Main Market",
      otp: "123456",
    };

    await expect(registerIdentity(input)).rejects.toThrow(ApiError);

    try {
      await registerIdentity(input);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(409);
      expect(apiErr.code).toBe("CONFLICT");
      expect(apiErr.details).toEqual({ disputePointer: "/credential/dispute/new" });
    }
  });

  it("throws ApiError with NETWORK_ERROR when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    const input: RegisterIdentityInput = {
      type: "penny_drop",
      displayName: "Test Store",
      contactPhone: "+919876543210",
      bankVpa: "test@upi",
      kycAddress: "123 Main Street",
    };

    try {
      await registerIdentity(input);
      expect.fail("Should have thrown ApiError");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("NETWORK_ERROR");
      expect(apiErr.statusCode).toBe(0);
      expect(apiErr.message).toContain("Unable to connect to QRaksha server");
    }
  });
});

describe("Web API Client — registerReference (Task 4 Unit Tests)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("successfully calls POST /merchants/register/reference and returns RegisterReferenceResult", async () => {
    const mockReferenceResult = {
      credentialId: "cred-1234-5678",
      merchantId: "550e8400-e29b-41d4-a716-446655440000",
      registeredQrId: "qr-1234-5678",
      status: "pending_activation" as const,
      trustTier: "unverified" as const,
      locationVariance: false,
      qrPayloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      boundLocation: {
        latitude: 28.4595,
        longitude: 77.0266,
        boundRadiusM: 100,
      },
      embeddingDimension: 768,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: mockReferenceResult }),
    } as unknown as Response);

    const input: RegisterReferenceInput = {
      merchantId: "550e8400-e29b-41d4-a716-446655440000",
      qrPayload: "upi://pay?pa=merchant@upi&pn=Store&cu=INR",
      latitude: 28.4595,
      longitude: 77.0266,
      boundRadiusM: 100,
      photoBase64: "data:image/jpeg;base64,dGVzdF9waG90b19ieXRlcw==",
    };

    const result = await registerReference(input);

    expect(result).toEqual(mockReferenceResult);
    expect(result.status).toBe("pending_activation");
    expect(result.locationVariance).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/merchants/register/reference"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  });

  it("throws ApiError with CONFLICT on duplicate QR payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          code: "CONFLICT",
          message:
            "This QR payload is already registered to an existing merchant credential.",
          details: { disputePointer: "/credential/dispute/new" },
        },
      }),
    } as unknown as Response);

    const input: RegisterReferenceInput = {
      merchantId: "550e8400-e29b-41d4-a716-446655440000",
      qrPayload: "upi://pay?pa=duplicate@upi",
      latitude: 28.4595,
      longitude: 77.0266,
      boundRadiusM: 100,
      photoBase64: "data:image/jpeg;base64,dGVzdF9waG90b19ieXRlcw==",
    };

    await expect(registerReference(input)).rejects.toThrow(ApiError);

    try {
      await registerReference(input);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(409);
      expect(apiErr.code).toBe("CONFLICT");
      expect(apiErr.details).toEqual({ disputePointer: "/credential/dispute/new" });
    }
  });

  it("throws ApiError with NETWORK_ERROR when reference registration fails to connect", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failed"));

    const input: RegisterReferenceInput = {
      merchantId: "550e8400-e29b-41d4-a716-446655440000",
      qrPayload: "upi://pay?pa=test@upi",
      latitude: 28.4595,
      longitude: 77.0266,
      boundRadiusM: 100,
      photoBase64: "data:image/jpeg;base64,dGVzdF9waG90b19ieXRlcw==",
    };

    try {
      await registerReference(input);
      expect.fail("Should have thrown ApiError");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("NETWORK_ERROR");
      expect(apiErr.statusCode).toBe(0);
      expect(apiErr.message).toContain("Unable to connect to QRaksha server");
    }
  });
});

describe("Web API Client — confirmProofOfPossession", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("successfully confirms proof-of-possession and transitions to recently_registered", async () => {
    const mockResult = {
      credentialId: "550e8400-e29b-41d4-a716-446655440000",
      status: "recently_registered" as const,
      verifiedAt: new Date().toISOString(),
      amountInr: 1.0,
      simulationPassed: true,
      message: "Simulated proof-of-possession confirmed: ₹1.00 verification successful.",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockResult }),
    } as unknown as Response);

    const input: ProofOfPossessionInput = {
      credentialId: "550e8400-e29b-41d4-a716-446655440000",
      simulationPassed: true,
    };

    const result = await confirmProofOfPossession(input);

    expect(result).toEqual(mockResult);
    expect(result.status).toBe("recently_registered");
    expect(result.simulationPassed).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/merchants/register/proof-of-possession"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  });

  it("handles simulated rejection retaining pending_activation status", async () => {
    const mockResult = {
      credentialId: "550e8400-e29b-41d4-a716-446655440000",
      status: "pending_activation" as const,
      verifiedAt: new Date().toISOString(),
      amountInr: 1.0,
      simulationPassed: false,
      message: "Simulated proof-of-possession rejected.",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockResult }),
    } as unknown as Response);

    const input: ProofOfPossessionInput = {
      credentialId: "550e8400-e29b-41d4-a716-446655440000",
      simulationPassed: false,
    };

    const result = await confirmProofOfPossession(input);

    expect(result.status).toBe("pending_activation");
    expect(result.simulationPassed).toBe(false);
  });

  it("throws ApiError with NETWORK_ERROR when connection fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failed"));

    const input: ProofOfPossessionInput = {
      credentialId: "550e8400-e29b-41d4-a716-446655440000",
      simulationPassed: true,
    };

    try {
      await confirmProofOfPossession(input);
      expect.fail("Should have thrown ApiError");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("NETWORK_ERROR");
      expect(apiErr.statusCode).toBe(0);
      expect(apiErr.message).toContain("Unable to connect to QRaksha server");
    }
  });
});

describe("Web API Client — getCredentialVerification", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("successfully retrieves credential verification record with anchor", async () => {
    const mockResult = {
      credentialId: "550e8400-e29b-41d4-a716-446655440000",
      merchantId: "660e8400-e29b-41d4-a716-446655440001",
      displayName: "Sharma Canteen",
      status: "recently_registered" as const,
      trustTier: "unverified" as const,
      trustScore: 10,
      activatedAt: "2026-09-30T10:00:00.000Z",
      canonicalCredentialHash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      anchor: {
        id: "anc-1",
        credentialId: "550e8400-e29b-41d4-a716-446655440000",
        txHash: "0x8f3c7a2b9e1d4c5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
        network: "amoy",
        status: "confirmed" as const,
        credentialHash:
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        attempts: 1,
        submittedAt: "2026-09-30T10:00:00.000Z",
        confirmedAt: "2026-09-30T10:00:05.000Z",
        explorerUrl: "https://amoy.polygonscan.com/tx/0x8f3c7a2b...",
      },
      verifiedOnChain: true,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockResult }),
    } as unknown as Response);

    const result = await getCredentialVerification(
      "550e8400-e29b-41d4-a716-446655440000"
    );

    expect(result).toEqual(mockResult);
    expect(result.verifiedOnChain).toBe(true);
    expect(result.anchor?.status).toBe("confirmed");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/verify/550e8400-e29b-41d4-a716-446655440000"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("throws ApiError on 404 credential not found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: "NOT_FOUND",
          message: "Merchant credential not found",
        },
      }),
    } as unknown as Response);

    await expect(getCredentialVerification("unknown-id")).rejects.toThrow(ApiError);
  });
});

describe("Web API Client — Phase 2 Methods (Task 10, 11, 12)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("runSelfAudit posts scan and returns verdict", async () => {
    const { runSelfAudit } = await import("../lib/api.js");
    const mockVerdict = {
      verdict: "VERIFIED" as const,
      reason: "OK" as const,
      message: "Sticker verified",
      agentOutputs: {},
      degradedCheck: false,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockVerdict }),
    } as unknown as Response);

    const result = await runSelfAudit({
      qrPayload: "upi://pay?pa=store@upi",
      latitude: 12.9716,
      longitude: 77.5946,
      photoBase64: "data:image/jpeg;base64,1234",
    });

    expect(result.verdict).toBe("VERIFIED");
    expect(result.reason).toBe("OK");
  });

  it("getAuditHistory fetches paginated audit list", async () => {
    const { getAuditHistory } = await import("../lib/api.js");
    const mockHistory = {
      items: [],
      pagination: { page: 1, limit: 10, total: 0, hasMore: false },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockHistory }),
    } as unknown as Response);

    const result = await getAuditHistory(1, 10);
    expect(result.items).toEqual([]);
    expect(result.pagination.page).toBe(1);
  });

  it("runCustomerCheck runs public pre-pay check", async () => {
    const { runCustomerCheck } = await import("../lib/api.js");
    const mockCheckResult = {
      verdict: "RECENTLY_REGISTERED" as const,
      reason: "OK" as const,
      message: "Merchant not yet registered with QRaksha",
      agentOutputs: {},
      degradedCheck: false,
      isUnregistered: true,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockCheckResult }),
    } as unknown as Response);

    const result = await runCustomerCheck({
      qrPayload: "upi://pay?pa=unknown@upi",
    });

    expect(result.verdict).toBe("RECENTLY_REGISTERED");
    expect(result.isUnregistered).toBe(true);
  });

  it("addQrToCredential posts additional QR to credential", async () => {
    const { addQrToCredential } = await import("../lib/api.js");
    const mockAddResult = {
      id: "qr-new",
      credentialId: "cred-1",
      qrPayloadHash: "hash123",
      boundLocation: { latitude: 12.9716, longitude: 77.5946, boundRadiusM: 100 },
      inheritedRamp: true,
      initialCleanAuditCount: 2,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: mockAddResult }),
    } as unknown as Response);

    const result = await addQrToCredential("cred-1", {
      qrPayload: "upi://pay?pa=counter2@upi",
      latitude: 12.9716,
      longitude: 77.5946,
      photoBase64: "data:image/jpeg;base64,1234",
    });

    expect(result.id).toBe("qr-new");
    expect(result.inheritedRamp).toBe(true);
    expect(result.initialCleanAuditCount).toBe(2);
  });

  it("fileDispute posts dispute and returns result with WARNING downgrade", async () => {
    const { fileDispute } = await import("../lib/api.js");
    const mockDisputeResult = {
      dispute: {
        id: "disp-999",
        credentialId: "cred-1",
        filedByMerchantId: null,
        status: "open" as const,
        evidenceSummary: "Counter sticker replacement suspected.",
        resolvedByAdminId: null,
        resolutionReason: null,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      },
      targetCredentialId: "cred-1",
      previousTrustTier: "verified" as const,
      newTrustTier: "warning" as const,
      message: "Dispute filed successfully.",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: mockDisputeResult }),
    } as unknown as Response);

    const result = await fileDispute({
      credentialId: "cred-1",
      evidenceSummary: "Counter sticker replacement suspected.",
    });

    expect(result.dispute.id).toBe("disp-999");
    expect(result.targetCredentialId).toBe("cred-1");
    expect(result.newTrustTier).toBe("warning");
  });

  it("getAdminDisputes fetches disputes queue with query parameters", async () => {
    const { getAdminDisputes } = await import("../lib/api.js");
    const mockList = {
      disputes: [
        {
          id: "disp-1",
          credentialId: "cred-1",
          status: "open" as const,
          evidenceSummary: "QR tampering suspected",
          createdAt: new Date().toISOString(),
          targetMerchantName: "Sharma Canteen",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockList }),
    } as unknown as Response);

    const result = await getAdminDisputes({ status: "open" });
    expect(result.disputes.length).toBe(1);
    expect(result.disputes[0].targetMerchantName).toBe("Sharma Canteen");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/admin/disputes?status=open"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("resolveAdminDispute patches resolution with reason", async () => {
    const { resolveAdminDispute } = await import("../lib/api.js");
    const mockResolution = {
      dispute: {
        id: "disp-1",
        credentialId: "cred-1",
        status: "resolved_upheld" as const,
        evidenceSummary: "Tampering reported",
        resolutionReason: "Confirmed tampering",
        createdAt: new Date().toISOString(),
      },
      targetCredentialId: "cred-1",
      newTrustTier: "warning" as const,
      newStatus: "suspended" as const,
      message: "Dispute upheld.",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockResolution }),
    } as unknown as Response);

    const result = await resolveAdminDispute("disp-1", {
      status: "resolved_upheld",
      resolutionReason: "Confirmed tampering",
    });

    expect(result.newStatus).toBe("suspended");
    expect(result.newTrustTier).toBe("warning");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/admin/disputes/disp-1"),
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("getAdminCredentials searches and filters credential registry", async () => {
    const { getAdminCredentials } = await import("../lib/api.js");
    const mockReg = {
      credentials: [
        {
          id: "cred-1",
          merchantId: "merch-1",
          merchantName: "Sharma Canteen",
          status: "active" as const,
          trustTier: "verified" as const,
          trustScore: 96,
          qrCount: 1,
          activatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockReg }),
    } as unknown as Response);

    const result = await getAdminCredentials({ search: "sharma", trustTier: "verified" });
    expect(result.credentials.length).toBe(1);
    expect(result.credentials[0].merchantName).toBe("Sharma Canteen");
  });

  it("seedDemoRegistry triggers demo cohort generation", async () => {
    const { seedDemoRegistry } = await import("../lib/api.js");
    const mockSeed = {
      message:
        "Demo merchant registry seeded successfully with 7 fictional pilot merchants.",
      seededCount: 7,
      merchants: [
        {
          name: "Sharma Canteen",
          credentialId: "cred-1",
          trustTier: "verified" as const,
          status: "active" as const,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockSeed }),
    } as unknown as Response);

    const result = await seedDemoRegistry();
    expect(result.seededCount).toBe(7);
  });

  it("getMyCredentials fetches current merchant credentials", async () => {
    const { getMyCredentials } = await import("../lib/api.js");
    const mockCreds = {
      credentials: [
        {
          id: "cred-1",
          merchant_id: "m-1",
          status: "active",
          trust_tier: "verified",
          trust_score: 95,
          activated_at: "2026-09-01T00:00:00Z",
          created_at: "2026-09-01T00:00:00Z",
        },
      ],
      activeCredential: {
        id: "cred-1",
        merchant_id: "m-1",
        status: "active",
        trust_tier: "verified",
        trust_score: 95,
        activated_at: "2026-09-01T00:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
      },
      qrs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockCreds }),
    } as unknown as Response);

    const result = await getMyCredentials("m-1");
    expect(result.activeCredential?.id).toBe("cred-1");
    expect(result.activeCredential?.trust_score).toBe(95);
  });
});
