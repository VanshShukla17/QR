import {
  RegisterIdentityInput,
  RegisterIdentityResult,
  RegisterReferenceInput,
  RegisterReferenceResult,
  ProofOfPossessionInput,
  ProofOfPossessionResult,
  VerifyCredentialResult,
  FileDisputeResult,
  Dispute,
  AdminDisputeItem,
  AdminDisputesListResult,
  ResolveDisputeResult,
  AdminCredentialItem,
  AdminCredentialsListResult,
  SeedRegistryResult,
  VoiceVerdictInput,
  VoiceVerdictResponse,
  MerchantStatsResult,
  VerdictReason,
} from "@qraksha/shared";
import { getActiveMerchantId } from "./constants";

export type {
  MerchantStatsResult,
  FileDisputeResult,
  Dispute,
  AdminDisputeItem,
  AdminDisputesListResult,
  ResolveDisputeResult,
  AdminCredentialItem,
  AdminCredentialsListResult,
  SeedRegistryResult,
  VoiceVerdictInput,
  VoiceVerdictResponse,
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "http://localhost:4000/api/v1");

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function registerIdentity(
  input: RegisterIdentityInput
): Promise<RegisterIdentityResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/merchants/register/identity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to connect to QRaksha server. Please check your connection and try again.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Registration failed",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status,
      errorPayload?.details
    );
  }

  return json.data as RegisterIdentityResult;
}

export async function registerReference(
  input: RegisterReferenceInput
): Promise<RegisterReferenceResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/merchants/register/reference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to connect to QRaksha server. Please check your connection and try again.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Reference registration failed",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status,
      errorPayload?.details
    );
  }

  return json.data as RegisterReferenceResult;
}

export async function confirmProofOfPossession(
  input: ProofOfPossessionInput
): Promise<ProofOfPossessionResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/merchants/register/proof-of-possession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to connect to QRaksha server. Please check your connection and try again.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Proof-of-possession verification failed",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status,
      errorPayload?.details
    );
  }

  return json.data as ProofOfPossessionResult;
}

export async function getCredentialVerification(
  credentialId: string
): Promise<VerifyCredentialResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/verify/${encodeURIComponent(credentialId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to connect to QRaksha server. Please check your connection and try again.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Credential verification failed",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status,
      errorPayload?.details
    );
  }

  return json.data as VerifyCredentialResult;
}

export interface AuditResult {
  verdict: "VERIFIED" | "RECENTLY_REGISTERED" | "WARNING";
  reason: VerdictReason;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentOutputs: any;
  degradedCheck: boolean;
  credentialId?: string;
  auditRunId?: string;
  isUnregistered?: boolean;
  merchantDisplayName?: string;
}

export interface AuditHistoryItem {
  id: string;
  credential_id: string;
  registered_qr_id: string | null;
  initiated_by: string;
  verdict: "VERIFIED" | "RECENTLY_REGISTERED" | "WARNING";
  verdict_reason: VerdictReason;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent_outputs: any;
  degraded_check: boolean;
  created_at: string;
}

export interface AuditHistoryResponse {
  items: AuditHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export async function runSelfAudit(input: {
  qrPayload: string;
  latitude: number;
  longitude: number;
  photoBase64: string;
}): Promise<AuditResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/audit/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to connect to QRaksha server. Please check your connection and try again.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Audit run failed",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status,
      errorPayload?.details
    );
  }

  return json.data as AuditResult;
}

export async function getAuditHistory(
  page = 1,
  limit = 10,
  credentialId?: string
): Promise<AuditHistoryResponse> {
  let url = `${API_BASE_URL}/audit/history?page=${page}&limit=${limit}`;
  if (credentialId) {
    url += `&credentialId=${encodeURIComponent(credentialId)}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to fetch audit history. Please check your connection.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Failed to load audit history",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data as AuditHistoryResponse;
}

export async function runCustomerCheck(input: {
  qrPayload: string;
  latitude?: number;
  longitude?: number;
  photoBase64?: string;
}): Promise<AuditResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to verify merchant sticker. Please check your network connection.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Check verification failed",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data as AuditResult;
}

export async function getVoiceVerdict(
  input: VoiceVerdictInput
): Promise<VoiceVerdictResponse> {
  const endpoints = [
    `${API_BASE_URL}/voice/verdict`,
    ...(API_BASE_URL.includes("localhost:4000")
      ? []
      : ["http://localhost:4000/api/v1/voice/verdict"]),
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (response.ok) {
        const json = await response.json();
        if (json?.data) {
          return json.data as VoiceVerdictResponse;
        }
      } else {
        const json = await response.json().catch(() => null);
        const errorPayload = json?.error;
        lastError = new ApiError(
          errorPayload?.message || `Voice synthesis failed with HTTP ${response.status}`,
          errorPayload?.code || "VOICE_ERROR",
          response.status
        );
      }
    } catch (networkError) {
      lastError = new ApiError(
        "Unable to fetch voice verdict. Please check your network connection.",
        "NETWORK_ERROR",
        0,
        networkError
      );
    }
  }

  throw lastError || new ApiError("Voice synthesis unavailable", "VOICE_ERROR", 500);
}

export async function addQrToCredential(
  credentialId: string,
  input: {
    qrPayload: string;
    latitude: number;
    longitude: number;
    boundRadiusM?: number;
    photoBase64: string;
  }
): Promise<{
  id: string;
  credentialId: string;
  qrPayloadHash: string;
  boundLocation: {
    latitude: number;
    longitude: number;
    boundRadiusM: number;
  };
  inheritedRamp: boolean;
  initialCleanAuditCount: number;
}> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/credentials/${encodeURIComponent(credentialId)}/qrs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );
  } catch (networkError) {
    throw new ApiError(
      "Unable to register additional QR. Please check your network connection.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Adding QR failed",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status,
      errorPayload?.details
    );
  }

  return json.data;
}

export async function getRegisteredQrs(credentialId: string): Promise<
  Array<{
    id: string;
    qr_payload_hash: string;
    bound_lat: number;
    bound_lng: number;
    bound_radius_m: number;
    created_at: string;
  }>
> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/credentials/${encodeURIComponent(credentialId)}/qrs`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (networkError) {
    throw new ApiError(
      "Unable to load registered QRs.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      "Failed to fetch registered QRs",
      "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data;
}

export async function fileDispute(input: {
  credentialId: string;
  evidenceSummary: string;
}): Promise<FileDisputeResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to submit dispute. Please check your connection and try again.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Failed to file dispute",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status,
      errorPayload?.details
    );
  }

  return json.data as FileDisputeResult;
}

export async function getAdminDisputes(filters?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminDisputesListResult> {
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== "all") query.set("status", filters.status);
  if (filters?.page) query.set("page", filters.page.toString());
  if (filters?.limit) query.set("limit", filters.limit.toString());

  const url = `${API_BASE_URL}/admin/disputes${query.toString() ? `?${query.toString()}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mock-admin-token",
      },
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to fetch admin dispute queue. Please check your network.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Failed to fetch admin disputes",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data as AdminDisputesListResult;
}

export async function resolveAdminDispute(
  disputeId: string,
  input: {
    status: "resolved_upheld" | "resolved_rejected";
    resolutionReason: string;
  }
): Promise<ResolveDisputeResult> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/admin/disputes/${encodeURIComponent(disputeId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-admin-token",
        },
        body: JSON.stringify(input),
      }
    );
  } catch (networkError) {
    throw new ApiError(
      "Unable to submit dispute resolution. Please check your connection.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Failed to resolve dispute",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data as ResolveDisputeResult;
}

export async function getAdminCredentials(filters?: {
  search?: string;
  trustTier?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminCredentialsListResult> {
  const query = new URLSearchParams();
  if (filters?.search) query.set("search", filters.search);
  if (filters?.trustTier && filters.trustTier !== "all")
    query.set("trustTier", filters.trustTier);
  if (filters?.status && filters.status !== "all") query.set("status", filters.status);
  if (filters?.page) query.set("page", filters.page.toString());
  if (filters?.limit) query.set("limit", filters.limit.toString());

  const url = `${API_BASE_URL}/admin/credentials${query.toString() ? `?${query.toString()}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mock-admin-token",
      },
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to fetch credentials registry. Please check your network.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Failed to fetch credential registry",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data as AdminCredentialsListResult;
}

export async function seedDemoRegistry(): Promise<SeedRegistryResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/admin/registry/seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mock-admin-token",
      },
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to trigger demo registry seeding. Please check your network.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Failed to seed demo registry",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data as SeedRegistryResult;
}

export async function getMyCredentials(merchantId?: string): Promise<{
  credentials: Array<{
    id: string;
    merchant_id: string;
    status: string;
    trust_tier: string;
    trust_score: number;
    activated_at: string | null;
    created_at: string;
  }>;
  activeCredential: {
    id: string;
    merchant_id: string;
    status: string;
    trust_tier: string;
    trust_score: number;
    activated_at: string | null;
    created_at: string;
  } | null;
  qrs: Array<{
    id: string;
    qr_payload_hash: string;
    bound_lat: number;
    bound_lng: number;
    bound_radius_m: number;
    created_at: string;
  }>;
}> {
  const url = merchantId
    ? `${API_BASE_URL}/credentials/me?merchantId=${encodeURIComponent(merchantId)}`
    : `${API_BASE_URL}/credentials/me`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to fetch merchant credentials.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Failed to fetch credentials",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data;
}

export async function getMerchantStats(
  merchantId?: string
): Promise<MerchantStatsResult> {
  const activeId = merchantId || getActiveMerchantId();
  const url = `${API_BASE_URL}/merchants/${encodeURIComponent(activeId)}/stats`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch (networkError) {
    throw new ApiError(
      "Unable to fetch merchant statistics.",
      "NETWORK_ERROR",
      0,
      networkError
    );
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = json?.error;
    throw new ApiError(
      errorPayload?.message || "Failed to fetch merchant stats",
      errorPayload?.code || "UNKNOWN_ERROR",
      response.status
    );
  }

  return json.data as MerchantStatsResult;
}
